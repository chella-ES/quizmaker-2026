import Link from "next/link";

export function HomeLinks() {
	return (
		<main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-8">
			<h1 className="text-3xl font-semibold text-foreground">
				The Greenfield Quizmaker
			</h1>
			<p className="text-muted-foreground">
				Teachers create and collaborate on a multiple-choice question test bank.
			</p>
			<div className="flex gap-3">
				<Link
					href="/register"
					className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
				>
					Register
				</Link>
				<Link
					href="/login"
					className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium"
				>
					Log in
				</Link>
			</div>
		</main>
	);
}
