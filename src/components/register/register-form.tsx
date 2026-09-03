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

type FieldKey = "username" | "firstName" | "lastName" | "password" | "confirmPassword";

function isEmail(value: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function RegisterForm() {
	const router = useRouter();
	const [username, setUsername] = useState("");
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setFormError(null);
		const nextErrors: Partial<Record<FieldKey, string>> = {};
		const trimmedUsername = username.trim();
		const trimmedFirst = firstName.trim();
		const trimmedLast = lastName.trim();

		if (!trimmedUsername) {
			nextErrors.username = "Username is required";
		} else if (!isEmail(trimmedUsername)) {
			nextErrors.username = "Username must be a valid email";
		}
		if (!trimmedFirst) {
			nextErrors.firstName = "First name is required";
		}
		if (!trimmedLast) {
			nextErrors.lastName = "Last name is required";
		}
		if (!password) {
			nextErrors.password = "Password is required";
		} else if (password.length < 8) {
			nextErrors.password = "Password must be at least 8 characters";
		}
		if (!confirmPassword) {
			nextErrors.confirmPassword = "Confirm your password";
		} else if (confirmPassword !== password) {
			nextErrors.confirmPassword = "Passwords do not match";
		}

		setFieldErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) {
			return;
		}

		setPending(true);
		try {
			const wirePassword = await hashPasswordForWire(password);
			const response = await fetch("/api/users/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					username: trimmedUsername.toLowerCase(),
					firstName: trimmedFirst,
					lastName: trimmedLast,
					password: wirePassword,
				}),
			});
			const payload = (await response.json().catch(() => ({}))) as {
				error?: string;
				details?: Array<{ path: string; message: string }>;
			};

			if (response.status === 409) {
				setFormError(payload.error ?? "An account with this username already exists.");
				return;
			}
			if (response.status === 400 && payload.details) {
				const fromServer: Partial<Record<FieldKey, string>> = {};
				for (const detail of payload.details) {
					if (detail.path === "firstName") {
						fromServer.firstName = detail.message;
					} else if (detail.path === "lastName") {
						fromServer.lastName = detail.message;
					} else if (detail.path === "username") {
						fromServer.username = detail.message;
					} else if (detail.path === "password") {
						fromServer.password = detail.message;
					}
				}
				setFieldErrors(fromServer);
				return;
			}
			if (!response.ok) {
				setFormError(payload.error ?? "Unable to register user.");
				return;
			}
			router.push("/login");
		} finally {
			setPending(false);
		}
	}

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader>
				<CardTitle>Register</CardTitle>
				<CardDescription>
					Create a teacher account for The Greenfield Quizmaker.
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
						<Field data-invalid={Boolean(fieldErrors.firstName) || undefined}>
							<FieldLabel htmlFor="firstName">First name</FieldLabel>
							<Input
								id="firstName"
								value={firstName}
								onChange={(event) => setFirstName(event.target.value)}
							/>
							<FieldError errors={fieldErrors.firstName ? [{ message: fieldErrors.firstName }] : undefined} />
						</Field>
						<Field data-invalid={Boolean(fieldErrors.lastName) || undefined}>
							<FieldLabel htmlFor="lastName">Last name</FieldLabel>
							<Input
								id="lastName"
								value={lastName}
								onChange={(event) => setLastName(event.target.value)}
							/>
							<FieldError errors={fieldErrors.lastName ? [{ message: fieldErrors.lastName }] : undefined} />
						</Field>
						<Field data-invalid={Boolean(fieldErrors.password) || undefined}>
							<FieldLabel htmlFor="password">Password</FieldLabel>
							<Input
								id="password"
								type="password"
								autoComplete="new-password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
							/>
							<FieldError errors={fieldErrors.password ? [{ message: fieldErrors.password }] : undefined} />
						</Field>
						<Field data-invalid={Boolean(fieldErrors.confirmPassword) || undefined}>
							<FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
							<Input
								id="confirmPassword"
								type="password"
								autoComplete="new-password"
								value={confirmPassword}
								onChange={(event) => setConfirmPassword(event.target.value)}
							/>
							<FieldError
								errors={
									fieldErrors.confirmPassword
										? [{ message: fieldErrors.confirmPassword }]
										: undefined
								}
							/>
						</Field>
					</FieldGroup>
					{formError ? (
						<div role="alert" className="text-sm text-destructive">
							{formError}
						</div>
					) : null}
					<Button type="submit" disabled={pending}>
						Register
					</Button>
					<p className="text-sm text-muted-foreground">
						Already have an account?{" "}
						<Link href="/login" className="text-primary underline-offset-4 hover:underline">
							Log in
						</Link>
					</p>
				</form>
			</CardContent>
		</Card>
	);
}
