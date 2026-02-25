import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const quizId = String(searchParams.get("quizId") || "").trim();
  const cohort = String(searchParams.get("cohort") || "").trim() || "cohort-3";
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 50)));

  if (!quizId) {
    return NextResponse.json({ error: "quizId is required" }, { status: 400 });
  }

  // Best attempt per person (participant_key). If participant_key is null, fall back to attempt_id.
  // Postgres DISTINCT ON picks the first row per key based on the ORDER BY.
  const rows = await db.execute(
    sql`
      WITH base AS (
        SELECT
          attempt_id,
          display_name,
          whatsapp,
          correct,
          total,
          score_pct,
          duration_ms,
          submitted_at,
          COALESCE(participant_key, attempt_id) AS identity_key
        FROM attempts
        WHERE quiz_id = ${quizId} AND cohort = ${cohort} AND submitted_at IS NOT NULL
      ),
      counts AS (
        SELECT identity_key, COUNT(*)::int AS attempts_count
        FROM base
        GROUP BY identity_key
      )
      SELECT DISTINCT ON (b.identity_key)
        b.attempt_id AS "attemptId",
        b.display_name AS "displayName",
        b.whatsapp AS "whatsapp",
        b.correct AS "correct",
        b.total AS "total",
        b.score_pct AS "scorePct",
        b.duration_ms AS "durationMs",
        b.submitted_at AS "submittedAt",
        c.attempts_count AS "attemptsCount"
      FROM base b
      INNER JOIN counts c ON c.identity_key = b.identity_key
      ORDER BY
        b.identity_key,
        b.score_pct DESC,
        b.duration_ms ASC,
        b.submitted_at ASC
      LIMIT ${limit};
    `
  );

  const attemptsCountRes = await db.execute(
    sql`
      SELECT COUNT(*)::int AS "attemptsCount"
      FROM attempts
      WHERE quiz_id = ${quizId} AND cohort = ${cohort} AND submitted_at IS NOT NULL;
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
    attemptsCount: number | null;
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
    attemptsCount: r.attemptsCount ?? 1,
  }));

  type CountRow = { attemptsCount: number | string | null };
  const attemptsCountRaw = (attemptsCountRes as unknown as { rows: CountRow[] }).rows?.[0]?.attemptsCount;
  const attemptsCount = Number(attemptsCountRaw ?? 0);

  return NextResponse.json({ quizId, cohort, leaderboard, attemptsCount });
}
