import { createUser, UsernameConflictError } from "@/lib/services/user-service";
import { NextResponse } from "next/server";
import { z } from "zod";

const registerBodySchema = z.object({
	username: z.string().trim().email(),
	firstName: z.string().trim().min(1).max(100),
	lastName: z.string().trim().min(1).max(100),
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

		const parsed = registerBodySchema.safeParse(json);
		if (!parsed.success) {
			return validationError(parsed.error);
		}

		const user = await createUser(parsed.data);
		return NextResponse.json(user, { status: 201 });
	} catch (error) {
		if (error instanceof UsernameConflictError) {
			return NextResponse.json({ error: error.message }, { status: 409 });
		}
		return NextResponse.json(
			{ error: "Unable to register user." },
			{ status: 500 },
		);
	}
}
