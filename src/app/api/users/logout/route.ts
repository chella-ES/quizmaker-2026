import { NextResponse } from "next/server";

export async function POST() {
	try {
		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json(
			{ error: "Unable to log out." },
			{ status: 500 },
		);
	}
}
