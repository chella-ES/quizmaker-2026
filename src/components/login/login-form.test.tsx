import { LoginForm } from "@/components/login/login-form";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push }),
}));

const publicUser = {
	userid: "550e8400-e29b-41d4-a716-446655440000",
	username: "teacher@school.edu",
	firstName: "Ada",
	lastName: "Lovelace",
};

async function fillValidLogin(user: ReturnType<typeof userEvent.setup>) {
	await user.type(screen.getByLabelText(/username/i), "teacher@school.edu");
	await user.type(screen.getByLabelText(/^password$/i), "password1");
}

describe("LoginForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("fetch", vi.fn());
		sessionStorage.clear();
	});

	it("login form shows username and password fields", () => {
		render(<LoginForm />);
		expect(screen.getByLabelText(/username/i)).toBeTruthy();
		expect(screen.getByLabelText(/^password$/i)).toBeTruthy();
	});

	it("login form does not submit when fields are empty", async () => {
		const user = userEvent.setup();
		render(<LoginForm />);
		await user.click(screen.getByRole("button", { name: /log in/i }));
		expect(fetch).not.toHaveBeenCalled();
	});

	it("login form does not submit when username is not an email", async () => {
		const user = userEvent.setup();
		render(<LoginForm />);
		await user.type(screen.getByLabelText(/username/i), "not-an-email");
		await user.type(screen.getByLabelText(/^password$/i), "password1");
		await user.click(screen.getByRole("button", { name: /log in/i }));
		expect(fetch).not.toHaveBeenCalled();
	});

	it("successful login POSTs to /api/users/login with a 64-char hex password", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify(publicUser), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);
		const user = userEvent.setup();
		render(<LoginForm />);
		await fillValidLogin(user);
		await user.click(screen.getByRole("button", { name: /log in/i }));
		expect(fetch).toHaveBeenCalled();
		const [url, init] = vi.mocked(fetch).mock.calls[0];
		expect(String(url)).toContain("/api/users/login");
		expect((init as RequestInit).method).toBe("POST");
		const body = JSON.parse(String((init as RequestInit).body));
		expect(body.password).toMatch(/^[0-9a-f]{64}$/);
		expect(body.password).not.toBe("password1");
	});

	it("successful login stores display fields in sessionStorage", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify(publicUser), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);
		const user = userEvent.setup();
		render(<LoginForm />);
		await fillValidLogin(user);
		await user.click(screen.getByRole("button", { name: /log in/i }));
		await vi.waitFor(() => {
			expect(sessionStorage.getItem("gq.userid")).toBe(publicUser.userid);
		});
		expect(sessionStorage.getItem("gq.username")).toBe(publicUser.username);
		expect(sessionStorage.getItem("gq.firstName")).toBe(publicUser.firstName);
		expect(sessionStorage.getItem("gq.lastName")).toBe(publicUser.lastName);
	});

	it("successful login navigates to /mcq", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify(publicUser), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			}),
		);
		const user = userEvent.setup();
		render(<LoginForm />);
		await fillValidLogin(user);
		await user.click(screen.getByRole("button", { name: /log in/i }));
		await vi.waitFor(() => {
			expect(push).toHaveBeenCalledWith("/mcq");
		});
	});

	it("401 shows Invalid username or password", async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response(JSON.stringify({ error: "Invalid username or password." }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			}),
		);
		const user = userEvent.setup();
		render(<LoginForm />);
		await fillValidLogin(user);
		await user.click(screen.getByRole("button", { name: /log in/i }));
		expect(await screen.findByText("Invalid username or password.")).toBeTruthy();
		expect(screen.queryByText(/user not found/i)).toBeNull();
	});

	it("has a link to register", () => {
		render(<LoginForm />);
		expect(screen.getByRole("link", { name: /register/i })).toHaveProperty(
			"href",
			expect.stringMatching(/\/register$/),
		);
	});
});
