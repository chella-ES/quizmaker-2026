"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

type PreviewChoice = {
	choiceid: string;
	choiceText: string;
};

type LoadedQuestion = {
	name: string;
	question: string;
	choices: Array<PreviewChoice & { isCorrect?: boolean }>;
};

function subscribeNoop() {
	return () => {};
}

function getClientUserid() {
	return sessionStorage.getItem("gq.userid");
}

function getServerUserid() {
	return null;
}

export type McqPreviewProps = {
	qid: string;
};

export function McqPreview({ qid }: McqPreviewProps) {
	const userid = useSyncExternalStore(subscribeNoop, getClientUserid, getServerUserid);
	const [name, setName] = useState("");
	const [stem, setStem] = useState("");
	const [choices, setChoices] = useState<PreviewChoice[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [result, setResult] = useState<{ isCorrect: boolean } | null>(null);
	const [pending, setPending] = useState(false);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		let cancelled = false;
		fetch(`/api/mcq/${qid}`)
			.then(async (response) => {
				if (!response.ok) {
					throw new Error("Unable to load question.");
				}
				return (await response.json()) as LoadedQuestion;
			})
			.then((loadedQuestion) => {
				if (cancelled) {
					return;
				}
				setName(loadedQuestion.name);
				setStem(loadedQuestion.question);
				setChoices(
					loadedQuestion.choices.map((choice) => ({
						choiceid: choice.choiceid,
						choiceText: choice.choiceText,
					})),
				);
				setLoaded(true);
			})
			.catch(() => {
				if (cancelled) {
					return;
				}
				setLoadError("Unable to load question.");
			});
		return () => {
			cancelled = true;
		};
	}, [qid]);

	async function onSubmit() {
		setFormError(null);
		if (!selectedId) {
			setFormError("Select a choice.");
			return;
		}
		const currentUserid = sessionStorage.getItem("gq.userid");
		if (!currentUserid) {
			setFormError("You are not signed in.");
			return;
		}

		setPending(true);
		try {
			const response = await fetch(`/api/mcq/${qid}/attempts`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userid: currentUserid,
					choiceid: selectedId,
				}),
			});
			const payload = (await response.json().catch(() => ({}))) as {
				isCorrect?: boolean;
				error?: string;
			};
			if (!response.ok) {
				setFormError(payload.error ?? "Unable to record attempt.");
				return;
			}
			setResult({ isCorrect: Boolean(payload.isCorrect) });
		} finally {
			setPending(false);
		}
	}

	return (
		<Card className="mx-auto w-full max-w-2xl">
			<CardHeader>
				<CardTitle>{loaded ? name : "Preview question"}</CardTitle>
				<CardDescription>Answer as a taker would see this question.</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{userid ? null : (
					<p className="text-muted-foreground">
						You are not signed in.{" "}
						<Link href="/login" className="text-primary underline-offset-4 hover:underline">
							Log in
						</Link>
					</p>
				)}
				{loadError ? (
					<p role="alert" className="text-sm text-destructive">
						{loadError}
					</p>
				) : null}
				{loaded ? (
					<>
						<p>{stem}</p>
						<RadioGroup
							value={selectedId ?? ""}
							onValueChange={(value) => setSelectedId(value || null)}
							className="flex flex-col gap-3"
						>
							{choices.map((choice) => (
								<Field key={choice.choiceid} orientation="horizontal">
									<RadioGroupItem
										value={choice.choiceid}
										aria-label={choice.choiceText}
									/>
									<FieldLabel>{choice.choiceText}</FieldLabel>
								</Field>
							))}
						</RadioGroup>
					</>
				) : null}
				{result ? (
					<Badge variant={result.isCorrect ? "default" : "destructive"}>
						{result.isCorrect ? "Correct" : "Incorrect"}
					</Badge>
				) : null}
				{formError ? (
					<p role="alert" className="text-sm text-destructive">
						{formError}
					</p>
				) : null}
				<div className="flex flex-wrap gap-2">
					<Button type="button" onClick={() => void onSubmit()} disabled={pending}>
						Submit
					</Button>
					<Button type="button" variant="outline" render={<Link href="/mcq" />}>
						Back to list
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
