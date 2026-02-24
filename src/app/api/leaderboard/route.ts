import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const quizId = String(searchParams.get("quizId") || "").trim();
  const cohort = String(searchParams.get("cohort") || "").trim() || "cohort-1";
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 50)));

  if (!quizId) {
    return NextResponse.json({ error: "quizId is required" }, { status: 400 });
  }

  // Best attempt per person (participant_key). If participant_key is null, fall back to attempt_id.
  // Postgres DISTINCT ON picks the first row per key based on the ORDER BY.
  const rows = await db.execute(
    sql`
      SELECT DISTINCT ON (COALESCE(participant_key, attempt_id))
        attempt_id AS "attemptId",
        display_name AS "displayName",
        whatsapp AS "whatsapp",
        correct AS "correct",
        total AS "total",
        score_pct AS "scorePct",
        duration_ms AS "durationMs",
        submitted_at AS "submittedAt"
      FROM attempts
      WHERE quiz_id = ${quizId} AND cohort = ${cohort} AND submitted_at IS NOT NULL
      ORDER BY
        COALESCE(participant_key, attempt_id),
        score_pct DESC,
        duration_ms ASC,
        submitted_at ASC
      LIMIT ${limit};
    `
  );

  type LbRow = {
    attemptId: string;
    displayName: string | null;
    whatsapp: string | null;
    correct: number | null;
    total: number | null;
    scorePct: number | null;
    durationMs: number | null;
    submittedAt: string | null;
  };

  const sorted = (rows as unknown as { rows: LbRow[] }).rows.sort((a, b) => {
    const s = (b.scorePct ?? 0) - (a.scorePct ?? 0);
    if (s !== 0) return s;
    const t = (a.durationMs ?? 0) - (b.durationMs ?? 0);
    if (t !== 0) return t;
    return new Date(a.submittedAt ?? 0).getTime() - new Date(b.submittedAt ?? 0).getTime();
  });

  const leaderboard = sorted.map((r, i) => ({
    rank: i + 1,
    attemptId: r.attemptId,
    displayName: r.displayName,
    whatsapp: r.whatsapp,
    correct: r.correct,
    total: r.total,
    scorePct: r.scorePct,
    durationMs: r.durationMs,
    submittedAt: r.submittedAt ? new Date(r.submittedAt).getTime() : null,
  }));

  return NextResponse.json({ quizId, cohort, leaderboard });
}
