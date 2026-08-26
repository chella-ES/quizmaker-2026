import { getCloudflareContext } from "@opennextjs/cloudflare";

export class MissingDbBindingError extends Error {
	constructor() {
		super("Cloudflare D1 binding DB is not configured");
		this.name = "MissingDbBindingError";
	}
}

export async function getDb(): Promise<D1Database> {
	const { env } = await getCloudflareContext({ async: true });
	if (!env.DB) {
		throw new MissingDbBindingError();
	}
	return env.DB;
}
