import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { attempts, cohortQuizzes, quizzes } from "@/lib/schema";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const quizId = String(body?.quizId || "").trim();
  const cohort = String(body?.cohort || "").trim() || "cohort-3";

  if (!quizId) {
    return NextResponse.json({ error: "quizId is required" }, { status: 400 });
  }

  // ensure quiz exists
  const qRows = await db.select({ durationSec: quizzes.durationSec }).from(quizzes).where(eq(quizzes.quizId, quizId)).limit(1);
  if (!qRows[0]) {
    return NextResponse.json({ error: "Quiz not seeded yet" }, { status: 400 });
  }

  // ensure cohort has access to quiz
  const map = await db
    .select({ quizId: cohortQuizzes.quizId })
    .from(cohortQuizzes)
    .where(and(eq(cohortQuizzes.cohortCode, cohort), eq(cohortQuizzes.quizId, quizId)))
    .limit(1);
  if (!map[0]) {
    return NextResponse.json({ error: "Quiz not enabled for this cohort" }, { status: 403 });
  }

  const attemptId = nanoid();
  const startedAtMs = Date.now();
  const durationSec = qRows[0].durationSec ?? 360;
  const endsAtMs = startedAtMs + durationSec * 1000;

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
