import { getDb } from "@/lib/db";
import {
	createPasswordSalt,
	hashPasswordForStorage,
	passwordsMatch,
} from "@/lib/password";
import { z } from "zod";

const wirePasswordSchema = z
	.string()
	.regex(/^[0-9a-f]{64}$/, "Password must be a 64-character hex hash");

const createUserSchema = z.object({
	username: z.string().trim().email().transform((value) => value.toLowerCase()),
	firstName: z.string().trim().min(1).max(100),
	lastName: z.string().trim().min(1).max(100),
	password: wirePasswordSchema,
});

const updateUserSchema = z.object({
	firstName: z.string().trim().min(1).max(100).optional(),
	lastName: z.string().trim().min(1).max(100).optional(),
	password: wirePasswordSchema.optional(),
});

export type PublicUser = {
	userid: string;
	username: string;
	firstName: string;
	lastName: string;
};

type UserRow = {
	userid: string;
	username: string;
	first_name: string;
	last_name: string;
	password: string;
	password_salt: string;
};

export class UsernameConflictError extends Error {
	constructor() {
		super("An account with this username already exists.");
		this.name = "UsernameConflictError";
	}
}

function toPublicUser(row: UserRow): PublicUser {
	return {
		userid: row.userid,
		username: row.username,
		firstName: row.first_name,
		lastName: row.last_name,
	};
}

function isUniqueConstraintError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /UNIQUE constraint failed/i.test(message);
}

async function selectUserById(userid: string): Promise<UserRow | null> {
	const db = await getDb();
	const { results } = await db
		.prepare(
			`SELECT userid, username, first_name, last_name, password, password_salt
       FROM users WHERE userid = ?1`,
		)
		.bind(userid)
		.all<UserRow>();
	return results[0] ?? null;
}

async function selectUserByUsername(username: string): Promise<UserRow | null> {
	const db = await getDb();
	const { results } = await db
		.prepare(
			`SELECT userid, username, first_name, last_name, password, password_salt
       FROM users WHERE username = ?1`,
		)
		.bind(username)
		.all<UserRow>();
	return results[0] ?? null;
}

export async function createUser(input: {
	username: string;
	firstName: string;
	lastName: string;
	password: string;
}): Promise<PublicUser> {
	const parsed = createUserSchema.parse(input);
	const userid = crypto.randomUUID();
	const passwordSalt = createPasswordSalt();
	const passwordHash = await hashPasswordForStorage(parsed.password, passwordSalt);
	const db = await getDb();

	try {
		await db
			.prepare(
				`INSERT INTO users (userid, username, first_name, last_name, password, password_salt)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
			)
			.bind(
				userid,
				parsed.username,
				parsed.firstName,
				parsed.lastName,
				passwordHash,
				passwordSalt,
			)
			.run();
	} catch (error) {
		if (isUniqueConstraintError(error)) {
			throw new UsernameConflictError();
		}
		throw error;
	}

	return {
		userid,
		username: parsed.username,
		firstName: parsed.firstName,
		lastName: parsed.lastName,
	};
}

export async function getUserById(userid: string): Promise<PublicUser | null> {
	const row = await selectUserById(userid);
	return row ? toPublicUser(row) : null;
}

export async function getUserByUsername(
	username: string,
): Promise<PublicUser | null> {
	const normalized = username.trim().toLowerCase();
	const row = await selectUserByUsername(normalized);
	return row ? toPublicUser(row) : null;
}

export async function updateUser(
	userid: string,
	patch: { firstName?: string; lastName?: string; password?: string },
): Promise<PublicUser | null> {
	const parsed = updateUserSchema.parse(patch);
	const existing = await selectUserById(userid);
	if (!existing) {
		return null;
	}

	const firstName = parsed.firstName ?? existing.first_name;
	const lastName = parsed.lastName ?? existing.last_name;
	const db = await getDb();

	if (parsed.password) {
		const passwordSalt = createPasswordSalt();
		const passwordHash = await hashPasswordForStorage(parsed.password, passwordSalt);
		await db
			.prepare(
				`UPDATE users
         SET first_name = ?1, last_name = ?2, password = ?3, password_salt = ?4, updated_at = datetime('now')
         WHERE userid = ?5`,
			)
			.bind(firstName, lastName, passwordHash, passwordSalt, userid)
			.run();
	} else {
		await db
			.prepare(
				`UPDATE users
         SET first_name = ?1, last_name = ?2, updated_at = datetime('now')
         WHERE userid = ?3`,
			)
			.bind(firstName, lastName, userid)
			.run();
	}

	const updated = await selectUserById(userid);
	return updated ? toPublicUser(updated) : null;
}

export async function deleteUser(userid: string): Promise<void> {
	const db = await getDb();
	await db.prepare(`DELETE FROM users WHERE userid = ?1`).bind(userid).run();
}

export async function verifyCredentials(
	username: string,
	wireHash: string,
): Promise<PublicUser | null> {
	const normalized = username.trim().toLowerCase();
	if (!wirePasswordSchema.safeParse(wireHash).success) {
		return null;
	}
	const row = await selectUserByUsername(normalized);
	if (!row) {
		return null;
	}
	const matches = await passwordsMatch(wireHash, row.password_salt, row.password);
	return matches ? toPublicUser(row) : null;
}
