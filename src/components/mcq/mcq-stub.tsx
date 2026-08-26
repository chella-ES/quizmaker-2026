"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

const DISPLAY_KEYS = ["gq.userid", "gq.username", "gq.firstName", "gq.lastName"] as const;

function clearDisplaySession() {
	for (const key of DISPLAY_KEYS) {
		sessionStorage.removeItem(key);
	}
}

function subscribeNoop() {
	return () => {};
}

function getClientFirstName() {
	return sessionStorage.getItem("gq.firstName");
}

function getServerFirstName() {
	return null;
}

function getIsClient() {
	return true;
}

function getIsServer() {
	return false;
}

export function McqStub() {
	const router = useRouter();
	const isClient = useSyncExternalStore(subscribeNoop, getIsClient, getIsServer);
	const firstName = useSyncExternalStore(
		subscribeNoop,
		getClientFirstName,
		getServerFirstName,
	);
	const [pending, setPending] = useState(false);

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
			{isClient && firstName ? (
				<p className="text-muted-foreground">Hello, {firstName}.</p>
			) : isClient ? (
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
