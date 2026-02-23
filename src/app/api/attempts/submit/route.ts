import { NextResponse } from "next/server";
import { scoreAttempt } from "@/lib/quizzes";
import { db } from "@/lib/db";
import { attempts } from "@/lib/schema";
import { and, count, eq, isNotNull, sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const quizId = String(body?.quizId || "").trim();
  const attemptId = String(body?.attemptId || "").trim();
  const cohort = String(body?.cohort || "").trim() || "cohort-1";
  const displayName = String(body?.displayName || "").trim();
  const whatsapp = body?.whatsapp ? String(body.whatsapp).trim() : null;

  const startedAt = Number(body?.startedAt);
  const endsAt = Number(body?.endsAt);
  const submittedAtMs = Date.now();

  const answers = body?.answers && typeof body.answers === "object" ? (body.answers as Record<string, number>) : {};

  if (!quizId || !attemptId || !Number.isFinite(startedAt) || !Number.isFinite(endsAt)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const timedOut = submittedAtMs > endsAt;
  const durationMs = Math.max(0, Math.min(submittedAtMs, endsAt) - startedAt);

  let scored;
  try {
    scored = scoreAttempt({ quizId, answers });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Scoring failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Update attempt row
  await db
    .update(attempts)
    .set({
      cohort,
      displayName: displayName || null,
      whatsapp,
      submittedAt: new Date(submittedAtMs),
      durationMs,
      timedOut,
      correct: scored.correct,
      total: scored.total,
      scorePct: scored.scorePct,
    })
    .where(eq(attempts.attemptId, attemptId));

  // Rank within quiz+cohort for now: among submitted attempts.
  // position = 1 + count(attempts with (score_pct > mine) OR (score_pct = mine AND duration_ms < mine))
  const mineScore = scored.scorePct;

  const betterCount = await db
    .select({ c: count() })
    .from(attempts)
    .where(
      and(
        eq(attempts.quizId, quizId),
        eq(attempts.cohort, cohort),
        isNotNull(attempts.submittedAt),
        sql`(score_pct > ${mineScore} OR (score_pct = ${mineScore} AND duration_ms < ${durationMs}))`
      )
    );

  const totalCount = await db
    .select({ c: count() })
    .from(attempts)
    .where(and(eq(attempts.quizId, quizId), eq(attempts.cohort, cohort), isNotNull(attempts.submittedAt)));

  const rank = {
    position: Number(betterCount[0]?.c || 0) + 1,
    total: Number(totalCount[0]?.c || 1),
  };

  return NextResponse.json({
    attemptId,
    quizId,
    cohort,
    displayName,
    whatsapp,
    startedAt,
    endsAt,
    submittedAt: submittedAtMs,
    timedOut,
    durationMs,
    correct: scored.correct,
    total: scored.total,
    scorePct: scored.scorePct,
    rank,
  });
}
