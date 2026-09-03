import { RegisterForm } from "@/components/register/register-form";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push }),
}));

describe("RegisterForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("fetch", vi.fn());
	});

	it("register form shows username, first name, last name, password, and confirm password fields", () => {
		render(<RegisterForm />);
		expect(screen.getByLabelText(/username/i)).toBeTruthy();
		expect(screen.getByLabelText(/first name/i)).toBeTruthy();
		expect(screen.getByLabelText(/last name/i)).toBeTruthy();
		expect(screen.getByLabelText(/^password$/i)).toBeTruthy();
		expect(screen.getByLabelText(/confirm password/i)).toBeTruthy();
	});

	it("register form does not submit when required fields are empty", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);
		await user.click(screen.getByRole("button", { name: /register/i }));
		expect(fetch).not.toHaveBeenCalled();
		expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
	});

	it("register form does not submit when password is shorter than 8 characters", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);
		await user.type(screen.getByLabelText(/username/i), "ada@school.edu");
		await user.type(screen.getByLabelText(/first name/i), "Ada");
		await user.type(screen.getByLabelText(/last name/i), "Lovelace");
		await user.type(screen.getByLabelText(/^password$/i), "short");
		await user.type(screen.getByLabelText(/confirm password/i), "short");
		await user.click(screen.getByRole("button", { name: /register/i }));
		expect(fetch).not.toHaveBeenCalled();
	});

	it("register form does not submit when confirm password does not match", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);
		await user.type(screen.getByLabelText(/username/i), "ada@school.edu");
		await user.type(screen.getByLabelText(/first name/i), "Ada");
		await user.type(screen.getByLabelText(/last name/i), "Lovelace");
		await user.type(screen.getByLabelText(/^password$/i), "password1");
		await user.type(screen.getByLabelText(/confirm password/i), "password2");
		await user.click(screen.getByRole("button", { name: /register/i }));
		expect(fetch).not.toHaveBeenCalled();
	});

	it("register form does not submit when username is not an email", async () => {
		const user = userEvent.setup();
		render(<RegisterForm />);
		await user.type(screen.getByLabelText(/username/i), "not-an-email");
		await user.type(screen.getByLabelText(/first name/i), "Ada");
		await user.type(screen.getByLabelText(/last name/i), "Lovelace");
		await user.type(screen.getByLabelText(/^password$/i), "password1");
		await user.type(screen.getByLabelText(/confirm password/i), "password1");
		await user.click(screen.getByRole("button", { name: /register/i }));
		expect(fetch).not.toHaveBeenCalled();
	});

	it("successful submit POSTs to /api/users/register", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ userid: "1", username: "ada@school.edu" }), {
				status: 201,
				headers: { "Content-Type": "application/json" },
			}),
		);
		const user = userEvent.setup();
		render(<RegisterForm />);
		await user.type(screen.getByLabelText(/username/i), "ada@school.edu");
		await user.type(screen.getByLabelText(/first name/i), "Ada");
		await user.type(screen.getByLabelText(/last name/i), "Lovelace");
		await user.type(screen.getByLabelText(/^password$/i), "password1");
		await user.type(screen.getByLabelText(/confirm password/i), "password1");
		await user.click(screen.getByRole("button", { name: /register/i }));
		expect(fetch).toHaveBeenCalled();
		const [url, init] = vi.mocked(fetch).mock.calls[0];
		expect(String(url)).toContain("/api/users/register");
		expect((init as RequestInit).method).toBe("POST");
	});

	it("successful submit sends a 64-char hex password, not the typed plaintext", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ userid: "1" }), { status: 201 }),
		);
		const user = userEvent.setup();
		render(<RegisterForm />);
		await user.type(screen.getByLabelText(/username/i), "ada@school.edu");
		await user.type(screen.getByLabelText(/first name/i), "Ada");
		await user.type(screen.getByLabelText(/last name/i), "Lovelace");
		await user.type(screen.getByLabelText(/^password$/i), "password1");
		await user.type(screen.getByLabelText(/confirm password/i), "password1");
		await user.click(screen.getByRole("button", { name: /register/i }));
		const body = JSON.parse(String((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body));
		expect(body.password).toMatch(/^[0-9a-f]{64}$/);
		expect(body.password).not.toBe("password1");
	});

	it("successful submit does not send confirmPassword", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ userid: "1" }), { status: 201 }),
		);
		const user = userEvent.setup();
		render(<RegisterForm />);
		await user.type(screen.getByLabelText(/username/i), "ada@school.edu");
		await user.type(screen.getByLabelText(/first name/i), "Ada");
		await user.type(screen.getByLabelText(/last name/i), "Lovelace");
		await user.type(screen.getByLabelText(/^password$/i), "password1");
		await user.type(screen.getByLabelText(/confirm password/i), "password1");
		await user.click(screen.getByRole("button", { name: /register/i }));
		const body = JSON.parse(String((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body));
		expect(body).not.toHaveProperty("confirmPassword");
	});

	it("successful submit lowercases and trims the username", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ userid: "1" }), { status: 201 }),
		);
		const user = userEvent.setup();
		render(<RegisterForm />);
		await user.type(screen.getByLabelText(/username/i), "  Ada@School.EDU ");
		await user.type(screen.getByLabelText(/first name/i), "Ada");
		await user.type(screen.getByLabelText(/last name/i), "Lovelace");
		await user.type(screen.getByLabelText(/^password$/i), "password1");
		await user.type(screen.getByLabelText(/confirm password/i), "password1");
		await user.click(screen.getByRole("button", { name: /register/i }));
		const body = JSON.parse(String((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body));
		expect(body.username).toBe("ada@school.edu");
	});

	it("409 response shows that the username already exists", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(
				JSON.stringify({ error: "An account with this username already exists." }),
				{ status: 409, headers: { "Content-Type": "application/json" } },
			),
		);
		const user = userEvent.setup();
		render(<RegisterForm />);
		await user.type(screen.getByLabelText(/username/i), "ada@school.edu");
		await user.type(screen.getByLabelText(/first name/i), "Ada");
		await user.type(screen.getByLabelText(/last name/i), "Lovelace");
		await user.type(screen.getByLabelText(/^password$/i), "password1");
		await user.type(screen.getByLabelText(/confirm password/i), "password1");
		await user.click(screen.getByRole("button", { name: /register/i }));
		expect(
			await screen.findByText(/an account with this username already exists/i),
		).toBeTruthy();
	});

	it("400 details are shown on the matching fields", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(
				JSON.stringify({
					error: "Validation failed",
					details: [{ path: "firstName", message: "First name is too short" }],
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			),
		);
		const user = userEvent.setup();
		render(<RegisterForm />);
		await user.type(screen.getByLabelText(/username/i), "ada@school.edu");
		await user.type(screen.getByLabelText(/first name/i), "Ada");
		await user.type(screen.getByLabelText(/last name/i), "Lovelace");
		await user.type(screen.getByLabelText(/^password$/i), "password1");
		await user.type(screen.getByLabelText(/confirm password/i), "password1");
		await user.click(screen.getByRole("button", { name: /register/i }));
		expect(await screen.findByText(/first name is too short/i)).toBeTruthy();
	});

	it("has a link to log in", () => {
		render(<RegisterForm />);
		expect(screen.getByRole("link", { name: /log in/i })).toHaveProperty(
			"href",
			expect.stringMatching(/\/login$/),
		);
	});
});
