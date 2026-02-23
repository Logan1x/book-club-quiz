import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cohortQuizzes, cohorts, quizzes } from "@/lib/schema";

import quiz from "@/quizzes/sophies-world-ch1-3.json";
import key from "@/quizzes/sophies-world-ch1-3.answers.json";

export const runtime = "nodejs";

// TEMP: seed endpoint for local dev. Remove/secure before public deploy.
export async function POST() {
  const cohortCode = "cohort-3";
  const cohortName = "Cohort #3";

  await db
    .insert(cohorts)
    .values({ cohortCode, cohortName })
    .onConflictDoNothing({ target: cohorts.cohortCode });

  await db
    .insert(quizzes)
    .values({
      quizId: quiz.quizId,
      title: "Sophie’s World (Ch 1–3)",
      durationSec: 360,
      content: quiz,
      answerKey: key,
    })
    .onConflictDoUpdate({
      target: quizzes.quizId,
      set: { content: quiz, answerKey: key },
    });

  await db
    .insert(cohortQuizzes)
    .values({ cohortCode, quizId: quiz.quizId })
    .onConflictDoNothing({ target: [cohortQuizzes.cohortCode, cohortQuizzes.quizId] });

  return NextResponse.json({ ok: true, cohortCode, quizId: quiz.quizId });
}
