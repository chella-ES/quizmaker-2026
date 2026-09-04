"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { EllipsisVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

const DISPLAY_KEYS = ["gq.userid", "gq.username", "gq.firstName", "gq.lastName"] as const;

type QuestionSummary = {
	qid: string;
	name: string;
	question: string;
	createdAt: string;
	updatedAt: string;
};

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
	const [questions, setQuestions] = useState<QuestionSummary[]>([]);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [pendingDelete, setPendingDelete] = useState<QuestionSummary | null>(null);
	const [deleting, setDeleting] = useState(false);

	async function fetchQuestionList() {
		const response = await fetch("/api/mcq");
		if (!response.ok) {
			throw new Error("Unable to list questions.");
		}
		const json = (await response.json()) as { questions?: QuestionSummary[] };
		return json.questions ?? [];
	}

	useEffect(() => {
		let cancelled = false;
		fetch("/api/mcq")
			.then((response) => {
				if (!response.ok) {
					throw new Error("Unable to list questions.");
				}
				return response.json() as Promise<{ questions?: QuestionSummary[] }>;
			})
			.then((json) => {
				if (cancelled) {
					return;
				}
				setQuestions(json.questions ?? []);
				setLoadError(null);
			})
			.catch(() => {
				if (cancelled) {
					return;
				}
				setLoadError("Unable to list questions.");
			});
		return () => {
			cancelled = true;
		};
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

	async function confirmDelete() {
		if (!pendingDelete) {
			return;
		}
		setDeleting(true);
		try {
			const response = await fetch(`/api/mcq/${pendingDelete.qid}`, {
				method: "DELETE",
			});
			if (!response.ok) {
				throw new Error("Unable to delete question.");
			}
			setPendingDelete(null);
			setQuestions(await fetchQuestionList());
		} catch {
			setLoadError("Unable to delete question.");
		} finally {
			setDeleting(false);
		}
	}

	return (
		<main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 p-8">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<h1 className="text-3xl font-semibold text-foreground">
					Create multiple-choice questions
				</h1>
				<Button render={<Link href="/mcq/new" />}>Create</Button>
			</div>
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
			{loadError ? <p className="text-destructive">{loadError}</p> : null}
			{questions.length === 0 && !loadError ? (
				<p className="text-muted-foreground">No questions yet.</p>
			) : null}
			{questions.length > 0 ? (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Description</TableHead>
							<TableHead>Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{questions.map((question) => (
							<TableRow key={question.qid}>
								<TableCell>{question.name}</TableCell>
								<TableCell className="max-w-md truncate">{question.question}</TableCell>
								<TableCell>
									<DropdownMenu>
										<DropdownMenuTrigger
											render={
												<Button
													variant="ghost"
													size="icon"
													aria-label="Actions"
												/>
											}
										>
											<EllipsisVertical />
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem
												onClick={() => router.push(`/mcq/${question.qid}/edit`)}
											>
												Edit
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() =>
													router.push(`/mcq/${question.qid}/preview`)
												}
											>
												Preview
											</DropdownMenuItem>
											<DropdownMenuItem
												variant="destructive"
												onClick={() => setPendingDelete(question)}
											>
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			) : null}
			<Button type="button" variant="outline" onClick={onLogout} disabled={pending}>
				Log out
			</Button>
			<Dialog
				open={pendingDelete !== null}
				onOpenChange={(open) => {
					if (!open) {
						setPendingDelete(null);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete this question?</DialogTitle>
						<DialogDescription>
							This permanently deletes the question, its choices, and its attempts.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setPendingDelete(null)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={() => void confirmDelete()}
							disabled={deleting}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</main>
	);
}
