import { NextResponse } from "next/server";
import { registerWithBackend } from "@/lib/backend";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await registerWithBackend(body.username, body.password);

  if (!result.response.ok) {
    return NextResponse.json(
      { error: result.body?.detail || "Unable to create account." },
      { status: result.response.status }
    );
  }

  return NextResponse.json({ ok: true }, { status: result.response.status });
}
