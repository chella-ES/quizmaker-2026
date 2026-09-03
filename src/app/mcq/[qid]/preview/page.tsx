import { McqPreview } from "@/components/mcq/mcq-preview";

export default async function PreviewMcqPage({
	params,
}: {
	params: Promise<{ qid: string }>;
}) {
	const { qid } = await params;
	return (
		<main className="mx-auto flex min-h-screen w-full max-w-2xl items-start p-8">
			<McqPreview qid={qid} />
		</main>
	);
}
