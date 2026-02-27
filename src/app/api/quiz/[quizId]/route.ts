import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes } from "@/lib/schema";
import { eq } from "drizzle-orm";

type QuizQuestion = {
  id: string;
  chapter?: number;
  prompt: string;
  options: string[];
};

type QuizPayload = {
  quizId: string;
  questions: QuizQuestion[];
  book?: { title?: string };
};

type AnswerPayload = {
  answerKey: Array<{ id: string; answerIndex: number }>;
};

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ quizId: string }> }
) {
  const { quizId } = await ctx.params;

  const rows = await db
    .select({ content: quizzes.content, answerKey: quizzes.answerKey })
    .from(quizzes)
    .where(eq(quizzes.quizId, quizId))
    .limit(1);

  const q = rows[0]?.content as QuizPayload | null | undefined;
  const key = rows[0]?.answerKey as AnswerPayload | null | undefined;

  if (!q) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  if (!key?.answerKey?.length) return NextResponse.json({ error: "Quiz answer key not found" }, { status: 500 });

  const keyMap = new Map(key.answerKey.map((item) => [item.id, item.answerIndex] as const));
  const questions = [] as Array<QuizQuestion & { correctIndex: number }>;

  for (const question of q.questions) {
    const correctIndex = keyMap.get(question.id);
    if (!Number.isInteger(correctIndex)) {
      return NextResponse.json({ error: `Missing answer key for question: ${question.id}` }, { status: 500 });
    }

    questions.push({
      ...question,
      correctIndex,
    });
  }

  return NextResponse.json({
    ...q,
    questions,
  });
}
