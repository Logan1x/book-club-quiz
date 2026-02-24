import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attempts } from "@/lib/schema";
import { and, avg, count, eq, isNotNull, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    requireAdmin(req);
    const { searchParams } = new URL(req.url);
    const quizId = String(searchParams.get("quizId") || "").trim();
    const cohort = String(searchParams.get("cohort") || "").trim();
    if (!quizId || !cohort) return NextResponse.json({ error: "quizId and cohort required" }, { status: 400 });

    const rows = await db
      .select({
        submissions: count(),
        avgScorePct: avg(attempts.scorePct),
        avgDurationMs: avg(attempts.durationMs),
      })
      .from(attempts)
      .where(and(eq(attempts.quizId, quizId), eq(attempts.cohort, cohort), isNotNull(attempts.submittedAt)));

    // simple histogram for score buckets
    const buckets = await db.execute(sql`
      SELECT
        CASE
          WHEN score_pct >= 90 THEN '90-100'
          WHEN score_pct >= 70 THEN '70-89'
          WHEN score_pct >= 50 THEN '50-69'
          ELSE '0-49'
        END AS bucket,
        COUNT(*)::int AS count
      FROM attempts
      WHERE quiz_id = ${quizId} AND cohort = ${cohort} AND submitted_at IS NOT NULL
      GROUP BY 1
      ORDER BY 1;
    `);

    return NextResponse.json({
      quizId,
      cohort,
      submissions: Number(rows[0]?.submissions || 0),
      avgScorePct: rows[0]?.avgScorePct ? Number(rows[0].avgScorePct) : null,
      avgDurationMs: rows[0]?.avgDurationMs ? Number(rows[0].avgDurationMs) : null,
      buckets: (buckets as unknown as { rows: Array<{ bucket: string; count: number }> }).rows ?? [],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
