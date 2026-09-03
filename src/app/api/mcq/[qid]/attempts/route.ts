import { McqValidationError, recordAttempt } from "@/lib/services/mcq-service";
import { NextResponse } from "next/server";
import { z } from "zod";

const attemptBodySchema = z.object({
	userid: z.string().trim().min(1),
	choiceid: z.string().trim().min(1),
});

type RouteContext = { params: Promise<{ qid: string }> };

function notFound() {
	return NextResponse.json({ error: "Question not found." }, { status: 404 });
}

function validationError(details: { path: string; message: string }[]) {
	return NextResponse.json(
		{ error: "Validation failed", details },
		{ status: 400 },
	);
}

export async function POST(request: Request, context: RouteContext) {
	try {
		const { qid } = await context.params;
		let json: unknown;
		try {
			json = await request.json();
		} catch {
			return validationError([{ path: "", message: "Invalid JSON" }]);
		}

		const parsed = attemptBodySchema.safeParse(json);
		if (!parsed.success) {
			return validationError(
				parsed.error.issues.map((issue) => ({
					path: issue.path.join("."),
					message: issue.message,
				})),
			);
		}

		const attempt = await recordAttempt(qid, parsed.data);
		if (!attempt) {
			return notFound();
		}
		return NextResponse.json(attempt, { status: 201 });
	} catch (error) {
		if (error instanceof McqValidationError) {
			return validationError(error.issues);
		}
		return NextResponse.json(
			{ error: "Unable to record attempt." },
			{ status: 500 },
		);
	}
}
