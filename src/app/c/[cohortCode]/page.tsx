import Link from "next/link";
import { db } from "@/lib/db";
import { cohortQuizzes, cohorts, quizzes } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const runtime = "nodejs";

export default async function CohortPage({ params }: { params: Promise<{ cohortCode: string }> }) {
  const { cohortCode } = await params;

  const c = await db
    .select({ cohortName: cohorts.cohortName })
    .from(cohorts)
    .where(eq(cohorts.cohortCode, cohortCode))
    .limit(1);

  const rows = await db
    .select({ quizId: quizzes.quizId, title: quizzes.title, durationSec: quizzes.durationSec })
    .from(cohortQuizzes)
    .innerJoin(quizzes, eq(cohortQuizzes.quizId, quizzes.quizId))
    .where(eq(cohortQuizzes.cohortCode, cohortCode));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{c[0]?.cohortName || cohortCode}</CardTitle>
          <CardDescription>Pick a quiz.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No quizzes enabled yet.</div>
          ) : (
            rows.map((q) => (
              <Link
                key={q.quizId}
                href={`/q/${q.quizId}?cohort=${encodeURIComponent(cohortCode)}`}
                className="block rounded-lg border p-4 hover:bg-muted/40"
              >
                <div className="font-medium">{q.title}</div>
                <div className="text-xs text-muted-foreground">Time: {Math.round((q.durationSec ?? 360) / 60)} min</div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
