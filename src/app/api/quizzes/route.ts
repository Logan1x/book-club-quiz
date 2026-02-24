import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cohortQuizzes, quizzes } from "@/lib/schema";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cohort = (url.searchParams.get("cohort") || "cohort-3").trim();

  const rows = await db
    .select({
      quizId: quizzes.quizId,
      title: quizzes.title,
      durationSec: quizzes.durationSec,
      createdAt: quizzes.createdAt,
    })
    .from(cohortQuizzes)
    .innerJoin(
      quizzes,
      and(eq(cohortQuizzes.quizId, quizzes.quizId), eq(cohortQuizzes.cohortCode, cohort))
    )
    .orderBy(desc(quizzes.createdAt));

  return NextResponse.json({ cohort, quizzes: rows });
}
