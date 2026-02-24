"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ListChecks, Trophy } from "lucide-react";

type QuizListItem = {
  quizId: string;
  title: string;
  durationSec: number;
  createdAt: string | null;
};

export default function Home() {
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [cohort] = useState(() => {
    if (typeof window === "undefined") return "cohort-3";
    const params = new URLSearchParams(window.location.search);
    return (params.get("cohort") || "cohort-3").trim();
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/quizzes?cohort=${encodeURIComponent(cohort)}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j?.error || "Failed to load quizzes");
        setQuizzes((j?.quizzes || []) as QuizListItem[]);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load quizzes");
      })
      .finally(() => setLoading(false));
  }, [cohort]);

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#1d1b18]">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 py-14 md:py-20">
        <section className="mb-20 text-center md:mb-24">
          <div className="mx-auto mb-5 inline-flex rounded-sm border border-[#ddd3c5] bg-white px-3 py-1 text-xs font-medium text-[#6f6559]">
            Book Club Quiz
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight md:text-7xl lg:text-8xl">
            Quiz night,
            <br />
            <span className="text-[#8f8274]">made simple.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base text-[#5f564c] md:text-lg">
            Join the quiz, beat the timer, and check the leaderboard.
            <br />
            Pick from the live quizzes below.
          </p>

          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[#8a7d6e]">{cohort}</p>
        </section>

        {loading ? <p className="text-sm text-[#6f6458]">Loading quizzes...</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        {!loading && !error ? (
          quizzes.length > 0 ? (
            <section className="grid gap-4 md:grid-cols-2">
              {quizzes.map((quiz) => (
                <article key={quiz.quizId} className="rounded-sm border border-[#dfd5c7] bg-white p-6">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#8a7d6e]">Live quiz</div>
                  <h2 className="mt-2 text-xl font-semibold text-[#1f1d1a]">{quiz.title}</h2>
                  <p className="mt-2 text-sm text-[#655b50]">{Math.max(1, Math.round((quiz.durationSec || 0) / 60))} minute timer</p>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href={`/q/${encodeURIComponent(quiz.quizId)}?cohort=${encodeURIComponent(cohort)}`}
                      className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#1d1b18] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#11100e]"
                    >
                      <ListChecks className="h-4 w-4" />
                      Play quiz
                    </Link>
                    <Link
                      href={`/q/${encodeURIComponent(quiz.quizId)}/leaderboard?cohort=${encodeURIComponent(cohort)}`}
                      className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#d6ccbe] px-4 py-2.5 text-sm font-semibold text-[#2f2a24] transition hover:bg-[#f3ede4]"
                    >
                      <Trophy className="h-4 w-4" />
                      Leaderboard
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="rounded-sm border border-[#dfd5c7] bg-white p-6 text-sm text-[#665d53]">
              No quizzes are live for this cohort yet.
            </section>
          )
        ) : null}
      </div>
    </main>
  );
}
