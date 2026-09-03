import { McqForm } from "@/components/mcq/mcq-form";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const qid = "550e8400-e29b-41d4-a716-446655440000";

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

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

async function fillValidCreate(user: ReturnType<typeof userEvent.setup>) {
	await user.type(screen.getByLabelText(/^name$/i), "Photosynthesis");
	await user.type(
		screen.getByLabelText(/^question$/i),
		"What gas do plants release during photosynthesis?",
	);
	await user.type(screen.getByLabelText(/^choice 1$/i), "Oxygen");
	await user.type(screen.getByLabelText(/^choice 2$/i), "Nitrogen");
	await user.click(screen.getByRole("radio", { name: /choice 1 is correct/i }));
}

describe("McqForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("fetch", vi.fn());
	});

	it("create form shows name, question, and two choice fields", () => {
		render(<McqForm mode="create" />);
		expect(screen.getByLabelText(/^name$/i)).toBeTruthy();
		expect(screen.getByLabelText(/^question$/i)).toBeTruthy();
		expect(screen.getByLabelText(/^choice 1$/i)).toBeTruthy();
		expect(screen.getByLabelText(/^choice 2$/i)).toBeTruthy();
	});

	it("create form has Save and Cancel", () => {
		render(<McqForm mode="create" />);
		expect(screen.getByRole("button", { name: /save/i })).toBeTruthy();
		expect(screen.getByRole("button", { name: /cancel/i })).toBeTruthy();
	});

	it("create form labels the correct-choice radios", () => {
		render(<McqForm mode="create" />);
		expect(screen.getAllByText(/click for correct choice/i).length).toBeGreaterThan(0);
		expect(screen.getByRole("radio", { name: /choice 1 is correct/i })).toBeTruthy();
	});

	it("Cancel navigates to /mcq without posting", async () => {
		const user = userEvent.setup();
		render(<McqForm mode="create" />);
		await user.click(screen.getByRole("button", { name: /cancel/i }));
		expect(push).toHaveBeenCalledWith("/mcq");
		expect(
			vi.mocked(fetch).mock.calls.some(([url, init]) => {
				return (
					String(url).includes("/api/mcq") &&
					(init as RequestInit | undefined)?.method === "POST"
				);
			}),
		).toBe(false);
	});

	it("Save does not submit when name or question is empty", async () => {
		const user = userEvent.setup();
		render(<McqForm mode="create" />);
		await user.click(screen.getByRole("button", { name: /save/i }));
		expect(fetch).not.toHaveBeenCalled();
		expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
	});

	it("Save does not submit when a choice is empty", async () => {
		const user = userEvent.setup();
		render(<McqForm mode="create" />);
		await user.type(screen.getByLabelText(/^name$/i), "Photosynthesis");
		await user.type(screen.getByLabelText(/^question$/i), "What gas?");
		await user.type(screen.getByLabelText(/^choice 1$/i), "Oxygen");
		await user.click(screen.getByRole("radio", { name: /choice 1 is correct/i }));
		await user.click(screen.getByRole("button", { name: /save/i }));
		expect(fetch).not.toHaveBeenCalled();
	});

	it("Save does not submit when no correct choice is selected", async () => {
		const user = userEvent.setup();
		render(<McqForm mode="create" />);
		await user.type(screen.getByLabelText(/^name$/i), "Photosynthesis");
		await user.type(screen.getByLabelText(/^question$/i), "What gas?");
		await user.type(screen.getByLabelText(/^choice 1$/i), "Oxygen");
		await user.type(screen.getByLabelText(/^choice 2$/i), "Nitrogen");
		await user.click(screen.getByRole("button", { name: /save/i }));
		expect(fetch).not.toHaveBeenCalled();
	});

	it("Add choice adds a third field and is disabled at six", async () => {
		const user = userEvent.setup();
		render(<McqForm mode="create" />);
		const add = screen.getByRole("button", { name: /add choice/i });
		await user.click(add);
		expect(screen.getByLabelText(/^choice 3$/i)).toBeTruthy();
		await user.click(add);
		await user.click(add);
		await user.click(add);
		expect(screen.getByLabelText(/^choice 6$/i)).toBeTruthy();
		expect(screen.getByRole("button", { name: /add choice/i })).toHaveProperty(
			"disabled",
			true,
		);
	});

	it("Remove choice is disabled at two choices", () => {
		render(<McqForm mode="create" />);
		const removeButtons = screen.getAllByRole("button", { name: /remove choice/i });
		expect(removeButtons.length).toBeGreaterThan(0);
		expect(removeButtons.every((button) => (button as HTMLButtonElement).disabled)).toBe(
			true,
		);
	});

	it("successful create POSTs /api/mcq with name, question, and choices", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse(loadedQuestion, 201));
		const user = userEvent.setup();
		render(<McqForm mode="create" />);
		await fillValidCreate(user);
		await user.click(screen.getByRole("button", { name: /save/i }));
		await vi.waitFor(() => {
			expect(fetch).toHaveBeenCalled();
		});
		const [url, init] = vi.mocked(fetch).mock.calls[0];
		expect(String(url)).toContain("/api/mcq");
		expect((init as RequestInit).method).toBe("POST");
		const body = JSON.parse(String((init as RequestInit).body)) as {
			name: string;
			question: string;
			choices: Array<{ choiceText: string; isCorrect: boolean }>;
		};
		expect(body.name).toBe("Photosynthesis");
		expect(body.question).toBe("What gas do plants release during photosynthesis?");
		expect(body.choices.length).toBeGreaterThanOrEqual(2);
		expect(body.choices.filter((choice) => choice.isCorrect)).toHaveLength(1);
	});

	it("successful create navigates to /mcq", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse(loadedQuestion, 201));
		const user = userEvent.setup();
		render(<McqForm mode="create" />);
		await fillValidCreate(user);
		await user.click(screen.getByRole("button", { name: /save/i }));
		await vi.waitFor(() => {
			expect(push).toHaveBeenCalledWith("/mcq");
		});
	});

	it("edit form loads GET /api/mcq/[qid] into the fields", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse(loadedQuestion));
		render(<McqForm mode="edit" qid={qid} />);
		expect(await screen.findByDisplayValue("Photosynthesis")).toBeTruthy();
		expect(
			screen.getByDisplayValue("What gas do plants release during photosynthesis?"),
		).toBeTruthy();
		expect(screen.getByDisplayValue("Oxygen")).toBeTruthy();
		expect(screen.getByDisplayValue("Nitrogen")).toBeTruthy();
		expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain(`/api/mcq/${qid}`);
		expect((vi.mocked(fetch).mock.calls[0][1] as RequestInit | undefined)?.method ?? "GET").toBe(
			"GET",
		);
	});

	it("successful edit PUTs /api/mcq/[qid]", async () => {
		vi.mocked(fetch).mockImplementation(async (input, init) => {
			const method = ((init as RequestInit | undefined)?.method ?? "GET").toUpperCase();
			if (method === "GET") {
				return jsonResponse(loadedQuestion);
			}
			return jsonResponse(loadedQuestion);
		});
		const user = userEvent.setup();
		render(<McqForm mode="edit" qid={qid} />);
		await screen.findByDisplayValue("Photosynthesis");
		await user.click(screen.getByRole("button", { name: /save/i }));
		await vi.waitFor(() => {
			expect(
				vi.mocked(fetch).mock.calls.some(([url, init]) => {
					return (
						String(url).includes(`/api/mcq/${qid}`) &&
						(init as RequestInit | undefined)?.method === "PUT"
					);
				}),
			).toBe(true);
		});
	});

	it("edit shows a not-found message when GET is 404", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({ error: "Question not found." }, 404),
		);
		render(<McqForm mode="edit" qid={qid} />);
		expect(await screen.findByText(/not found/i)).toBeTruthy();
		expect(screen.getByRole("link", { name: /mcq|list|back/i })).toHaveProperty(
			"href",
			expect.stringMatching(/\/mcq$/),
		);
		expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
	});

	it("400 details are shown on matching fields", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse(
				{
					error: "Validation failed",
					details: [{ path: "name", message: "Name is too long" }],
				},
				400,
			),
		);
		const user = userEvent.setup();
		render(<McqForm mode="create" />);
		await fillValidCreate(user);
		await user.click(screen.getByRole("button", { name: /save/i }));
		expect(await screen.findByText(/name is too long/i)).toBeTruthy();
	});
});
