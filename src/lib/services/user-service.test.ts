import { getDb } from "@/lib/db";
import {
	createUser,
	deleteUser,
	getUserById,
	getUserByUsername,
	updateUser,
	UsernameConflictError,
	verifyCredentials,
} from "@/lib/services/user-service";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
	getDb: vi.fn(),
}));

type StoredUser = {
	userid: string;
	username: string;
	first_name: string;
	last_name: string;
	password: string;
	password_salt: string;
};

const WIRE_HASH = "a".repeat(64);
const OTHER_WIRE_HASH = "b".repeat(64);
const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getDbMock = vi.mocked(getDb);

function createFakeD1(store: Map<string, StoredUser>, preparedSql: string[]) {
	function select(sql: string, params: unknown[]): StoredUser[] {
		if (/WHERE userid = \?1/i.test(sql)) {
			const row = store.get(String(params[0]));
			return row ? [row] : [];
		}
		if (/WHERE username = \?1/i.test(sql)) {
			const username = String(params[0]);
			return [...store.values()].filter((row) => row.username === username);
		}
		return [];
	}

	function run(sql: string, params: unknown[]): { meta: { changes: number } } {
		if (/INSERT INTO users/i.test(sql)) {
			const username = String(params[1]);
			if ([...store.values()].some((row) => row.username === username)) {
				throw new Error("UNIQUE constraint failed: users.username");
			}
			const row: StoredUser = {
				userid: String(params[0]),
				username,
				first_name: String(params[2]),
				last_name: String(params[3]),
				password: String(params[4]),
				password_salt: String(params[5]),
			};
			store.set(row.userid, row);
			return { meta: { changes: 1 } };
		}

		if (/UPDATE users/i.test(sql)) {
			const userid = String(params[params.length - 1]);
			const existing = store.get(userid);
			if (!existing) {
				return { meta: { changes: 0 } };
			}
			existing.first_name = String(params[0]);
			existing.last_name = String(params[1]);
			if (params.length >= 5) {
				existing.password = String(params[2]);
				existing.password_salt = String(params[3]);
			}
			store.set(userid, existing);
			return { meta: { changes: 1 } };
		}

		if (/DELETE FROM users/i.test(sql)) {
			const userid = String(params[0]);
			const existed = store.delete(userid);
			return { meta: { changes: existed ? 1 : 0 } };
		}

		return { meta: { changes: 0 } };
	}

	return {
		prepare(sql: string) {
			preparedSql.push(sql);
			return {
				bind(...params: unknown[]) {
					return {
						run: async () => run(sql, params),
						all: async () => ({ results: select(sql, params) }),
					};
				},
			};
		},
	};
}

describe("user service", () => {
	const store = new Map<string, StoredUser>();
	const preparedSql: string[] = [];

	beforeEach(() => {
		vi.clearAllMocks();
		store.clear();
		preparedSql.length = 0;
		getDbMock.mockResolvedValue(
			createFakeD1(store, preparedSql) as unknown as D1Database,
		);
	});

	it("createUser returns a public user with a generated userid", async () => {
		const created = await createUser({
			username: "ada@school.edu",
			firstName: "Ada",
			lastName: "Lovelace",
			password: WIRE_HASH,
		});
		expect(created.userid).toMatch(UUID_PATTERN);
	});

	it("createUser persists username, first name, and last name", async () => {
		await createUser({
			username: "  Ada@School.EDU ",
			firstName: "Ada",
			lastName: "Lovelace",
			password: WIRE_HASH,
		});
		const found = await getUserByUsername("ada@school.edu");
		expect(found?.username).toBe("ada@school.edu");
		expect(found?.firstName).toBe("Ada");
		expect(found?.lastName).toBe("Lovelace");
	});

	it("createUser does not return password or password_salt", async () => {
		const created = await createUser({
			username: "ada@school.edu",
			firstName: "Ada",
			lastName: "Lovelace",
			password: WIRE_HASH,
		});
		expect(created).not.toHaveProperty("password");
		expect(created).not.toHaveProperty("password_salt");
	});

	it("createUser stores a hash different from the wire password", async () => {
		const created = await createUser({
			username: "ada@school.edu",
			firstName: "Ada",
			lastName: "Lovelace",
			password: WIRE_HASH,
		});
		const stored = store.get(created.userid);
		expect(stored?.password).not.toBe(WIRE_HASH);
		expect(stored?.password_salt).toMatch(/^[0-9a-f]{32}$/);
	});

	it("createUser rejects a duplicate username", async () => {
		const input = {
			username: "ada@school.edu",
			firstName: "Ada",
			lastName: "Lovelace",
			password: WIRE_HASH,
		};
		await createUser(input);
		await expect(createUser(input)).rejects.toBeInstanceOf(UsernameConflictError);
	});

	it("getUserById returns null when missing", async () => {
		await expect(getUserById("no-such-id")).resolves.toBeNull();
	});

	it("getUserByUsername returns null when missing", async () => {
		await expect(getUserByUsername("missing@school.edu")).resolves.toBeNull();
	});

	it("updateUser changes first and last name", async () => {
		const created = await createUser({
			username: "ada@school.edu",
			firstName: "Ada",
			lastName: "Lovelace",
			password: WIRE_HASH,
		});
		await updateUser(created.userid, { firstName: "Grace", lastName: "Hopper" });
		const found = await getUserById(created.userid);
		expect(found?.firstName).toBe("Grace");
		expect(found?.lastName).toBe("Hopper");
	});

	it("updateUser re-hashes when a new wire password is provided", async () => {
		const created = await createUser({
			username: "ada@school.edu",
			firstName: "Ada",
			lastName: "Lovelace",
			password: WIRE_HASH,
		});
		const before = store.get(created.userid)?.password;
		await updateUser(created.userid, { password: OTHER_WIRE_HASH });
		const after = store.get(created.userid);
		expect(after?.password).not.toBe(before);
		expect(after?.password).not.toBe(OTHER_WIRE_HASH);
	});

	it("updateUser returns null or a typed not-found when id is missing", async () => {
		await expect(
			updateUser("no-such-id", { firstName: "Grace" }),
		).resolves.toBeNull();
	});

	it("deleteUser removes the row", async () => {
		const created = await createUser({
			username: "ada@school.edu",
			firstName: "Ada",
			lastName: "Lovelace",
			password: WIRE_HASH,
		});
		await deleteUser(created.userid);
		await expect(getUserById(created.userid)).resolves.toBeNull();
	});

	it("deleteUser is safe when id is missing", async () => {
		await expect(deleteUser("no-such-id")).resolves.toBeUndefined();
	});

	it("verifyCredentials returns the public user for the correct wire hash", async () => {
		const created = await createUser({
			username: "ada@school.edu",
			firstName: "Ada",
			lastName: "Lovelace",
			password: WIRE_HASH,
		});
		const verified = await verifyCredentials("ada@school.edu", WIRE_HASH);
		expect(verified).toMatchObject({
			userid: created.userid,
			username: "ada@school.edu",
			firstName: "Ada",
			lastName: "Lovelace",
		});
		expect(verified).not.toHaveProperty("password");
		expect(verified).not.toHaveProperty("password_salt");
	});

	it("verifyCredentials returns null for the wrong wire hash", async () => {
		await createUser({
			username: "ada@school.edu",
			firstName: "Ada",
			lastName: "Lovelace",
			password: WIRE_HASH,
		});
		await expect(
			verifyCredentials("ada@school.edu", OTHER_WIRE_HASH),
		).resolves.toBeNull();
	});

	it("verifyCredentials returns null for an unknown username", async () => {
		await expect(
			verifyCredentials("missing@school.edu", WIRE_HASH),
		).resolves.toBeNull();
	});

	it("queries use numbered placeholders", async () => {
		const created = await createUser({
			username: "ada@school.edu",
			firstName: "Ada",
			lastName: "Lovelace",
			password: WIRE_HASH,
		});
		await getUserById(created.userid);
		await getUserByUsername("ada@school.edu");
		await updateUser(created.userid, { firstName: "Grace", password: OTHER_WIRE_HASH });
		await verifyCredentials("ada@school.edu", OTHER_WIRE_HASH);
		await deleteUser(created.userid);

		expect(preparedSql.length).toBeGreaterThan(0);
		for (const sql of preparedSql) {
			expect(sql).toContain("?1");
			expect(sql).not.toContain("ada@school.edu");
			expect(sql).not.toContain(WIRE_HASH);
			expect(sql).not.toContain(OTHER_WIRE_HASH);
		}
	});
});
