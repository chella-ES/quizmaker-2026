import { getCloudflareContext } from "@opennextjs/cloudflare";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb, MissingDbBindingError } from "@/lib/db";

vi.mock("@opennextjs/cloudflare", () => ({
	getCloudflareContext: vi.fn(),
}));

const getCloudflareContextMock = vi.mocked(getCloudflareContext);

describe("getDb", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("getDb returns the D1 binding from Cloudflare context", async () => {
		const mockDb = { prepare: vi.fn() };
		getCloudflareContextMock.mockResolvedValue({
			env: { DB: mockDb },
		} as never);

		await expect(getDb()).resolves.toBe(mockDb);
	});

	it("getDb fails when the DB binding is missing", async () => {
		getCloudflareContextMock.mockResolvedValue({
			env: {},
		} as never);

		await expect(getDb()).rejects.toBeInstanceOf(MissingDbBindingError);
	});
});
