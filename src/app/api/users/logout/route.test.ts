import { describe, expect, it } from "vitest";

function post(body?: unknown) {
	return new Request("http://localhost/api/users/logout", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

describe("POST /api/users/logout", () => {
	it("logout returns 200 { ok: true }", async () => {
		const { POST } = await import("./route");
		const response = await POST(post());
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ ok: true });
	});

	it("logout does not require a session token", async () => {
		const { POST } = await import("./route");
		const response = await POST(post({}));
		expect(response.status).toBe(200);
		expect(response.status).not.toBe(401);
		expect(response.headers.get("set-cookie")).toBeNull();
		await expect(response.json()).resolves.toEqual({ ok: true });
	});
});
