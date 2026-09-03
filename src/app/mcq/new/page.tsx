import { McqForm } from "@/components/mcq/mcq-form";

export default function NewMcqPage() {
	return (
		<main className="mx-auto flex min-h-screen w-full max-w-2xl items-start p-8">
			<McqForm mode="create" />
		</main>
	);
}
