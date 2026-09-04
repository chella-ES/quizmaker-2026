import { getDb } from "@/lib/db";
import { z } from "zod";

const choiceInputSchema = z.object({
	choiceText: z.string().trim().min(1).max(500),
	isCorrect: z.boolean(),
});

const questionInputSchema = z
	.object({
		name: z.string().trim().min(1).max(200),
		question: z.string().trim().min(1).max(5000),
		choices: z.array(choiceInputSchema).min(2).max(6),
	})
	.refine(
		(value) => value.choices.filter((choice) => choice.isCorrect).length === 1,
		{
			message: "Exactly one choice must be marked correct",
			path: ["choices"],
		},
	);

const attemptInputSchema = z.object({
	userid: z.string().trim().min(1),
	choiceid: z.string().trim().min(1),
});

export type McqChoice = {
	choiceid: string;
	choiceText: string;
	isCorrect: boolean;
	position: number;
};

export type McqQuestion = {
	qid: string;
	name: string;
	question: string;
	createdAt: string;
	updatedAt: string;
	choices: McqChoice[];
};

export type McqQuestionSummary = {
	qid: string;
	name: string;
	question: string;
	createdAt: string;
	updatedAt: string;
};

export type McqAttempt = {
	attemptid: string;
	qid: string;
	userid: string;
	choiceid: string;
	choiceText: string;
	isCorrect: boolean;
	createdAt: string;
};

type QuestionRow = {
	qid: string;
	name: string;
	question: string;
	created_at: string;
	updated_at: string;
};

type ChoiceRow = {
	choiceid: string;
	qid: string;
	choice_text: string;
	is_correct: number;
	position: number;
};

type AttemptRow = {
	attemptid: string;
	qid: string;
	userid: string;
	choiceid: string;
	choice_text: string;
	is_correct: number;
	created_at: string;
};

export class McqValidationError extends Error {
	issues: { path: string; message: string }[];

	constructor(
		message = "Validation failed",
		issues: { path: string; message: string }[] = [],
	) {
		super(message);
		this.name = "McqValidationError";
		this.issues = issues;
	}
}

function fromZodError(error: z.ZodError): McqValidationError {
	return new McqValidationError(
		"Validation failed",
		error.issues.map((issue) => ({
			path: issue.path.join("."),
			message: issue.message,
		})),
	);
}

function parseQuestionInput(input: unknown) {
	const parsed = questionInputSchema.safeParse(input);
	if (!parsed.success) {
		throw fromZodError(parsed.error);
	}
	return parsed.data;
}

function parseAttemptInput(input: unknown) {
	const parsed = attemptInputSchema.safeParse(input);
	if (!parsed.success) {
		throw fromZodError(parsed.error);
	}
	return parsed.data;
}

function toChoice(row: ChoiceRow): McqChoice {
	return {
		choiceid: row.choiceid,
		choiceText: row.choice_text,
		isCorrect: row.is_correct === 1,
		position: row.position,
	};
}

function toSummary(row: QuestionRow): McqQuestionSummary {
	return {
		qid: row.qid,
		name: row.name,
		question: row.question,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function toAttempt(row: AttemptRow): McqAttempt {
	return {
		attemptid: row.attemptid,
		qid: row.qid,
		userid: row.userid,
		choiceid: row.choiceid,
		choiceText: row.choice_text,
		isCorrect: row.is_correct === 1,
		createdAt: row.created_at,
	};
}

async function selectQuestionRow(qid: string): Promise<QuestionRow | null> {
	const db = await getDb();
	const { results } = await db
		.prepare(
			`SELECT qid, name, question, created_at, updated_at
       FROM questions WHERE qid = ?1`,
		)
		.bind(qid)
		.all<QuestionRow>();
	return results[0] ?? null;
}

async function selectChoiceRows(qid: string): Promise<ChoiceRow[]> {
	const db = await getDb();
	const { results } = await db
		.prepare(
			`SELECT choiceid, qid, choice_text, is_correct, position
       FROM choices WHERE qid = ?1 ORDER BY position ASC`,
		)
		.bind(qid)
		.all<ChoiceRow>();
	return results;
}

async function selectAttemptRow(attemptid: string): Promise<AttemptRow | null> {
	const db = await getDb();
	const { results } = await db
		.prepare(
			`SELECT attemptid, qid, userid, choiceid, choice_text, is_correct, created_at
       FROM attempts WHERE attemptid = ?1`,
		)
		.bind(attemptid)
		.all<AttemptRow>();
	return results[0] ?? null;
}

async function assembleQuestion(qid: string): Promise<McqQuestion | null> {
	const row = await selectQuestionRow(qid);
	if (!row) {
		return null;
	}
	const choiceRows = await selectChoiceRows(qid);
	return {
		...toSummary(row),
		choices: choiceRows.map(toChoice),
	};
}

function choiceInserts(
	db: D1Database,
	qid: string,
	choices: { choiceText: string; isCorrect: boolean }[],
) {
	return choices.map((choice, index) =>
		db
			.prepare(
				`INSERT INTO choices (choiceid, qid, choice_text, is_correct, position)
         VALUES (?1, ?2, ?3, ?4, ?5)`,
			)
			.bind(
				crypto.randomUUID(),
				qid,
				choice.choiceText,
				choice.isCorrect ? 1 : 0,
				index + 1,
			),
	);
}

export async function createQuestion(input: {
	name: string;
	question: string;
	choices: { choiceText: string; isCorrect: boolean }[];
}): Promise<McqQuestion> {
	const parsed = parseQuestionInput(input);
	const qid = crypto.randomUUID();
	const db = await getDb();

	await db.batch([
		db
			.prepare(`INSERT INTO questions (qid, name, question) VALUES (?1, ?2, ?3)`)
			.bind(qid, parsed.name, parsed.question),
		...choiceInserts(db, qid, parsed.choices),
	]);

	const created = await assembleQuestion(qid);
	if (!created) {
		throw new Error("Unable to load created question");
	}
	return created;
}

export async function getQuestionById(qid: string): Promise<McqQuestion | null> {
	return assembleQuestion(qid);
}

export async function listQuestions(): Promise<McqQuestionSummary[]> {
	const db = await getDb();
	const { results } = await db
		.prepare(
			`SELECT qid, name, question, created_at, updated_at
       FROM questions ORDER BY created_at DESC`,
		)
		.all<QuestionRow>();
	return results.map(toSummary);
}

export async function updateQuestion(
	qid: string,
	input: {
		name: string;
		question: string;
		choices: { choiceText: string; isCorrect: boolean }[];
	},
): Promise<McqQuestion | null> {
	const parsed = parseQuestionInput(input);
	const existing = await selectQuestionRow(qid);
	if (!existing) {
		return null;
	}

	const db = await getDb();
	await db.batch([
		db.prepare(`DELETE FROM choices WHERE qid = ?1`).bind(qid),
		db
			.prepare(
				`UPDATE questions
         SET name = ?1, question = ?2, updated_at = datetime('now')
         WHERE qid = ?3`,
			)
			.bind(parsed.name, parsed.question, qid),
		...choiceInserts(db, qid, parsed.choices),
	]);

	return assembleQuestion(qid);
}

export async function deleteQuestion(qid: string): Promise<void> {
	const db = await getDb();
	await db.batch([
		db.prepare(`DELETE FROM attempts WHERE qid = ?1`).bind(qid),
		db.prepare(`DELETE FROM choices WHERE qid = ?1`).bind(qid),
		db.prepare(`DELETE FROM questions WHERE qid = ?1`).bind(qid),
	]);
}

export async function recordAttempt(
	qid: string,
	input: { userid: string; choiceid: string },
): Promise<McqAttempt | null> {
	const parsed = parseAttemptInput(input);
	const question = await assembleQuestion(qid);
	if (!question) {
		return null;
	}

	const selected = question.choices.find(
		(choice) => choice.choiceid === parsed.choiceid,
	);
	if (!selected) {
		throw new McqValidationError("Validation failed", [
			{ path: "choiceid", message: "Choice is not on this question" },
		]);
	}

	const attemptid = crypto.randomUUID();
	const db = await getDb();
	await db
		.prepare(
			`INSERT INTO attempts (attemptid, qid, userid, choiceid, choice_text, is_correct)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
		)
		.bind(
			attemptid,
			qid,
			parsed.userid,
			selected.choiceid,
			selected.choiceText,
			selected.isCorrect ? 1 : 0,
		)
		.run();

	const stored = await selectAttemptRow(attemptid);
	if (stored) {
		return toAttempt(stored);
	}

	return {
		attemptid,
		qid,
		userid: parsed.userid,
		choiceid: selected.choiceid,
		choiceText: selected.choiceText,
		isCorrect: selected.isCorrect,
		createdAt: "",
	};
}
