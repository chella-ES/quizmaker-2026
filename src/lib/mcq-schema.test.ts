import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	ATTEMPTS_TABLE_SQL,
	CHOICES_TABLE_SQL,
	QUESTIONS_TABLE_SQL,
} from "@/lib/mcq-schema";

function createTableBody(sql: string, tableName: string): string {
	const match = new RegExp(
		`CREATE TABLE ${tableName}\\s*\\(([\\s\\S]*?)\\)\\s*;`,
		"i",
	).exec(sql);
	if (!match) {
		throw new Error(`CREATE TABLE ${tableName} body not found`);
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

describe("mcq schema", () => {
	it("questions schema defines table questions", () => {
		expect(QUESTIONS_TABLE_SQL).toContain("CREATE TABLE questions");
	});

	it("questions schema requires qid as text primary key", () => {
		expect(QUESTIONS_TABLE_SQL).toContain("qid TEXT PRIMARY KEY");
	});

	it("questions schema requires name and question", () => {
		expect(QUESTIONS_TABLE_SQL).toContain("name TEXT NOT NULL");
		expect(QUESTIONS_TABLE_SQL).toContain("question TEXT NOT NULL");
	});

	it("questions schema includes created_at and updated_at with datetime default", () => {
		expect(QUESTIONS_TABLE_SQL).toContain("created_at TEXT NOT NULL DEFAULT (datetime('now'))");
		expect(QUESTIONS_TABLE_SQL).toContain("updated_at TEXT NOT NULL DEFAULT (datetime('now'))");
	});

	it("choices schema defines table choices", () => {
		expect(CHOICES_TABLE_SQL).toContain("CREATE TABLE choices");
	});

	it("choices schema requires choiceid primary key and qid foreign key", () => {
		expect(CHOICES_TABLE_SQL).toContain("choiceid TEXT PRIMARY KEY");
		expect(CHOICES_TABLE_SQL).toContain(
			"FOREIGN KEY (qid) REFERENCES questions(qid)",
		);
	});

	it("choices schema stores choice_text, is_correct, and position", () => {
		expect(CHOICES_TABLE_SQL).toContain("choice_text TEXT NOT NULL");
		expect(CHOICES_TABLE_SQL).toContain("is_correct INTEGER NOT NULL");
		expect(CHOICES_TABLE_SQL).toContain("position INTEGER NOT NULL");
	});

	it("choices schema cascades delete with the question", () => {
		expect(CHOICES_TABLE_SQL).toContain(
			"FOREIGN KEY (qid) REFERENCES questions(qid) ON DELETE CASCADE",
		);
	});

	it("attempts schema defines table attempts", () => {
		expect(ATTEMPTS_TABLE_SQL).toContain("CREATE TABLE attempts");
	});

	it("attempts schema records qid, userid, choiceid, choice_text, and is_correct", () => {
		expect(ATTEMPTS_TABLE_SQL).toContain("qid TEXT NOT NULL");
		expect(ATTEMPTS_TABLE_SQL).toContain("userid TEXT NOT NULL");
		expect(ATTEMPTS_TABLE_SQL).toContain("choiceid TEXT NOT NULL");
		expect(ATTEMPTS_TABLE_SQL).toContain("choice_text TEXT NOT NULL");
		expect(ATTEMPTS_TABLE_SQL).toContain("is_correct INTEGER NOT NULL");
	});

	it("attempts schema cascades delete with the question", () => {
		expect(ATTEMPTS_TABLE_SQL).toContain(
			"FOREIGN KEY (qid) REFERENCES questions(qid) ON DELETE CASCADE",
		);
	});

	it("migration SQL matches the tested schema contract", () => {
		const migration = migrationSql();
		expect(createTableBody(migration, "questions")).toBe(
			createTableBody(QUESTIONS_TABLE_SQL, "questions"),
		);
		expect(createTableBody(migration, "choices")).toBe(
			createTableBody(CHOICES_TABLE_SQL, "choices"),
		);
		expect(createTableBody(migration, "attempts")).toBe(
			createTableBody(ATTEMPTS_TABLE_SQL, "attempts"),
		);
	});
});
