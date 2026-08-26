"use client";

import { hashPasswordForWire } from "@/lib/password";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type FieldKey = "username" | "password";

function isEmail(value: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LoginForm() {
	const router = useRouter();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setFormError(null);
		const nextErrors: Partial<Record<FieldKey, string>> = {};
		const trimmedUsername = username.trim();

		if (!trimmedUsername) {
			nextErrors.username = "Username is required";
		} else if (!isEmail(trimmedUsername)) {
			nextErrors.username = "Username must be a valid email";
		}
		if (!password) {
			nextErrors.password = "Password is required";
		} else if (password.length < 8) {
			nextErrors.password = "Password must be at least 8 characters";
		}

		setFieldErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) {
			return;
		}

		setPending(true);
		try {
			const wirePassword = await hashPasswordForWire(password);
			const response = await fetch("/api/users/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: trimmedUsername.toLowerCase(),
					password: wirePassword,
				}),
			});
			const payload = (await response.json().catch(() => ({}))) as {
				error?: string;
				userid?: string;
				username?: string;
				firstName?: string;
				lastName?: string;
				details?: Array<{ path: string; message: string }>;
			};

			if (response.status === 401) {
				setFormError("Invalid username or password.");
				return;
			}
			if (response.status === 400 && payload.details) {
				const fromServer: Partial<Record<FieldKey, string>> = {};
				for (const detail of payload.details) {
					if (detail.path === "username") {
						fromServer.username = detail.message;
					} else if (detail.path === "password") {
						fromServer.password = detail.message;
					}
				}
				setFieldErrors(fromServer);
				return;
			}
			if (!response.ok) {
				setFormError(payload.error ?? "Unable to log in.");
				return;
			}

			sessionStorage.setItem("gq.userid", payload.userid ?? "");
			sessionStorage.setItem("gq.username", payload.username ?? "");
			sessionStorage.setItem("gq.firstName", payload.firstName ?? "");
			sessionStorage.setItem("gq.lastName", payload.lastName ?? "");
			router.push("/mcq");
		} finally {
			setPending(false);
		}
	}

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader>
				<CardTitle>Log in</CardTitle>
				<CardDescription>
					Sign in to The Greenfield Quizmaker.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={onSubmit} className="flex flex-col gap-4">
					<FieldGroup>
						<Field data-invalid={Boolean(fieldErrors.username) || undefined}>
							<FieldLabel htmlFor="username">Username (email)</FieldLabel>
							<Input
								id="username"
								type="email"
								autoComplete="username"
								value={username}
								onChange={(event) => setUsername(event.target.value)}
							/>
							<FieldError errors={fieldErrors.username ? [{ message: fieldErrors.username }] : undefined} />
						</Field>
						<Field data-invalid={Boolean(fieldErrors.password) || undefined}>
							<FieldLabel htmlFor="password">Password</FieldLabel>
							<Input
								id="password"
								type="password"
								autoComplete="current-password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
							/>
							<FieldError errors={fieldErrors.password ? [{ message: fieldErrors.password }] : undefined} />
						</Field>
					</FieldGroup>
					{formError ? (
						<div role="alert" className="text-sm text-destructive">
							{formError}
						</div>
					) : null}
					<Button type="submit" disabled={pending}>
						Log in
					</Button>
					<p className="text-sm text-muted-foreground">
						Need an account?{" "}
						<Link href="/register" className="text-primary underline-offset-4 hover:underline">
							Register
						</Link>
					</p>
				</form>
			</CardContent>
		</Card>
	);
}
