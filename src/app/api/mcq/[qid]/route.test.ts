import {
	deleteQuestion,
	getQuestionById,
	updateQuestion,
} from "@/lib/services/mcq-service";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/mcq-service", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/services/mcq-service")>();
	return {
		...actual,
		getQuestionById: vi.fn(),
		updateQuestion: vi.fn(),
		deleteQuestion: vi.fn(),
	};
});

const getQuestionByIdMock = vi.mocked(getQuestionById);
const updateQuestionMock = vi.mocked(updateQuestion);
const deleteQuestionMock = vi.mocked(deleteQuestion);

const qid = "550e8400-e29b-41d4-a716-446655440000";

const question = {
	qid,
	name: "Photosynthesis",
	question: "What gas do plants release during photosynthesis?",
	createdAt: "2026-09-03 12:00:00",
	updatedAt: "2026-09-03 12:00:00",
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
	name: "Respiration",
	question: "What gas do animals exhale?",
	choices: [
		{ choiceText: "Carbon dioxide", isCorrect: true },
		{ choiceText: "Helium", isCorrect: false },
	],
};

function context() {
	return { params: Promise.resolve({ qid }) };
}

function getRequest() {
	return new Request(`http://localhost/api/mcq/${qid}`, { method: "GET" });
}

function putJson(body: unknown) {
	return new Request(`http://localhost/api/mcq/${qid}`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

function deleteRequest() {
	return new Request(`http://localhost/api/mcq/${qid}`, { method: "DELETE" });
}

describe("/api/mcq/[qid]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getQuestionByIdMock.mockResolvedValue(question);
		updateQuestionMock.mockResolvedValue({ ...question, ...validBody, choices: question.choices });
		deleteQuestionMock.mockResolvedValue(undefined);
	});

	it("GET /api/mcq/[qid] returns 200 with choices", async () => {
		const { GET } = await import("./route");
		const response = await GET(getRequest(), context());
		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json.qid).toBe(qid);
		expect(json.choices).toEqual(question.choices);
	});

	it("GET /api/mcq/[qid] returns 404 when missing", async () => {
		getQuestionByIdMock.mockResolvedValue(null);
		const { GET } = await import("./route");
		const response = await GET(getRequest(), context());
		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toEqual({
			error: "Question not found.",
		});
	});

	it("PUT /api/mcq/[qid] returns 200 with the updated question", async () => {
		const updated = {
			...question,
			name: validBody.name,
			question: validBody.question,
		};
		updateQuestionMock.mockResolvedValue(updated);
		const { PUT } = await import("./route");
		const response = await PUT(putJson(validBody), context());
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(updated);
	});

	it("PUT /api/mcq/[qid] returns 400 on validation failure", async () => {
		const { PUT } = await import("./route");
		const response = await PUT(
			putJson({ ...validBody, name: "", choices: [] }),
			context(),
		);
		expect(response.status).toBe(400);
		const json = await response.json();
		expect(json.error).toBe("Validation failed");
		expect(json.details).toEqual(
			expect.arrayContaining([expect.objectContaining({ path: expect.any(String) })]),
		);
		expect(updateQuestionMock).not.toHaveBeenCalled();
	});

	it("PUT /api/mcq/[qid] returns 404 when missing", async () => {
		updateQuestionMock.mockResolvedValue(null);
		const { PUT } = await import("./route");
		const response = await PUT(putJson(validBody), context());
		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toEqual({
			error: "Question not found.",
		});
	});

	it("DELETE /api/mcq/[qid] returns 200 { ok: true }", async () => {
		const { DELETE } = await import("./route");
		const response = await DELETE(deleteRequest(), context());
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ ok: true });
		expect(deleteQuestionMock).toHaveBeenCalledWith(qid);
	});

	it("DELETE /api/mcq/[qid] returns 404 when missing", async () => {
		getQuestionByIdMock.mockResolvedValue(null);
		const { DELETE } = await import("./route");
		const response = await DELETE(deleteRequest(), context());
		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toEqual({
			error: "Question not found.",
		});
		expect(deleteQuestionMock).not.toHaveBeenCalled();
	});
});
