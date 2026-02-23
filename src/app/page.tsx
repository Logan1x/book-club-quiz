import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Book Club Quiz</h1>
        <p className="text-muted-foreground">
          Timed quizzes + leaderboard. (MVP in progress)
        </p>
      </div>

      <div className="space-y-2">
        <Link
          className="underline"
          href="/q/sophies-world-ch1-3-adult-cohort-v1?cohort=cohort-3"
        >
          Start: Sophie’s World (Ch 1–3)
        </Link>
        <p className="text-sm text-muted-foreground">
          Tip: share this link with your cohort.
        </p>
      </div>
    </main>
  );
}
