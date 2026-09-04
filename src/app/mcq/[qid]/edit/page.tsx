import { McqForm } from "@/components/mcq/mcq-form";

export default async function EditMcqPage({
	params,
}: {
	params: Promise<{ qid: string }>;
}) {
	const { qid } = await params;
	return (
		<main className="mx-auto flex min-h-screen w-full max-w-3xl items-start p-8">
			<McqForm mode="edit" qid={qid} />
		</main>
	);
}
