import { verifyCredentials } from "@/lib/services/user-service";
import { NextResponse } from "next/server";
import { z } from "zod";

const loginBodySchema = z.object({
	username: z.string().trim().email(),
	password: z.string().regex(/^[0-9a-f]{64}$/),
});

function validationError(error: z.ZodError) {
	return NextResponse.json(
		{
			error: "Validation failed",
			details: error.issues.map((issue) => ({
				path: issue.path.join("."),
				message: issue.message,
			})),
		},
		{ status: 400 },
	);
}

export async function POST(request: Request) {
	try {
		let json: unknown;
		try {
			json = await request.json();
		} catch {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: [{ path: "", message: "Invalid JSON" }],
				},
				{ status: 400 },
			);
		}

		const parsed = loginBodySchema.safeParse(json);
		if (!parsed.success) {
			return validationError(parsed.error);
		}

		const user = await verifyCredentials(parsed.data.username, parsed.data.password);
		if (!user) {
			return NextResponse.json(
				{ error: "Invalid username or password." },
				{ status: 401 },
			);
		}

		return NextResponse.json(user);
	} catch {
		return NextResponse.json({ error: "Unable to log in." }, { status: 500 });
	}
}
