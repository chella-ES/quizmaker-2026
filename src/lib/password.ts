const SHA256_HEX_LENGTH = 64;
const SALT_BYTES = 16;
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_BITS = 256;

export { PBKDF2_ITERATIONS };

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

function timingSafeEqualHex(left: string, right: string): boolean {
	if (left.length !== right.length) {
		return false;
	}
	const leftBytes = hexToBytes(left);
	const rightBytes = hexToBytes(right);
	let diff = 0;
	for (let i = 0; i < leftBytes.length; i++) {
		diff |= leftBytes[i] ^ rightBytes[i];
	}
	return diff === 0;
}

export async function hashPasswordForWire(plaintext: string): Promise<string> {
	if (plaintext === "") {
		throw new Error("Password must not be empty");
	}
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(plaintext),
	);
	return bytesToHex(new Uint8Array(digest));
}

export function createPasswordSalt(): string {
	return bytesToHex(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
}

export async function hashPasswordForStorage(
	wireHash: string,
	saltHex: string,
): Promise<string> {
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(wireHash),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	const derived = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: hexToBytes(saltHex) as BufferSource,
			iterations: PBKDF2_ITERATIONS,
			hash: "SHA-256",
		},
		keyMaterial,
		PBKDF2_BITS,
	);
	const stored = bytesToHex(new Uint8Array(derived));
	if (stored.length !== SHA256_HEX_LENGTH) {
		throw new Error("Unexpected storage hash length");
	}
	return stored;
}

export async function passwordsMatch(
	wireHash: string,
	saltHex: string,
	storedHash: string,
): Promise<boolean> {
	const candidate = await hashPasswordForStorage(wireHash, saltHex);
	return timingSafeEqualHex(candidate, storedHash);
}
