import { getDb } from "@/lib/db";
import {
	createQuestion,
	deleteQuestion,
	getQuestionById,
	listQuestions,
	McqValidationError,
	recordAttempt,
	updateQuestion,
} from "@/lib/services/mcq-service";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
	getDb: vi.fn(),
}));

type StoredQuestion = {
	qid: string;
	name: string;
	question: string;
	created_at: string;
	updated_at: string;
};

type StoredChoice = {
	choiceid: string;
	qid: string;
	choice_text: string;
	is_correct: number;
	position: number;
};

type StoredAttempt = {
	attemptid: string;
	qid: string;
	userid: string;
	choiceid: string;
	choice_text: string;
	is_correct: number;
	created_at: string;
};

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TWO_CHOICES = [
	{ choiceText: "Oxygen", isCorrect: true },
	{ choiceText: "Nitrogen", isCorrect: false },
];

const getDbMock = vi.mocked(getDb);

function validCreateInput() {
	return {
		name: "Photosynthesis",
		question: "What gas do plants release during photosynthesis?",
		choices: TWO_CHOICES,
	};
}

function createFakeD1(
	questions: Map<string, StoredQuestion>,
	choices: Map<string, StoredChoice>,
	attempts: Map<string, StoredAttempt>,
	preparedSql: string[],
) {
	let clock = 0;

	function nextTimestamp() {
		clock += 1;
		return `2026-09-03 12:00:${String(clock).padStart(2, "0")}`;
	}

	function select(sql: string, params: unknown[]) {
		if (/FROM questions/i.test(sql) && /ORDER BY created_at DESC/i.test(sql)) {
			return [...questions.values()].sort((a, b) =>
				b.created_at.localeCompare(a.created_at),
			);
		}
		if (/FROM questions/i.test(sql) && /WHERE qid = \?1/i.test(sql)) {
			const row = questions.get(String(params[0]));
			return row ? [row] : [];
		}
		if (/FROM choices/i.test(sql) && /WHERE qid = \?1/i.test(sql)) {
			return [...choices.values()]
				.filter((row) => row.qid === String(params[0]))
				.sort((a, b) => a.position - b.position);
		}
		return [];
	}

	function run(sql: string, params: unknown[]): { meta: { changes: number } } {
		if (/INSERT INTO questions/i.test(sql)) {
			const timestamp = nextTimestamp();
			const row: StoredQuestion = {
				qid: String(params[0]),
				name: String(params[1]),
				question: String(params[2]),
				created_at: timestamp,
				updated_at: timestamp,
			};
			questions.set(row.qid, row);
			return { meta: { changes: 1 } };
		}

		if (/INSERT INTO choices/i.test(sql)) {
			const row: StoredChoice = {
				choiceid: String(params[0]),
				qid: String(params[1]),
				choice_text: String(params[2]),
				is_correct: Number(params[3]),
				position: Number(params[4]),
			};
			choices.set(row.choiceid, row);
			return { meta: { changes: 1 } };
		}

		if (/INSERT INTO attempts/i.test(sql)) {
			const row: StoredAttempt = {
				attemptid: String(params[0]),
				qid: String(params[1]),
				userid: String(params[2]),
				choiceid: String(params[3]),
				choice_text: String(params[4]),
				is_correct: Number(params[5]),
				created_at: nextTimestamp(),
			};
			attempts.set(row.attemptid, row);
			return { meta: { changes: 1 } };
		}

		if (/UPDATE questions/i.test(sql)) {
			const qid = String(params[params.length - 1]);
			const existing = questions.get(qid);
			if (!existing) {
				return { meta: { changes: 0 } };
			}
			existing.name = String(params[0]);
			existing.question = String(params[1]);
			existing.updated_at = nextTimestamp();
			questions.set(qid, existing);
			return { meta: { changes: 1 } };
		}

		if (/DELETE FROM attempts/i.test(sql)) {
			const qid = String(params[0]);
			let changes = 0;
			for (const [id, row] of attempts) {
				if (row.qid === qid) {
					attempts.delete(id);
					changes += 1;
				}
			}
			return { meta: { changes } };
		}

		if (/DELETE FROM choices/i.test(sql)) {
			const qid = String(params[0]);
			let changes = 0;
			for (const [id, row] of choices) {
				if (row.qid === qid) {
					choices.delete(id);
					changes += 1;
				}
			}
			return { meta: { changes } };
		}

		if (/DELETE FROM questions/i.test(sql)) {
			const existed = questions.delete(String(params[0]));
			return { meta: { changes: existed ? 1 : 0 } };
		}

		return { meta: { changes: 0 } };
	}

	return {
		prepare(sql: string) {
			preparedSql.push(sql);
			const bound = (...params: unknown[]) => ({
				run: async () => run(sql, params),
				all: async () => ({ results: select(sql, params) }),
			});
			return {
				bind: bound,
				run: async () => run(sql, []),
				all: async () => ({ results: select(sql, []) }),
			};
		},
		async batch(
			statements: Array<{ run: () => Promise<{ meta: { changes: number } }> }>,
		) {
			const results = [];
			for (const statement of statements) {
				results.push(await statement.run());
			}
			return results;
		},
	};
}

describe("mcq service", () => {
	const questions = new Map<string, StoredQuestion>();
	const choices = new Map<string, StoredChoice>();
	const attempts = new Map<string, StoredAttempt>();
	const preparedSql: string[] = [];

	beforeEach(() => {
		vi.clearAllMocks();
		questions.clear();
		choices.clear();
		attempts.clear();
		preparedSql.length = 0;
		getDbMock.mockResolvedValue(
			createFakeD1(questions, choices, attempts, preparedSql) as unknown as D1Database,
		);
	});

	it("createQuestion returns a question with a generated qid", async () => {
		const created = await createQuestion(validCreateInput());
		expect(created.qid).toMatch(UUID_PATTERN);
		expect(validCreateInput()).not.toHaveProperty("qid");
	});

	it("createQuestion persists name, question, and two choices", async () => {
		const created = await createQuestion(validCreateInput());
		const found = await getQuestionById(created.qid);
		expect(found?.name).toBe("Photosynthesis");
		expect(found?.question).toBe(
			"What gas do plants release during photosynthesis?",
		);
		expect(found?.choices.map((choice) => choice.choiceText)).toEqual([
			"Oxygen",
			"Nitrogen",
		]);
	});

	it("createQuestion assigns position from array order starting at 1", async () => {
		const created = await createQuestion(validCreateInput());
		expect(created.choices[0]?.position).toBe(1);
		expect(created.choices[1]?.position).toBe(2);
	});

	it("createQuestion stores exactly one correct choice", async () => {
		const created = await createQuestion(validCreateInput());
		expect(created.choices.filter((choice) => choice.isCorrect)).toHaveLength(1);
		expect(created.choices[0]?.isCorrect).toBe(true);
	});

	it("createQuestion rejects fewer than two choices", async () => {
		await expect(
			createQuestion({
				...validCreateInput(),
				choices: [{ choiceText: "Oxygen", isCorrect: true }],
			}),
		).rejects.toBeInstanceOf(McqValidationError);
	});

	it("createQuestion rejects more than six choices", async () => {
		await expect(
			createQuestion({
				...validCreateInput(),
				choices: [
					{ choiceText: "A", isCorrect: true },
					{ choiceText: "B", isCorrect: false },
					{ choiceText: "C", isCorrect: false },
					{ choiceText: "D", isCorrect: false },
					{ choiceText: "E", isCorrect: false },
					{ choiceText: "F", isCorrect: false },
					{ choiceText: "G", isCorrect: false },
				],
			}),
		).rejects.toBeInstanceOf(McqValidationError);
	});

	it("createQuestion rejects zero or multiple correct choices", async () => {
		await expect(
			createQuestion({
				...validCreateInput(),
				choices: [
					{ choiceText: "Oxygen", isCorrect: false },
					{ choiceText: "Nitrogen", isCorrect: false },
				],
			}),
		).rejects.toBeInstanceOf(McqValidationError);

		await expect(
			createQuestion({
				...validCreateInput(),
				choices: [
					{ choiceText: "Oxygen", isCorrect: true },
					{ choiceText: "Nitrogen", isCorrect: true },
				],
			}),
		).rejects.toBeInstanceOf(McqValidationError);
	});

	it("createQuestion rejects empty name or question", async () => {
		await expect(
			createQuestion({ ...validCreateInput(), name: "   " }),
		).rejects.toBeInstanceOf(McqValidationError);
		await expect(
			createQuestion({ ...validCreateInput(), question: "" }),
		).rejects.toBeInstanceOf(McqValidationError);
	});

	it("getQuestionById returns null when missing", async () => {
		await expect(getQuestionById("no-such-id")).resolves.toBeNull();
	});

	it("listQuestions returns newest first and omits choices", async () => {
		const older = await createQuestion({
			...validCreateInput(),
			name: "Older",
		});
		const newer = await createQuestion({
			...validCreateInput(),
			name: "Newer",
		});
		const listed = await listQuestions();
		expect(listed.map((item) => item.qid)).toEqual([newer.qid, older.qid]);
		expect(listed[0]).not.toHaveProperty("choices");
		expect(listed[1]).not.toHaveProperty("choices");
	});

	it("updateQuestion changes name, question, and replaces choices", async () => {
		const created = await createQuestion(validCreateInput());
		const updated = await updateQuestion(created.qid, {
			name: "Respiration",
			question: "What gas do animals exhale?",
			choices: [
				{ choiceText: "Carbon dioxide", isCorrect: true },
				{ choiceText: "Helium", isCorrect: false },
				{ choiceText: "Argon", isCorrect: false },
			],
		});
		expect(updated?.name).toBe("Respiration");
		expect(updated?.question).toBe("What gas do animals exhale?");
		expect(updated?.choices.map((choice) => choice.choiceText)).toEqual([
			"Carbon dioxide",
			"Helium",
			"Argon",
		]);
		const found = await getQuestionById(created.qid);
		expect(found?.choices.map((choice) => choice.choiceText)).toEqual([
			"Carbon dioxide",
			"Helium",
			"Argon",
		]);
	});

	it("updateQuestion returns null when qid is missing", async () => {
		await expect(
			updateQuestion("no-such-id", validCreateInput()),
		).resolves.toBeNull();
	});

	it("deleteQuestion removes the question", async () => {
		const created = await createQuestion(validCreateInput());
		await deleteQuestion(created.qid);
		await expect(getQuestionById(created.qid)).resolves.toBeNull();
	});

	it("deleteQuestion removes choices and attempts", async () => {
		const created = await createQuestion(validCreateInput());
		const correctId = created.choices.find((choice) => choice.isCorrect)?.choiceid;
		expect(correctId).toBeTruthy();
		await recordAttempt(created.qid, {
			userid: "550e8400-e29b-41d4-a716-446655440000",
			choiceid: correctId as string,
		});
		await deleteQuestion(created.qid);
		expect([...choices.values()].filter((row) => row.qid === created.qid)).toEqual(
			[],
		);
		expect([...attempts.values()].filter((row) => row.qid === created.qid)).toEqual(
			[],
		);
	});

	it("deleteQuestion is safe when qid is missing", async () => {
		await expect(deleteQuestion("no-such-id")).resolves.toBeUndefined();
	});

	it("recordAttempt stores the selected choice snapshot and isCorrect", async () => {
		const created = await createQuestion(validCreateInput());
		const correct = created.choices.find((choice) => choice.isCorrect);
		expect(correct).toBeTruthy();
		const attempt = await recordAttempt(created.qid, {
			userid: "550e8400-e29b-41d4-a716-446655440000",
			choiceid: correct?.choiceid as string,
		});
		expect(attempt?.isCorrect).toBe(true);
		expect(attempt?.choiceText).toBe("Oxygen");
		expect(attempt?.choiceid).toBe(correct?.choiceid);
	});

	it("recordAttempt rejects a choiceid that is not on the question", async () => {
		const created = await createQuestion(validCreateInput());
		await expect(
			recordAttempt(created.qid, {
				userid: "550e8400-e29b-41d4-a716-446655440000",
				choiceid: "00000000-0000-4000-8000-000000000000",
			}),
		).rejects.toBeInstanceOf(McqValidationError);
	});

	it("recordAttempt returns not-found when the question is missing", async () => {
		await expect(
			recordAttempt("no-such-id", {
				userid: "550e8400-e29b-41d4-a716-446655440000",
				choiceid: "00000000-0000-4000-8000-000000000000",
			}),
		).resolves.toBeNull();
	});

	it("queries use numbered placeholders", async () => {
		await createQuestion(validCreateInput());
		expect(preparedSql.length).toBeGreaterThan(0);
		expect(preparedSql.some((sql) => sql.includes("?1"))).toBe(true);
		expect(
			preparedSql.some((sql) =>
				/Photosynthesis|What gas do plants release/i.test(sql),
			),
		).toBe(false);
	});
});
