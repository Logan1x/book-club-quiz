import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const quizId = String(body?.quizId || "").trim();
  const cohort = String(body?.cohort || "").trim();

  if (!quizId) {
    return NextResponse.json({ error: "quizId is required" }, { status: 400 });
  }

  const attemptId = nanoid();
  const startedAt = Date.now();
  const durationSec = 6 * 60;
  const endsAt = startedAt + durationSec * 1000;

  return NextResponse.json({ attemptId, quizId, cohort, startedAt, endsAt, durationSec });
}
