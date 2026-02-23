import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attempts, quizzes } from "@/lib/schema";
import { and, count, eq, isNotNull, sql } from "drizzle-orm";
import { scoreAttempt, type AnswerKey, type McqQuiz } from "@/lib/quizzes";

export const runtime = "nodejs";

function normName(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function normPhone(s: string) {
  const t = s.replace(/\D+/g, "");
  return t;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const quizId = String(body?.quizId || "").trim();
  const attemptId = String(body?.attemptId || "").trim();
  const cohort = String(body?.cohort || "").trim() || "cohort-3";
  const displayNameRaw = String(body?.displayName || "");
  const displayName = normName(displayNameRaw);
  const whatsappRaw = body?.whatsapp ? String(body.whatsapp).trim() : "";
  const whatsapp = whatsappRaw ? normPhone(whatsappRaw) : null;

  const startedAt = Number(body?.startedAt);
  const endsAt = Number(body?.endsAt);
  const submittedAtMs = Date.now();

  const answers = body?.answers && typeof body.answers === "object" ? (body.answers as Record<string, number>) : {};

  if (!quizId || !attemptId || !Number.isFinite(startedAt) || !Number.isFinite(endsAt)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const timedOut = submittedAtMs > endsAt;
  const durationMs = Math.max(0, Math.min(submittedAtMs, endsAt) - startedAt);

  const qRows = await db
    .select({ content: quizzes.content, answerKey: quizzes.answerKey })
    .from(quizzes)
    .where(eq(quizzes.quizId, quizId))
    .limit(1);
  const quiz = qRows[0]?.content as McqQuiz | null | undefined;
  const key = qRows[0]?.answerKey as AnswerKey | null | undefined;
  if (!quiz || !key) return NextResponse.json({ error: "Quiz not configured" }, { status: 500 });

  let scored;
  try {
    scored = scoreAttempt({ quiz, answerKey: key, answers });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Scoring failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const participantKey = whatsapp ? `wa:${whatsapp}` : displayName ? `name:${displayName.toLowerCase()}` : null;

  // Update attempt row
  await db
    .update(attempts)
    .set({
      cohort,
      participantKey,
      displayName: displayName || null,
      whatsapp,
      submittedAt: new Date(submittedAtMs),
      durationMs,
      timedOut,
      correct: scored.correct,
      total: scored.total,
      scorePct: scored.scorePct,
      answers,
    })
    .where(eq(attempts.attemptId, attemptId));

  // Rank within quiz+cohort among submitted attempts
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
