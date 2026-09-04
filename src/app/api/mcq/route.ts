import {
	createQuestion,
	listQuestions,
	McqValidationError,
} from "@/lib/services/mcq-service";
import { NextResponse } from "next/server";
import { z } from "zod";

const choiceBodySchema = z.object({
	choiceText: z.string().trim().min(1).max(500),
	isCorrect: z.boolean(),
});

const questionBodySchema = z
	.object({
		name: z.string().trim().min(1).max(200),
		question: z.string().trim().min(1).max(5000),
		choices: z.array(choiceBodySchema).min(2).max(6),
	})
	.refine(
		(value) => value.choices.filter((choice) => choice.isCorrect).length === 1,
		{
			message: "Exactly one choice must be marked correct",
			path: ["choices"],
		},
	);

function validationError(
	details: { path: string; message: string }[],
) {
	return NextResponse.json(
		{ error: "Validation failed", details },
		{ status: 400 },
	);
}

function fromZod(error: z.ZodError) {
	return validationError(
		error.issues.map((issue) => ({
			path: issue.path.join("."),
			message: issue.message,
		})),
	);
}

async function readJson(request: Request): Promise<
	{ ok: true; json: unknown } | { ok: false; response: NextResponse }
> {
	try {
		return { ok: true, json: await request.json() };
	} catch {
		return {
			ok: false,
			response: validationError([{ path: "", message: "Invalid JSON" }]),
		};
	}
}

export async function GET() {
	try {
		const questions = await listQuestions();
		return NextResponse.json({ questions });
	} catch {
		return NextResponse.json(
			{ error: "Unable to list questions." },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	try {
		const body = await readJson(request);
		if (!body.ok) {
			return body.response;
		}

		const parsed = questionBodySchema.safeParse(body.json);
		if (!parsed.success) {
			return fromZod(parsed.error);
		}

		const created = await createQuestion(parsed.data);
		return NextResponse.json(created, { status: 201 });
	} catch (error) {
		if (error instanceof McqValidationError) {
			return validationError(error.issues);
		}
		return NextResponse.json(
			{ error: "Unable to create question." },
			{ status: 500 },
		);
	}
}
