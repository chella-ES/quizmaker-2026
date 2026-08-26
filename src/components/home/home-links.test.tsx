import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeLinks } from "@/components/home/home-links";

describe("HomeLinks", () => {
	it("home shows the product name The Greenfield Quizmaker", () => {
		render(<HomeLinks />);
		expect(
			screen.getByRole("heading", { name: /the greenfield quizmaker/i }),
		).toBeTruthy();
	});

	it("home has a Register link to /register", () => {
		render(<HomeLinks />);
		expect(screen.getByRole("link", { name: /register/i })).toHaveProperty(
			"href",
			expect.stringMatching(/\/register$/),
		);
	});

	it("home has a Log in link to /login", () => {
		render(<HomeLinks />);
		expect(screen.getByRole("link", { name: /log in/i })).toHaveProperty(
			"href",
			expect.stringMatching(/\/login$/),
		);
	});
});
