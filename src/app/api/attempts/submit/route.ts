import { NextResponse } from "next/server";
import { scoreAttempt } from "@/lib/quizzes";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const quizId = String(body?.quizId || "").trim();
  const attemptId = String(body?.attemptId || "").trim();
  const cohort = String(body?.cohort || "").trim();
  const displayName = String(body?.displayName || "").trim();
  const whatsapp = body?.whatsapp ? String(body.whatsapp).trim() : null;

  const startedAt = Number(body?.startedAt);
  const endsAt = Number(body?.endsAt);
  const submittedAt = Date.now();

  const answers = (body?.answers && typeof body.answers === "object") ? (body.answers as Record<string, number>) : {};

  if (!quizId || !attemptId || !Number.isFinite(startedAt) || !Number.isFinite(endsAt)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const timedOut = submittedAt > endsAt;
  const durationMs = Math.max(0, Math.min(submittedAt, endsAt) - startedAt);

  let scored;
  try {
    scored = scoreAttempt({ quizId, answers });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Scoring failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // MVP (no DB yet): rank is always 1/1. We'll replace with Neon leaderboard.
  const rank = { position: 1, total: 1 };

  return NextResponse.json({
    attemptId,
    quizId,
    cohort,
    displayName,
    whatsapp,
    startedAt,
    endsAt,
    submittedAt,
    timedOut,
    durationMs,
    correct: scored.correct,
    total: scored.total,
    scorePct: scored.scorePct,
    rank,
  });
}
