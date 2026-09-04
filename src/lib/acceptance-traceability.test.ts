import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function assertReadable(relativePath: string) {
	const fullPath = path.resolve(process.cwd(), relativePath);
	expect(existsSync(fullPath), `${relativePath} should exist`).toBe(true);
	const contents = readFileSync(fullPath, "utf8");
	expect(contents.length, `${relativePath} should be readable`).toBeGreaterThan(0);
}

describe("acceptance traceability", () => {
	it("Phase 1 password tests exist", () => {
		assertReadable("src/lib/password.test.ts");
	});

	it("Phase 2 schema and db tests exist", () => {
		assertReadable("src/lib/users-schema.test.ts");
		assertReadable("src/lib/db.test.ts");
	});

	it("Phase 3 user service tests exist", () => {
		assertReadable("src/lib/services/user-service.test.ts");
	});

	it("Phase 4 route tests exist", () => {
		assertReadable("src/app/api/users/register/route.test.ts");
		assertReadable("src/app/api/users/login/route.test.ts");
		assertReadable("src/app/api/users/logout/route.test.ts");
	});

	it("Phase 5 UI tests exist", () => {
		assertReadable("src/components/home/home-links.test.tsx");
		assertReadable("src/components/register/register-form.test.tsx");
	});

	it("Phase 6 UI tests exist", () => {
		assertReadable("src/components/login/login-form.test.tsx");
		assertReadable("src/components/mcq/mcq-stub.test.tsx");
	});

	it("Phase 1 MCQ schema tests exist", () => {
		assertReadable("src/lib/mcq-schema.test.ts");
	});

	it("Phase 2 MCQ service tests exist", () => {
		assertReadable("src/lib/services/mcq-service.test.ts");
	});

	it("Phase 3 MCQ route tests exist", () => {
		assertReadable("src/app/api/mcq/route.test.ts");
		assertReadable("src/app/api/mcq/[qid]/route.test.ts");
		assertReadable("src/app/api/mcq/[qid]/attempts/route.test.ts");
	});

	it("Phase 4 list UI tests exist", () => {
		assertReadable("src/components/mcq/mcq-stub.test.tsx");
	});

	it("Phase 5 form tests exist", () => {
		assertReadable("src/components/mcq/mcq-form.test.tsx");
	});

	it("Phase 6 preview tests exist", () => {
		assertReadable("src/components/mcq/mcq-preview.test.tsx");
	});
});
