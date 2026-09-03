"use client";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";

type McqFormMode = "create" | "edit";

type DraftChoice = {
	key: string;
	text: string;
};

type LoadedQuestion = {
	qid: string;
	name: string;
	question: string;
	choices: Array<{
		choiceid: string;
		choiceText: string;
		isCorrect: boolean;
	}>;
};

type FieldErrors = {
	name?: string;
	question?: string;
	choices?: string;
	choiceTexts?: Array<string | undefined>;
};

export type McqFormProps = {
	mode: McqFormMode;
	qid?: string;
};

function emptyChoices(): DraftChoice[] {
	return [
		{ key: crypto.randomUUID(), text: "" },
		{ key: crypto.randomUUID(), text: "" },
	];
}

export function McqForm({ mode, qid }: McqFormProps) {
	const router = useRouter();
	const correctGroupId = useId();
	const [name, setName] = useState("");
	const [question, setQuestion] = useState("");
	const [choices, setChoices] = useState<DraftChoice[]>(emptyChoices);
	const [correctKey, setCorrectKey] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const [loadState, setLoadState] = useState<"ready" | "loading" | "not-found" | "error">(
		mode === "edit" ? "loading" : "ready",
	);

	useEffect(() => {
		if (mode !== "edit" || !qid) {
			return;
		}
		let cancelled = false;
		fetch(`/api/mcq/${qid}`)
			.then(async (response) => {
				if (response.status === 404) {
					return { kind: "not-found" as const };
				}
				if (!response.ok) {
					throw new Error("Unable to load question.");
				}
				const loaded = (await response.json()) as LoadedQuestion;
				return { kind: "ok" as const, loaded };
			})
			.then((result) => {
				if (cancelled) {
					return;
				}
				if (result.kind === "not-found") {
					setLoadState("not-found");
					return;
				}
				const loaded = result.loaded;
				setName(loaded.name);
				setQuestion(loaded.question);
				setChoices(
					loaded.choices.map((choice) => ({
						key: choice.choiceid,
						text: choice.choiceText,
					})),
				);
				setCorrectKey(
					loaded.choices.find((choice) => choice.isCorrect)?.choiceid ?? null,
				);
				setLoadState("ready");
			})
			.catch(() => {
				if (cancelled) {
					return;
				}
				setLoadState("error");
			});
		return () => {
			cancelled = true;
		};
	}, [mode, qid]);

	function validate(): FieldErrors {
		const next: FieldErrors = { choiceTexts: [] };
		if (!name.trim()) {
			next.name = "Name is required";
		}
		if (!question.trim()) {
			next.question = "Question is required";
		}
		const choiceTexts = choices.map((choice) =>
			choice.text.trim() ? undefined : "Choice text is required",
		);
		if (choiceTexts.some(Boolean)) {
			next.choiceTexts = choiceTexts;
		}
		if (!correctKey || !choices.some((choice) => choice.key === correctKey)) {
			next.choices = "Select exactly one correct choice";
		}
		return next;
	}

	function hasErrors(errors: FieldErrors) {
		return Boolean(
			errors.name ||
				errors.question ||
				errors.choices ||
				errors.choiceTexts?.some(Boolean),
		);
	}

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setFormError(null);
		const nextErrors = validate();
		setFieldErrors(nextErrors);
		if (hasErrors(nextErrors)) {
			return;
		}

		setPending(true);
		try {
			const url = mode === "edit" && qid ? `/api/mcq/${qid}` : "/api/mcq";
			const response = await fetch(url, {
				method: mode === "edit" ? "PUT" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					question: question.trim(),
					choices: choices.map((choice) => ({
						choiceText: choice.text.trim(),
						isCorrect: choice.key === correctKey,
					})),
				}),
			});
			const payload = (await response.json().catch(() => ({}))) as {
				error?: string;
				details?: Array<{ path: string; message: string }>;
			};

			if (response.status === 400 && payload.details) {
				const fromServer: FieldErrors = { choiceTexts: [] };
				for (const detail of payload.details) {
					if (detail.path === "name") {
						fromServer.name = detail.message;
					} else if (detail.path === "question") {
						fromServer.question = detail.message;
					} else if (detail.path === "choices") {
						fromServer.choices = detail.message;
					} else {
						const match = /^choices\.(\d+)/.exec(detail.path);
						if (match) {
							const index = Number(match[1]);
							const texts = fromServer.choiceTexts ?? [];
							texts[index] = detail.message;
							fromServer.choiceTexts = texts;
						}
					}
				}
				setFieldErrors(fromServer);
				return;
			}
			if (!response.ok) {
				setFormError(payload.error ?? "Unable to save question.");
				return;
			}
			router.push("/mcq");
		} finally {
			setPending(false);
		}
	}

	function addChoice() {
		if (choices.length >= 6) {
			return;
		}
		setChoices([...choices, { key: crypto.randomUUID(), text: "" }]);
	}

	function removeChoice(key: string) {
		if (choices.length <= 2) {
			return;
		}
		setChoices(choices.filter((choice) => choice.key !== key));
		if (correctKey === key) {
			setCorrectKey(null);
		}
	}

	if (loadState === "not-found") {
		return (
			<Card className="mx-auto w-full max-w-2xl">
				<CardHeader>
					<CardTitle>Question not found</CardTitle>
					<CardDescription>This question is not in the bank.</CardDescription>
				</CardHeader>
				<CardContent>
					<Link href="/mcq" className="text-primary underline-offset-4 hover:underline">
						Back to list
					</Link>
				</CardContent>
			</Card>
		);
	}

	if (loadState === "loading") {
		return <p className="text-muted-foreground">Loading question…</p>;
	}

	if (loadState === "error") {
		return (
			<div className="flex flex-col gap-4">
				<p role="alert" className="text-sm text-destructive">
					Unable to load question.
				</p>
				<Link href="/mcq" className="text-primary underline-offset-4 hover:underline">
					Back to list
				</Link>
			</div>
		);
	}

	return (
		<Card className="mx-auto w-full max-w-2xl">
			<CardHeader>
				<CardTitle>{mode === "edit" ? "Edit question" : "Create question"}</CardTitle>
				<CardDescription>
					Name the question, write the stem, and mark exactly one correct choice.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={onSubmit} className="flex flex-col gap-4">
					<FieldGroup>
						<Field data-invalid={Boolean(fieldErrors.name) || undefined}>
							<FieldLabel htmlFor="name">Name</FieldLabel>
							<Input
								id="name"
								value={name}
								onChange={(event) => setName(event.target.value)}
							/>
							<FieldError
								errors={fieldErrors.name ? [{ message: fieldErrors.name }] : undefined}
							/>
						</Field>
						<Field data-invalid={Boolean(fieldErrors.question) || undefined}>
							<FieldLabel htmlFor="question">Question</FieldLabel>
							<Textarea
								id="question"
								value={question}
								onChange={(event) => setQuestion(event.target.value)}
							/>
							<FieldError
								errors={
									fieldErrors.question ? [{ message: fieldErrors.question }] : undefined
								}
							/>
						</Field>
					</FieldGroup>
					<RadioGroup
						id={correctGroupId}
						value={correctKey ?? ""}
						onValueChange={(value) => setCorrectKey(value || null)}
						className="flex flex-col gap-4"
					>
						{choices.map((choice, index) => {
							const choiceId = `choice-${index + 1}`;
							const choiceError = fieldErrors.choiceTexts?.[index];
							return (
								<Field
									key={choice.key}
									data-invalid={Boolean(choiceError) || undefined}
								>
									<FieldLabel htmlFor={choiceId}>Choice {index + 1}</FieldLabel>
									<div className="flex flex-wrap items-center gap-2">
										<Input
											id={choiceId}
											value={choice.text}
											onChange={(event) => {
												const next = [...choices];
												next[index] = { ...choice, text: event.target.value };
												setChoices(next);
											}}
										/>
										<RadioGroupItem
											value={choice.key}
											aria-label={`Choice ${index + 1} is correct`}
										/>
										<Button
											type="button"
											variant="outline"
											onClick={() => removeChoice(choice.key)}
											disabled={choices.length <= 2}
										>
											Remove choice
										</Button>
									</div>
									<FieldError
										errors={choiceError ? [{ message: choiceError }] : undefined}
									/>
								</Field>
							);
						})}
					</RadioGroup>
					{fieldErrors.choices ? (
						<div role="alert" className="text-sm text-destructive">
							{fieldErrors.choices}
						</div>
					) : null}
					{formError ? (
						<div role="alert" className="text-sm text-destructive">
							{formError}
						</div>
					) : null}
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={addChoice}
							disabled={choices.length >= 6}
						>
							Add choice
						</Button>
						<Button type="submit" disabled={pending}>
							Save
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => router.push("/mcq")}
						>
							Cancel
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
