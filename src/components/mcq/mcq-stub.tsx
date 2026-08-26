"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const DISPLAY_KEYS = ["gq.userid", "gq.username", "gq.firstName", "gq.lastName"] as const;

function clearDisplaySession() {
	for (const key of DISPLAY_KEYS) {
		sessionStorage.removeItem(key);
	}
}

export function McqStub() {
	const router = useRouter();
	const [firstName, setFirstName] = useState<string | null>(null);
	const [sessionChecked, setSessionChecked] = useState(false);
	const [pending, setPending] = useState(false);

	useEffect(() => {
		setFirstName(sessionStorage.getItem("gq.firstName"));
		setSessionChecked(true);
	}, []);

	async function onLogout() {
		setPending(true);
		try {
			await fetch("/api/users/logout", { method: "POST" });
		} finally {
			clearDisplaySession();
			router.push("/login");
			setPending(false);
		}
	}

	return (
		<main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-8">
			<h1 className="text-3xl font-semibold text-foreground">
				Create multiple-choice questions
			</h1>
			{sessionChecked && firstName ? (
				<p className="text-muted-foreground">Hello, {firstName}.</p>
			) : sessionChecked ? (
				<p className="text-muted-foreground">
					You are not signed in.{" "}
					<Link href="/login" className="text-primary underline-offset-4 hover:underline">
						Log in
					</Link>
				</p>
			) : null}
			<p className="text-muted-foreground">
				Question authoring comes in a later sprint. This page is an empty landing
				place after login.
			</p>
			<Button type="button" variant="outline" onClick={onLogout} disabled={pending}>
				Log out
			</Button>
		</main>
	);
}
