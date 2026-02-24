import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cohortQuizzes, quizzes } from "@/lib/schema";
import { and, eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ cohortCode: string }> }) {
  try {
    requireAdmin(req);
    const { cohortCode } = await ctx.params;

    const rows = await db
      .select({
        quizId: quizzes.quizId,
        title: quizzes.title,
        enabled: sql<boolean>`(cq.quiz_id IS NOT NULL)`,
      })
      .from(quizzes)
      .leftJoin(sql`cohort_quizzes cq`, sql`cq.quiz_id = quizzes.quiz_id AND cq.cohort_code = ${cohortCode}`);

    return NextResponse.json({ cohortCode, quizzes: rows });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ cohortCode: string }> }) {
  try {
    requireAdmin(req);
    const { cohortCode } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const quizId = String(body?.quizId || "").trim();
    const enabled = Boolean(body?.enabled);
    if (!quizId) return NextResponse.json({ error: "quizId required" }, { status: 400 });

    if (enabled) {
      await db
        .insert(cohortQuizzes)
        .values({ cohortCode, quizId })
        .onConflictDoNothing({ target: [cohortQuizzes.cohortCode, cohortQuizzes.quizId] });
    } else {
      await db.delete(cohortQuizzes).where(and(eq(cohortQuizzes.cohortCode, cohortCode), eq(cohortQuizzes.quizId, quizId)));
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
