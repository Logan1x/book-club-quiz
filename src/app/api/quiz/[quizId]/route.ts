import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { quizzes } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ quizId: string }> }
) {
  const { quizId } = await ctx.params;

  const rows = await db.select({ content: quizzes.content }).from(quizzes).where(eq(quizzes.quizId, quizId)).limit(1);
  const q = rows[0]?.content;

  if (!q) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  return NextResponse.json(q);
}
