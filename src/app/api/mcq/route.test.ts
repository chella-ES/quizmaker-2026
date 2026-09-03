import {
	createQuestion,
	listQuestions,
} from "@/lib/services/mcq-service";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/mcq-service", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/services/mcq-service")>();
	return {
		...actual,
		listQuestions: vi.fn(),
		createQuestion: vi.fn(),
	};
});

const listQuestionsMock = vi.mocked(listQuestions);
const createQuestionMock = vi.mocked(createQuestion);

const questionSummary = {
	qid: "550e8400-e29b-41d4-a716-446655440000",
	name: "Photosynthesis",
	question: "What gas do plants release during photosynthesis?",
	createdAt: "2026-09-03 12:00:00",
	updatedAt: "2026-09-03 12:00:00",
};

const createdQuestion = {
	...questionSummary,
	choices: [
		{
			choiceid: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
			choiceText: "Oxygen",
			isCorrect: true,
			position: 1,
		},
		{
			choiceid: "88cd39e2-8a0a-4c3e-9c1a-0c0d5e6f7a8b",
			choiceText: "Nitrogen",
			isCorrect: false,
			position: 2,
		},
	],
};

const validBody = {
	name: "Photosynthesis",
	question: "What gas do plants release during photosynthesis?",
	choices: [
		{ choiceText: "Oxygen", isCorrect: true },
		{ choiceText: "Nitrogen", isCorrect: false },
	],
};

function getRequest() {
	return new Request("http://localhost/api/mcq", { method: "GET" });
}

function postJson(body: unknown) {
	return new Request("http://localhost/api/mcq", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("/api/mcq", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		listQuestionsMock.mockResolvedValue([questionSummary]);
		createQuestionMock.mockResolvedValue(createdQuestion);
	});

	it("GET /api/mcq returns 200 and the questions array", async () => {
		const { GET } = await import("./route");
		const response = await GET(getRequest());
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			questions: [questionSummary],
		});
	});

	it("GET /api/mcq returns 500 with a generic message on throw", async () => {
		listQuestionsMock.mockRejectedValue(new Error("D1 down"));
		const { GET } = await import("./route");
		const response = await GET(getRequest());
		expect(response.status).toBe(500);
		await expect(response.json()).resolves.toEqual({
			error: "Unable to list questions.",
		});
	});

	it("POST /api/mcq returns 201 and the created question", async () => {
		const { POST } = await import("./route");
		const response = await POST(postJson(validBody));
		expect(response.status).toBe(201);
		const json = await response.json();
		expect(json.qid).toBe(createdQuestion.qid);
		expect(json.choices).toEqual(createdQuestion.choices);
	});

	it("POST /api/mcq returns 400 when validation fails", async () => {
		const { POST } = await import("./route");
		const response = await POST(
			postJson({ ...validBody, name: "", choices: validBody.choices.slice(0, 1) }),
		);
		expect(response.status).toBe(400);
		const json = await response.json();
		expect(json.error).toBe("Validation failed");
		expect(json.details).toEqual(
			expect.arrayContaining([expect.objectContaining({ path: expect.any(String) })]),
		);
		expect(createQuestionMock).not.toHaveBeenCalled();
	});

	it("POST /api/mcq returns 500 with a generic message on throw", async () => {
		createQuestionMock.mockRejectedValue(new Error("UNIQUE constraint failed"));
		const { POST } = await import("./route");
		const response = await POST(postJson(validBody));
		expect(response.status).toBe(500);
		const json = await response.json();
		expect(json).toEqual({ error: "Unable to create question." });
		expect(JSON.stringify(json)).not.toMatch(/UNIQUE constraint/i);
	});

	it("handlers do not set a session cookie", async () => {
		const { POST } = await import("./route");
		const response = await POST(postJson(validBody));
		expect(response.headers.get("set-cookie")).toBeNull();
	});
});
