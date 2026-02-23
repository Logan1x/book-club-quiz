import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { attempts, quizzes } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const quizId = String(body?.quizId || "").trim();
  const cohort = String(body?.cohort || "").trim() || "cohort-1";

  if (!quizId) {
    return NextResponse.json({ error: "quizId is required" }, { status: 400 });
  }

  const attemptId = nanoid();
  const startedAtMs = Date.now();
  const durationSec = 6 * 60;
  const endsAtMs = startedAtMs + durationSec * 1000;

  // Ensure quiz row exists (minimal metadata for now)
  await db
    .insert(quizzes)
    .values({ quizId, title: quizId, durationSec })
    .onConflictDoNothing({ target: quizzes.quizId });

  await db.insert(attempts).values({
    attemptId,
    quizId,
    cohort,
    startedAt: new Date(startedAtMs),
    endsAt: new Date(endsAtMs),
  });

  return NextResponse.json({
    attemptId,
    quizId,
    cohort,
    startedAt: startedAtMs,
    endsAt: endsAtMs,
    durationSec,
  });
}
