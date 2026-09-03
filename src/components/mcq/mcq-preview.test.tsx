import { McqPreview } from "@/components/mcq/mcq-preview";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const qid = "550e8400-e29b-41d4-a716-446655440000";
const userid = "660e8400-e29b-41d4-a716-446655440111";
const oxygenId = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const nitrogenId = "88cd39e2-8a0a-4c3e-9c1a-0c0d5e6f7a8b";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push }),
}));

const loadedQuestion = {
	qid,
	name: "Photosynthesis",
	question: "What gas do plants release during photosynthesis?",
	createdAt: "2026-09-03 12:00:00",
	updatedAt: "2026-09-03 12:00:00",
	choices: [
		{
			choiceid: oxygenId,
			choiceText: "Oxygen",
			isCorrect: true,
			position: 1,
		},
		{
			choiceid: nitrogenId,
			choiceText: "Nitrogen",
			isCorrect: false,
			position: 2,
		},
	],
};

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function attemptsCall() {
	return vi.mocked(fetch).mock.calls.find(([url, init]) => {
		return (
			String(url).includes(`/api/mcq/${qid}/attempts`) &&
			(init as RequestInit | undefined)?.method === "POST"
		);
	});
}

async function readyPreview() {
	render(<McqPreview qid={qid} />);
	expect(await screen.findByText("Photosynthesis")).toBeTruthy();
}

describe("McqPreview", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("fetch", vi.fn());
		sessionStorage.clear();
		vi.mocked(fetch).mockImplementation(async (input, init) => {
			const url = String(input);
			const method = ((init as RequestInit | undefined)?.method ?? "GET").toUpperCase();
			if (url.includes(`/api/mcq/${qid}/attempts`) && method === "POST") {
				return jsonResponse(
					{
						attemptid: "aa0e8400-e29b-41d4-a716-446655440099",
						qid,
						userid,
						choiceid: oxygenId,
						choiceText: "Oxygen",
						isCorrect: true,
					},
					201,
				);
			}
			if (url.includes(`/api/mcq/${qid}`) && method === "GET") {
				return jsonResponse(loadedQuestion);
			}
			return jsonResponse({ error: "not mocked" }, 500);
		});
	});

	it("preview loads the question name, stem, and choice texts", async () => {
		await readyPreview();
		expect(
			screen.getByText("What gas do plants release during photosynthesis?"),
		).toBeTruthy();
		expect(screen.getByText("Oxygen")).toBeTruthy();
		expect(screen.getByText("Nitrogen")).toBeTruthy();
	});

	it("preview does not show which choice is correct before submit", async () => {
		await readyPreview();
		expect(screen.queryByText(/correct/i)).toBeNull();
	});

	it("preview has no Save button", async () => {
		await readyPreview();
		expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
	});

	it("submit is not sent when no choice is selected", async () => {
		sessionStorage.setItem("gq.userid", userid);
		const user = userEvent.setup();
		await readyPreview();
		await user.click(screen.getByRole("button", { name: /submit/i }));
		expect(attemptsCall()).toBeUndefined();
	});

	it("signed-out preview does not POST an attempt", async () => {
		const user = userEvent.setup();
		await readyPreview();
		await user.click(screen.getByRole("radio", { name: /oxygen/i }));
		await user.click(screen.getByRole("button", { name: /submit/i }));
		expect(attemptsCall()).toBeUndefined();
	});

	it("successful submit POSTs /api/mcq/[qid]/attempts with userid and choiceid", async () => {
		sessionStorage.setItem("gq.userid", userid);
		const user = userEvent.setup();
		await readyPreview();
		await user.click(screen.getByRole("radio", { name: /oxygen/i }));
		await user.click(screen.getByRole("button", { name: /submit/i }));
		await vi.waitFor(() => {
			expect(attemptsCall()).toBeTruthy();
		});
		const [, init] = attemptsCall()!;
		const body = JSON.parse(String((init as RequestInit).body)) as {
			userid: string;
			choiceid: string;
		};
		expect(body.userid).toBe(userid);
		expect(body.choiceid).toBe(oxygenId);
	});

	it("successful correct attempt shows that the choice was correct", async () => {
		sessionStorage.setItem("gq.userid", userid);
		const user = userEvent.setup();
		await readyPreview();
		await user.click(screen.getByRole("radio", { name: /oxygen/i }));
		await user.click(screen.getByRole("button", { name: /submit/i }));
		expect(await screen.findByText(/correct/i)).toBeTruthy();
	});

	it("successful incorrect attempt shows that the choice was incorrect", async () => {
		sessionStorage.setItem("gq.userid", userid);
		vi.mocked(fetch).mockImplementation(async (input, init) => {
			const url = String(input);
			const method = ((init as RequestInit | undefined)?.method ?? "GET").toUpperCase();
			if (url.includes(`/api/mcq/${qid}/attempts`) && method === "POST") {
				return jsonResponse(
					{
						attemptid: "aa0e8400-e29b-41d4-a716-446655440099",
						qid,
						userid,
						choiceid: nitrogenId,
						choiceText: "Nitrogen",
						isCorrect: false,
					},
					201,
				);
			}
			return jsonResponse(loadedQuestion);
		});
		const user = userEvent.setup();
		await readyPreview();
		await user.click(screen.getByRole("radio", { name: /nitrogen/i }));
		await user.click(screen.getByRole("button", { name: /submit/i }));
		expect(await screen.findByText(/incorrect/i)).toBeTruthy();
	});

	it("a control returns to /mcq", async () => {
		await readyPreview();
		expect(screen.getByRole("link", { name: /mcq|list|back/i })).toHaveProperty(
			"href",
			expect.stringMatching(/\/mcq$/),
		);
	});
});
