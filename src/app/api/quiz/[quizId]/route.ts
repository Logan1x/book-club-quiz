import { NextResponse } from "next/server";
import { loadQuiz } from "@/lib/quizzes";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ quizId: string }> }
) {
  const { quizId } = await ctx.params;

  try {
    const quiz = loadQuiz(quizId);
    return NextResponse.json(quiz);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Quiz not found";
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}
