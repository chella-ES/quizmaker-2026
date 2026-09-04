import {
	deleteQuestion,
	getQuestionById,
	McqValidationError,
	updateQuestion,
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

export async function GET(_request: Request, context: RouteContext) {
	try {
		const { qid } = await context.params;
		const question = await getQuestionById(qid);
		if (!question) {
			return notFound();
		}
		return NextResponse.json(question);
	} catch {
		return NextResponse.json(
			{ error: "Unable to load question." },
			{ status: 500 },
		);
	}
}

export async function PUT(request: Request, context: RouteContext) {
	try {
		const { qid } = await context.params;
		const body = await readJson(request);
		if (!body.ok) {
			return body.response;
		}

		const parsed = questionBodySchema.safeParse(body.json);
		if (!parsed.success) {
			return fromZod(parsed.error);
		}

		const updated = await updateQuestion(qid, parsed.data);
		if (!updated) {
			return notFound();
		}
		return NextResponse.json(updated);
	} catch (error) {
		if (error instanceof McqValidationError) {
			return validationError(error.issues);
		}
		return NextResponse.json(
			{ error: "Unable to update question." },
			{ status: 500 },
		);
	}
}

export async function DELETE(_request: Request, context: RouteContext) {
	try {
		const { qid } = await context.params;
		const existing = await getQuestionById(qid);
		if (!existing) {
			return notFound();
		}
		await deleteQuestion(qid);
		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json(
			{ error: "Unable to delete question." },
			{ status: 500 },
		);
	}
}
