import { McqStub } from "@/components/mcq/mcq-stub";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push }),
}));

describe("McqStub", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("fetch", vi.fn());
		sessionStorage.clear();
	});

	it("mcq stub heading describes multiple-choice question creation", () => {
		render(<McqStub />);
		expect(
			screen.getByRole("heading", { name: /multiple-choice question/i }),
		).toBeTruthy();
		expect(screen.queryByRole("textbox")).toBeNull();
		expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
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
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);
		sessionStorage.setItem("gq.userid", "550e8400-e29b-41d4-a716-446655440000");
		sessionStorage.setItem("gq.username", "teacher@school.edu");
		sessionStorage.setItem("gq.firstName", "Ada");
		sessionStorage.setItem("gq.lastName", "Lovelace");
		const user = userEvent.setup();
		render(<McqStub />);
		await user.click(screen.getByRole("button", { name: /log out/i }));
		await vi.waitFor(() => {
			expect(fetch).toHaveBeenCalled();
		});
		const [url, init] = vi.mocked(fetch).mock.calls[0];
		expect(String(url)).toContain("/api/users/logout");
		expect((init as RequestInit).method).toBe("POST");
	});

	it("log out clears sessionStorage display keys", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), { status: 200 }),
		);
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
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ ok: true }), { status: 200 }),
		);
		const user = userEvent.setup();
		render(<McqStub />);
		await user.click(screen.getByRole("button", { name: /log out/i }));
		await vi.waitFor(() => {
			expect(push).toHaveBeenCalledWith("/login");
		});
	});
});
