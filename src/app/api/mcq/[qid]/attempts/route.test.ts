import { McqValidationError, recordAttempt } from "@/lib/services/mcq-service";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/mcq-service", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/services/mcq-service")>();
	return {
		...actual,
		recordAttempt: vi.fn(),
	};
});

const recordAttemptMock = vi.mocked(recordAttempt);

const qid = "550e8400-e29b-41d4-a716-446655440000";
const choiceid = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const userid = "660e8400-e29b-41d4-a716-446655440111";

const attempt = {
	attemptid: "aa0e8400-e29b-41d4-a716-446655440099",
	qid,
	userid,
	choiceid,
	choiceText: "Oxygen",
	isCorrect: true,
	createdAt: "2026-09-03 12:05:00",
};

const validBody = { userid, choiceid };

function context() {
	return { params: Promise.resolve({ qid }) };
}

function postJson(body: unknown) {
	return new Request(`http://localhost/api/mcq/${qid}/attempts`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/mcq/[qid]/attempts", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		recordAttemptMock.mockResolvedValue(attempt);
	});

	it("POST /api/mcq/[qid]/attempts returns 201 with isCorrect", async () => {
		const { POST } = await import("./route");
		const response = await POST(postJson(validBody), context());
		expect(response.status).toBe(201);
		const json = await response.json();
		expect(json.isCorrect).toBe(true);
		expect(json.choiceid).toBe(choiceid);
		expect(response.headers.get("set-cookie")).toBeNull();
	});

	it("POST /api/mcq/[qid]/attempts returns 400 for unknown choiceid", async () => {
		recordAttemptMock.mockRejectedValue(
			new McqValidationError("Validation failed", [
				{ path: "choiceid", message: "Choice is not on this question" },
			]),
		);
		const { POST } = await import("./route");
		const response = await POST(postJson(validBody), context());
		expect(response.status).toBe(400);
		const json = await response.json();
		expect(json.error).toBe("Validation failed");
		expect(json.details).toEqual(
			expect.arrayContaining([expect.objectContaining({ path: "choiceid" })]),
		);
	});

	it("POST /api/mcq/[qid]/attempts returns 404 when the question is missing", async () => {
		recordAttemptMock.mockResolvedValue(null);
		const { POST } = await import("./route");
		const response = await POST(postJson(validBody), context());
		expect(response.status).toBe(404);
		await expect(response.json()).resolves.toEqual({
			error: "Question not found.",
		});
	});
});
