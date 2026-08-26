import { createUser, UsernameConflictError } from "@/lib/services/user-service";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/user-service", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/services/user-service")>();
	return {
		...actual,
		createUser: vi.fn(),
	};
});

const createUserMock = vi.mocked(createUser);

const publicUser = {
	userid: "550e8400-e29b-41d4-a716-446655440000",
	username: "teacher@school.edu",
	firstName: "Ada",
	lastName: "Lovelace",
};

const validBody = {
	username: "teacher@school.edu",
	firstName: "Ada",
	lastName: "Lovelace",
	password: "a".repeat(64),
};

function postJson(body: unknown) {
	return new Request("http://localhost/api/users/register", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/users/register", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createUserMock.mockResolvedValue(publicUser);
	});

	it("register returns 201 and the public profile", async () => {
		const { POST } = await import("./route");
		const response = await POST(postJson(validBody));
		expect(response.status).toBe(201);
		await expect(response.json()).resolves.toEqual(publicUser);
	});

	it("register does not include password fields in the body", async () => {
		const { POST } = await import("./route");
		const response = await POST(postJson(validBody));
		const json = await response.json();
		expect(json).not.toHaveProperty("password");
		expect(json).not.toHaveProperty("password_salt");
	});

	it("register returns 400 when username is not an email", async () => {
		const { POST } = await import("./route");
		const response = await POST(
			postJson({ ...validBody, username: "not-an-email" }),
		);
		expect(response.status).toBe(400);
		const json = await response.json();
		expect(json.error).toBe("Validation failed");
		expect(json.details).toEqual(
			expect.arrayContaining([expect.objectContaining({ path: "username" })]),
		);
		expect(createUserMock).not.toHaveBeenCalled();
	});

	it("register returns 400 when password is not 64-char hex", async () => {
		const { POST } = await import("./route");
		const response = await POST(postJson({ ...validBody, password: "secret12" }));
		expect(response.status).toBe(400);
		const json = await response.json();
		expect(json.error).toBe("Validation failed");
		expect(json.details).toEqual(
			expect.arrayContaining([expect.objectContaining({ path: "password" })]),
		);
		expect(createUserMock).not.toHaveBeenCalled();
	});

	it("register returns 400 when first or last name is empty", async () => {
		const { POST } = await import("./route");
		const first = await POST(postJson({ ...validBody, firstName: "  " }));
		expect(first.status).toBe(400);
		const firstJson = await first.json();
		expect(firstJson.error).toBe("Validation failed");
		expect(firstJson.details).toEqual(
			expect.arrayContaining([expect.objectContaining({ path: "firstName" })]),
		);

		const last = await POST(postJson({ ...validBody, lastName: "" }));
		expect(last.status).toBe(400);
		const lastJson = await last.json();
		expect(lastJson.details).toEqual(
			expect.arrayContaining([expect.objectContaining({ path: "lastName" })]),
		);
		expect(createUserMock).not.toHaveBeenCalled();
	});

	it("register returns 409 when the service reports a username conflict", async () => {
		createUserMock.mockRejectedValue(new UsernameConflictError());
		const { POST } = await import("./route");
		const response = await POST(postJson(validBody));
		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toEqual({
			error: "An account with this username already exists.",
		});
	});

	it("register returns 500 when the service throws unexpectedly", async () => {
		createUserMock.mockRejectedValue(new Error("UNIQUE constraint failed: users.username"));
		const { POST } = await import("./route");
		const response = await POST(postJson(validBody));
		expect(response.status).toBe(500);
		const json = await response.json();
		expect(json).toEqual({ error: "Unable to register user." });
		expect(JSON.stringify(json)).not.toMatch(/UNIQUE constraint/i);
	});
});
