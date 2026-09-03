import { describe, expect, it } from "vitest";
import {
	createPasswordSalt,
	hashPasswordForStorage,
	hashPasswordForWire,
	passwordsMatch,
} from "@/lib/password";

const PLAINTEXT = "correct-horse";
const OTHER_PLAINTEXT = "correct-horse-1";

describe("password hashing", () => {
	it("hashes the plaintext password to 64-char lowercase hex for the wire", async () => {
		const wireHash = await hashPasswordForWire(PLAINTEXT);
		expect(wireHash).toMatch(/^[0-9a-f]{64}$/);
	});

	it("produces the same wire hash for the same plaintext", async () => {
		const first = await hashPasswordForWire(PLAINTEXT);
		const second = await hashPasswordForWire(PLAINTEXT);
		expect(first).toBe(second);
	});

	it("produces a different wire hash for a different plaintext", async () => {
		const first = await hashPasswordForWire(PLAINTEXT);
		const second = await hashPasswordForWire(OTHER_PLAINTEXT);
		expect(first).not.toBe(second);
	});

	it("rejects an empty plaintext for the wire hash", async () => {
		await expect(hashPasswordForWire("")).rejects.toThrow();
	});

	it("creates a 16-byte salt encoded as 32-char lowercase hex", () => {
		expect(createPasswordSalt()).toMatch(/^[0-9a-f]{32}$/);
	});

	it("creates a different salt on each call", () => {
		expect(createPasswordSalt()).not.toBe(createPasswordSalt());
	});

	it("storage hash is 64-char hex and is not the wire hash", async () => {
		const wireHash = await hashPasswordForWire(PLAINTEXT);
		const salt = createPasswordSalt();
		const stored = await hashPasswordForStorage(wireHash, salt);
		expect(stored).toMatch(/^[0-9a-f]{64}$/);
		expect(stored).not.toBe(wireHash);
	});

	it("same wire hash and same salt produce the same storage hash", async () => {
		const wireHash = await hashPasswordForWire(PLAINTEXT);
		const salt = createPasswordSalt();
		const first = await hashPasswordForStorage(wireHash, salt);
		const second = await hashPasswordForStorage(wireHash, salt);
		expect(first).toBe(second);
	});

	it("passwordsMatch returns true for the matching wire hash and salt", async () => {
		const wireHash = await hashPasswordForWire(PLAINTEXT);
		const salt = createPasswordSalt();
		const stored = await hashPasswordForStorage(wireHash, salt);
		await expect(passwordsMatch(wireHash, salt, stored)).resolves.toBe(true);
	});

	it("passwordsMatch returns false for the wrong wire hash", async () => {
		const wireHash = await hashPasswordForWire(PLAINTEXT);
		const wrongWireHash = await hashPasswordForWire(OTHER_PLAINTEXT);
		const salt = createPasswordSalt();
		const stored = await hashPasswordForStorage(wireHash, salt);
		await expect(passwordsMatch(wrongWireHash, salt, stored)).resolves.toBe(false);
	});

	it("passwordsMatch returns false when the salt differs", async () => {
		const wireHash = await hashPasswordForWire(PLAINTEXT);
		const salt = createPasswordSalt();
		const otherSalt = createPasswordSalt();
		const stored = await hashPasswordForStorage(wireHash, salt);
		await expect(passwordsMatch(wireHash, otherSalt, stored)).resolves.toBe(false);
	});
});
