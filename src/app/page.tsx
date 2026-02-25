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

const HOME_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
    const cacheKey = `bcq.home.v3.quizzes.${cohort}`;
    const now = Date.now();

    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { quizzes?: QuizListItem[]; cachedAt?: number };
        if (Array.isArray(parsed.quizzes) && parsed.cachedAt && now - parsed.cachedAt < HOME_CACHE_TTL_MS) {
          setQuizzes(parsed.quizzes);
          setLoading(false);
          return;
        }
      }
    } catch {
      // ignore cache read errors
    }

    fetch(`/api/quizzes?cohort=${encodeURIComponent(cohort)}`, { cache: "force-cache" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) throw new Error(j?.error || "Failed to load quizzes");
        const list = (j?.quizzes || []) as QuizListItem[];
        setQuizzes(list);
        setError(null);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ quizzes: list, cachedAt: Date.now() }));
        } catch {
          // ignore cache write errors
        }
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load quizzes");
      })
      .finally(() => setLoading(false));
  }, [cohort]);

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#1d1b18]">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-14 pt-16 md:pb-20 md:pt-20">
        <section className="mb-12 animate-in fade-in-0 slide-in-from-bottom-2 text-center duration-500 md:mb-16">
          <div className="mx-auto mb-5 inline-flex rounded-md border border-[#ddd3c5] bg-white px-3 py-1 text-xs font-medium text-[#6f6559]">
            UBC Cohort Quiz
          </div>
          <h1 className="font-display text-5xl font-semibold tracking-tight md:text-7xl lg:text-8xl">
            Your cohort.
            <br />
            <span className="text-[#8f8274]">Your quiz.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-[#5f564c] md:text-lg">
            Join your cohort quiz, beat the timer, and climb the leaderboard.
            <br />
            Pick from the live quizzes below.
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[#8a7d6e]">{cohort}</p>
        </section>

        {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          {loading
            ? [0, 1, 2, 3].map((item) => (
                <article
                  key={item}
                  className="space-y-4 rounded-md border border-[#dfd5c7] bg-white p-6 animate-pulse"
                  aria-label="Loading quiz"
                >
                  <div className="h-3 w-20 rounded-md bg-[#ebe2d5]" />
                  <div className="h-7 w-4/5 rounded-md bg-[#efe7dc]" />
                  <div className="h-4 w-2/5 rounded-md bg-[#efe7dc]" />
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                    <div className="h-10 flex-1 rounded-md bg-[#e6ded2]" />
                    <div className="h-10 flex-1 rounded-md bg-[#f0e9dd]" />
                  </div>
                </article>
              ))
            : quizzes.map((quiz, i) => (
                <article
                  key={quiz.quizId}
                  className="animate-in fade-in-0 slide-in-from-bottom-2 rounded-md border border-[#dfd5c7] bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                  style={{ animationDelay: `${i * 70}ms`, animationDuration: "420ms", animationFillMode: "both" }}
                >
                  <div className="text-xs uppercase tracking-[0.18em] text-[#8a7d6e]">Live quiz</div>
                  <h2 className="mt-2 font-display text-2xl leading-tight text-[#1f1d1a]">{quiz.title}</h2>
                  <p className="mt-2 text-sm text-[#655b50]">
                    {Math.max(1, Math.round((quiz.durationSec || 0) / 60))} minute timer
                  </p>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href={`/q/${encodeURIComponent(quiz.quizId)}?cohort=${encodeURIComponent(cohort)}`}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1d1b18] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#11100e]"
                    >
                      <ListChecks className="h-4 w-4" />
                      Play quiz
                    </Link>
                    <Link
                      href={`/q/${encodeURIComponent(quiz.quizId)}/leaderboard?cohort=${encodeURIComponent(cohort)}`}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-[#d6ccbe] px-4 py-2.5 text-sm font-semibold text-[#2f2a24] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f3ede4]"
                    >
                      <Trophy className="h-4 w-4" />
                      Leaderboard
                    </Link>
                  </div>
                </article>
              ))}
        </div>

        {!loading && quizzes.length === 0 ? (
          <section className="mt-2 rounded-md border border-[#dfd5c7] bg-white p-6 text-sm text-[#665d53]">
            No quizzes are live for this cohort yet.
          </section>
        ) : null}
      </div>
    </main>
  );
}
