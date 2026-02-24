import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cohortQuizzes, quizzes } from "@/lib/schema";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const quizId = String(body?.quizId || "").trim();
    const title = String(body?.title || quizId).trim();
    const durationSec = Number(body?.durationSec || 360);
    const content = body?.content;
    const answerKey = body?.answerKey;
    const enableForCohort = String(body?.enableForCohort || "").trim();

    if (!quizId || !content || !answerKey) {
      return NextResponse.json({ error: "quizId, content, answerKey required" }, { status: 400 });
    }

    await db
      .insert(quizzes)
      .values({ quizId, title, durationSec, content, answerKey })
      .onConflictDoUpdate({
        target: quizzes.quizId,
        set: { title, durationSec, content, answerKey },
      });

    if (enableForCohort) {
      await db
        .insert(cohortQuizzes)
        .values({ cohortCode: enableForCohort, quizId })
        .onConflictDoNothing({ target: [cohortQuizzes.cohortCode, cohortQuizzes.quizId] });
    }

    return NextResponse.json({ ok: true, quizId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
