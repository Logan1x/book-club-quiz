import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attempts } from "@/lib/schema";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const quizId = String(searchParams.get("quizId") || "").trim();
  const cohort = String(searchParams.get("cohort") || "").trim() || "cohort-1";
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 50)));

  if (!quizId) {
    return NextResponse.json({ error: "quizId is required" }, { status: 400 });
  }

  // For MVP: show ALL submitted attempts (not deduped per person).
  // We'll later switch to "best attempt per (name+whatsapp)".
  const rows = await db
    .select({
      attemptId: attempts.attemptId,
      displayName: attempts.displayName,
      whatsapp: attempts.whatsapp,
      correct: attempts.correct,
      total: attempts.total,
      scorePct: attempts.scorePct,
      durationMs: attempts.durationMs,
      submittedAt: attempts.submittedAt,
    })
    .from(attempts)
    .where(and(eq(attempts.quizId, quizId), eq(attempts.cohort, cohort), isNotNull(attempts.submittedAt)))
    .orderBy(desc(attempts.scorePct), asc(attempts.durationMs), asc(attempts.submittedAt))
    .limit(limit);

  const leaderboard = rows.map((r, i) => ({
    rank: i + 1,
    attemptId: r.attemptId,
    displayName: r.displayName,
    whatsapp: r.whatsapp,
    correct: r.correct,
    total: r.total,
    scorePct: r.scorePct,
    durationMs: r.durationMs,
    submittedAt: r.submittedAt ? r.submittedAt.getTime() : null,
  }));

  return NextResponse.json({ quizId, cohort, leaderboard });
}
