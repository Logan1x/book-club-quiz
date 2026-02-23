import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attempts } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await ctx.params;
  const rows = await db
    .select()
    .from(attempts)
    .where(eq(attempts.attemptId, attemptId))
    .limit(1);

  const a = rows[0];
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    attemptId: a.attemptId,
    quizId: a.quizId,
    cohort: a.cohort,
    displayName: a.displayName,
    whatsapp: a.whatsapp,
    startedAt: a.startedAt?.getTime?.() ?? null,
    endsAt: a.endsAt?.getTime?.() ?? null,
    submittedAt: a.submittedAt?.getTime?.() ?? null,
    durationMs: a.durationMs,
    correct: a.correct,
    total: a.total,
    scorePct: a.scorePct,
    timedOut: a.timedOut,
  });
}
