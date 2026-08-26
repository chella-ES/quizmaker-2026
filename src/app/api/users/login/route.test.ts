import { verifyCredentials } from "@/lib/services/user-service";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/user-service", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/services/user-service")>();
	return {
		...actual,
		verifyCredentials: vi.fn(),
	};
});

const verifyCredentialsMock = vi.mocked(verifyCredentials);

const publicUser = {
	userid: "550e8400-e29b-41d4-a716-446655440000",
	username: "teacher@school.edu",
	firstName: "Ada",
	lastName: "Lovelace",
};

const validBody = {
	username: "teacher@school.edu",
	password: "a".repeat(64),
};

function postJson(body: unknown) {
	return new Request("http://localhost/api/users/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/users/login", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		verifyCredentialsMock.mockResolvedValue(publicUser);
	});

	it("login returns 200 and the public profile", async () => {
		const { POST } = await import("./route");
		const response = await POST(postJson(validBody));
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(publicUser);
	});

	it("login does not include password fields", async () => {
		const { POST } = await import("./route");
		const response = await POST(postJson(validBody));
		const json = await response.json();
		expect(json).not.toHaveProperty("password");
		expect(json).not.toHaveProperty("password_salt");
	});

	it("login returns 401 with a generic message when credentials are wrong", async () => {
		verifyCredentialsMock.mockResolvedValue(null);
		const { POST } = await import("./route");
		const response = await POST(postJson(validBody));
		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({
			error: "Invalid username or password.",
		});
	});

	it("login returns 401 with the same message when the user is unknown", async () => {
		verifyCredentialsMock.mockResolvedValue(null);
		const { POST } = await import("./route");
		const response = await POST(
			postJson({ username: "missing@school.edu", password: validBody.password }),
		);
		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({
			error: "Invalid username or password.",
		});
	});

	it("login returns 400 for invalid username or password hash shape", async () => {
		const { POST } = await import("./route");
		const badUsername = await POST(
			postJson({ username: "not-an-email", password: validBody.password }),
		);
		expect(badUsername.status).toBe(400);
		const badUsernameJson = await badUsername.json();
		expect(badUsernameJson.error).toBe("Validation failed");
		expect(badUsernameJson.details).toEqual(
			expect.arrayContaining([expect.objectContaining({ path: "username" })]),
		);

		const badPassword = await POST(
			postJson({ username: validBody.username, password: "secret12" }),
		);
		expect(badPassword.status).toBe(400);
		const badPasswordJson = await badPassword.json();
		expect(badPasswordJson.details).toEqual(
			expect.arrayContaining([expect.objectContaining({ path: "password" })]),
		);
		expect(verifyCredentialsMock).not.toHaveBeenCalled();
	});

	it("login returns 500 with a generic message on unexpected throw", async () => {
		verifyCredentialsMock.mockRejectedValue(new Error("D1 down"));
		const { POST } = await import("./route");
		const response = await POST(postJson(validBody));
		expect(response.status).toBe(500);
		await expect(response.json()).resolves.toEqual({
			error: "Unable to log in.",
		});
	});
});
