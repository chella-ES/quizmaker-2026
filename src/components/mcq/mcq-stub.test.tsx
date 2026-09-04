import { McqStub } from "@/components/mcq/mcq-stub";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push }),
}));

const sampleQuestion = {
	qid: "550e8400-e29b-41d4-a716-446655440000",
	name: "Photosynthesis",
	question: "What gas do plants release during photosynthesis?",
	createdAt: "2026-09-03 12:00:00",
	updatedAt: "2026-09-03 12:00:00",
};

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function mockFetch(questions: typeof sampleQuestion[] = []) {
	let current = [...questions];
	vi.mocked(fetch).mockImplementation(async (input, init) => {
		const url = String(input);
		const method = ((init as RequestInit | undefined)?.method ?? "GET").toUpperCase();
		if (url.includes("/api/users/logout") && method === "POST") {
			return jsonResponse({ ok: true });
		}
		if (url.includes("/api/mcq/") && method === "DELETE") {
			const id = url.split("/api/mcq/")[1]?.split("?")[0];
			current = current.filter((question) => question.qid !== id);
			return jsonResponse({ ok: true });
		}
		if (url.includes("/api/mcq") && method === "GET") {
			return jsonResponse({ questions: current });
		}
		return jsonResponse({ error: "not mocked" }, 500);
	});
}

function logoutCall() {
	return vi.mocked(fetch).mock.calls.find(([url, init]) => {
		return (
			String(url).includes("/api/users/logout") &&
			(init as RequestInit | undefined)?.method === "POST"
		);
	});
}

async function openRowActions(user: ReturnType<typeof userEvent.setup>) {
	await user.click(await screen.findByRole("button", { name: /actions/i }));
}

describe("McqStub", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("fetch", vi.fn());
		sessionStorage.clear();
		mockFetch();
	});

	it("list page still has the multiple-choice heading", () => {
		render(<McqStub />);
		expect(
			screen.getByRole("heading", { name: /multiple-choice question/i }),
		).toBeTruthy();
	});

	it("list page has no stem textbox and no Save button", () => {
		render(<McqStub />);
		expect(screen.queryByRole("textbox")).toBeNull();
		expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
	});

	it("list page has a Create control that goes to /mcq/new", () => {
		render(<McqStub />);
		expect(screen.getByRole("link", { name: /create/i })).toHaveProperty(
			"href",
			expect.stringMatching(/\/mcq\/new$/),
		);
	});

	it("empty list shows a no-questions message", async () => {
		render(<McqStub />);
		expect(await screen.findByText(/no questions yet/i)).toBeTruthy();
	});

	it("list table shows Name, Description, and Actions headers", async () => {
		mockFetch([sampleQuestion]);
		render(<McqStub />);
		expect(await screen.findByRole("columnheader", { name: /name/i })).toBeTruthy();
		expect(screen.getByRole("columnheader", { name: /description/i })).toBeTruthy();
		expect(screen.getByRole("columnheader", { name: /actions/i })).toBeTruthy();
	});

	it("list table renders a row’s name and question", async () => {
		mockFetch([sampleQuestion]);
		render(<McqStub />);
		expect(await screen.findByText("Photosynthesis")).toBeTruthy();
		expect(
			screen.getByText("What gas do plants release during photosynthesis?"),
		).toBeTruthy();
	});

	it("row actions menu includes Edit, Preview, and Delete", async () => {
		mockFetch([sampleQuestion]);
		const user = userEvent.setup();
		render(<McqStub />);
		await openRowActions(user);
		expect(await screen.findByRole("menuitem", { name: /edit/i })).toBeTruthy();
		expect(screen.getByRole("menuitem", { name: /preview/i })).toBeTruthy();
		expect(screen.getByRole("menuitem", { name: /delete/i })).toBeTruthy();
	});

	it("choosing Edit navigates to /mcq/[qid]/edit", async () => {
		mockFetch([sampleQuestion]);
		const user = userEvent.setup();
		render(<McqStub />);
		await openRowActions(user);
		await user.click(await screen.findByRole("menuitem", { name: /edit/i }));
		expect(push).toHaveBeenCalledWith(`/mcq/${sampleQuestion.qid}/edit`);
	});

	it("choosing Preview navigates to /mcq/[qid]/preview", async () => {
		mockFetch([sampleQuestion]);
		const user = userEvent.setup();
		render(<McqStub />);
		await openRowActions(user);
		await user.click(await screen.findByRole("menuitem", { name: /preview/i }));
		expect(push).toHaveBeenCalledWith(`/mcq/${sampleQuestion.qid}/preview`);
	});

	it("choosing Delete opens a confirmation dialog", async () => {
		mockFetch([sampleQuestion]);
		const user = userEvent.setup();
		render(<McqStub />);
		await openRowActions(user);
		await user.click(await screen.findByRole("menuitem", { name: /delete/i }));
		const dialog = await screen.findByRole("dialog");
		expect(
			within(dialog).getByRole("heading", { name: /delete this question/i }),
		).toBeTruthy();
	});

	it("confirming delete calls DELETE /api/mcq/[qid]", async () => {
		mockFetch([sampleQuestion]);
		const user = userEvent.setup();
		render(<McqStub />);
		await openRowActions(user);
		await user.click(await screen.findByRole("menuitem", { name: /delete/i }));
		const dialog = await screen.findByRole("dialog");
		await user.click(within(dialog).getByRole("button", { name: /delete/i }));
		await vi.waitFor(() => {
			expect(
				vi.mocked(fetch).mock.calls.some(([url, init]) => {
					return (
						String(url).includes(`/api/mcq/${sampleQuestion.qid}`) &&
						(init as RequestInit | undefined)?.method === "DELETE"
					);
				}),
			).toBe(true);
		});
	});

	it("confirming delete refreshes the list so the row is gone", async () => {
		mockFetch([sampleQuestion]);
		const user = userEvent.setup();
		render(<McqStub />);
		expect(await screen.findByText("Photosynthesis")).toBeTruthy();
		await openRowActions(user);
		await user.click(await screen.findByRole("menuitem", { name: /delete/i }));
		const dialog = await screen.findByRole("dialog");
		await user.click(within(dialog).getByRole("button", { name: /delete/i }));
		await vi.waitFor(() => {
			expect(screen.queryByText("Photosynthesis")).toBeNull();
		});
	});

	it("canceling delete does not call DELETE", async () => {
		mockFetch([sampleQuestion]);
		const user = userEvent.setup();
		render(<McqStub />);
		await openRowActions(user);
		await user.click(await screen.findByRole("menuitem", { name: /delete/i }));
		const dialog = await screen.findByRole("dialog");
		await user.click(within(dialog).getByRole("button", { name: /cancel/i }));
		expect(
			vi.mocked(fetch).mock.calls.some(([, init]) => {
				return (init as RequestInit | undefined)?.method === "DELETE";
			}),
		).toBe(false);
	});

	it("mcq stub greets the teacher first name from sessionStorage", async () => {
		sessionStorage.setItem("gq.firstName", "Ada");
		render(<McqStub />);
		expect(await screen.findByText(/ada/i)).toBeTruthy();
	});

	it("mcq stub shows a signed-out hint when sessionStorage is empty", async () => {
		render(<McqStub />);
		expect(await screen.findByText(/not signed in/i)).toBeTruthy();
		expect(screen.getByRole("link", { name: /log in/i })).toHaveProperty(
			"href",
			expect.stringMatching(/\/login$/),
		);
	});

	it("log out POSTs to /api/users/logout", async () => {
		sessionStorage.setItem("gq.userid", "550e8400-e29b-41d4-a716-446655440000");
		sessionStorage.setItem("gq.username", "teacher@school.edu");
		sessionStorage.setItem("gq.firstName", "Ada");
		sessionStorage.setItem("gq.lastName", "Lovelace");
		const user = userEvent.setup();
		render(<McqStub />);
		await user.click(screen.getByRole("button", { name: /log out/i }));
		await vi.waitFor(() => {
			expect(logoutCall()).toBeTruthy();
		});
	});

	it("log out clears sessionStorage display keys", async () => {
		sessionStorage.setItem("gq.userid", "550e8400-e29b-41d4-a716-446655440000");
		sessionStorage.setItem("gq.username", "teacher@school.edu");
		sessionStorage.setItem("gq.firstName", "Ada");
		sessionStorage.setItem("gq.lastName", "Lovelace");
		const user = userEvent.setup();
		render(<McqStub />);
		await user.click(screen.getByRole("button", { name: /log out/i }));
		await vi.waitFor(() => {
			expect(sessionStorage.getItem("gq.userid")).toBeNull();
		});
		expect(sessionStorage.getItem("gq.username")).toBeNull();
		expect(sessionStorage.getItem("gq.firstName")).toBeNull();
		expect(sessionStorage.getItem("gq.lastName")).toBeNull();
	});

	it("log out navigates to /login", async () => {
		const user = userEvent.setup();
		render(<McqStub />);
		await user.click(screen.getByRole("button", { name: /log out/i }));
		await vi.waitFor(() => {
			expect(push).toHaveBeenCalledWith("/login");
		});
	});
});
