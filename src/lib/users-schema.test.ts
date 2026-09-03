import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { USERS_TABLE_SQL } from "@/lib/users-schema";

function createTableBody(sql: string): string {
	const match = /CREATE TABLE users\s*\(([\s\S]*?)\)\s*;/i.exec(sql);
	if (!match) {
		throw new Error("CREATE TABLE users body not found");
	}
	return match[1].replace(/\s+/g, " ").trim();
}

function migrationSql(): string {
	const migrationsDir = join(process.cwd(), "migrations");
	const files = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql"));
	return files
		.map((name) => readFileSync(join(migrationsDir, name), "utf8"))
		.join("\n");
}

describe("users schema", () => {
	it("users schema defines table users", () => {
		expect(USERS_TABLE_SQL).toContain("CREATE TABLE users");
	});

	it("users schema requires userid as primary key", () => {
		expect(USERS_TABLE_SQL).toContain("userid TEXT PRIMARY KEY");
	});

	it("users schema requires unique username", () => {
		expect(USERS_TABLE_SQL).toContain("username TEXT NOT NULL UNIQUE");
	});

	it("users schema requires first_name and last_name", () => {
		expect(USERS_TABLE_SQL).toContain("first_name TEXT NOT NULL");
		expect(USERS_TABLE_SQL).toContain("last_name TEXT NOT NULL");
	});

	it("users schema stores password and password_salt as NOT NULL", () => {
		expect(USERS_TABLE_SQL).toContain("password TEXT NOT NULL");
		expect(USERS_TABLE_SQL).toContain("password_salt TEXT NOT NULL");
	});

	it("users schema includes created_at and updated_at", () => {
		expect(USERS_TABLE_SQL).toContain("created_at");
		expect(USERS_TABLE_SQL).toContain("updated_at");
	});

	it("migration SQL matches the tested schema contract", () => {
		expect(createTableBody(migrationSql())).toBe(createTableBody(USERS_TABLE_SQL));
	});
});
