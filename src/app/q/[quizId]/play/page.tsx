"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Quiz = {
  quizId: string;
  questions: Array<{ id: string; prompt: string; options: string[]; chapter?: number; correctIndex: number }>;
  book?: { title?: string };
};

type AttemptStart = {
  attemptId: string;
  quizId: string;
  cohort: string;
  startedAt: number;
  endsAt: number;
  durationSec: number;
  displayName?: string;
  whatsapp?: string | null;
};

function lsGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, val: string) {
  try {
    localStorage.setItem(key, val);
  } catch {
    // ignore
  }
}

function formatTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function PlayPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const routeParams = useParams<{ quizId?: string | string[] }>();
  const routeQuizIdRaw = routeParams?.quizId;
  const routeQuizId = Array.isArray(routeQuizIdRaw) ? routeQuizIdRaw[0] : routeQuizIdRaw;
  const cohort = sp.get("cohort") || "cohort-3";
  const attemptId = sp.get("attemptId") || "";

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const attempt: AttemptStart | null = useMemo(() => {
    if (!attemptId) return null;
    const raw = lsGet(`bcq.attempt.${attemptId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AttemptStart;
    } catch {
      return null;
    }
  }, [attemptId]);

  const quizId = String(attempt?.quizId || routeQuizId || "");

  useEffect(() => {
    let alive = true;
    if (!quizId || quizId === "undefined") return;

    setQuiz(null);
    setQuizError(null);

    fetch(`/api/quiz/${encodeURIComponent(quizId)}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!alive) return;
        if (!ok) throw new Error(j?.error || "Quiz not found");
        setQuiz(j as Quiz);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setQuiz(null);
        setQuizError(e instanceof Error ? e.message : "Quiz not found");
      });

    return () => {
      alive = false;
    };
  }, [quizId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const endsAt = attempt?.endsAt ?? Date.now() + 6 * 60 * 1000;
  const remaining = endsAt - now;
  const timedOut = remaining <= 0;

  const questions = quiz?.questions ?? [];
  const total = questions.length;
  const safeIdx = total ? Math.min(idx, total - 1) : 0;
  const progress = total ? Math.round(((safeIdx + 1) / total) * 100) : 0;

  useEffect(() => {
    if (!total) return;
    setIdx((prev) => Math.min(prev, total - 1));
  }, [total]);

  useEffect(() => {
    if (!timedOut) return;
    if (!busy) void onSubmit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedOut]);

  function setAnswer(qid: string, optIndex: number) {
    setAnswers((prev) => ({ ...prev, [qid]: optIndex }));
  }

  function submitCurrentQuestion(qid: string, selectedIndex: number | undefined, correctIndex: number) {
    if (!Number.isInteger(selectedIndex)) return;
    if (!Number.isInteger(correctIndex)) return;

    track("question_submitted", {
      quizId,
      cohort,
      attemptId,
      questionId: qid,
      selectedIndex,
      correctIndex,
      isCorrect: selectedIndex === correctIndex,
    });

    setSubmittedQuestions((prev) => ({ ...prev, [qid]: true }));
  }

  async function onSubmit(auto = false) {
    if (!attempt || !quiz) return;
    if (busy) return;

    setBusy(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/attempts/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quizId,
          attemptId,
          cohort,
          displayName: attempt.displayName || "",
          whatsapp: attempt.whatsapp || null,
          startedAt: attempt.startedAt,
          endsAt: attempt.endsAt,
          answers,
          auto,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Submit failed");

      track("quiz_submitted", {
        quizId,
        cohort,
        attemptId,
        auto,
        answeredCount: Object.keys(answers).length,
      });

      lsSet(`bcq.result.${attemptId}`, JSON.stringify(data));
      router.push(`/q/${quizId}/result/${attemptId}?cohort=${encodeURIComponent(cohort)}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submit failed";
      track("quiz_submit_failed", {
        quizId,
        cohort,
        attemptId,
        auto,
        error: msg,
      });
      setSubmitError(msg);
      setBusy(false);
    }
  }

  if (!attemptId || !attempt) {
    return (
      <main className="min-h-screen bg-[#f8f5ef] text-[#1d1b18]">
        <div className="mx-auto flex w-full max-w-xl flex-col justify-center p-6">
          <Card className="rounded-md border-[#dfd5c7] bg-white shadow-none">
            <CardHeader>
              <CardTitle className="font-display text-3xl">Missing attempt</CardTitle>
              <CardDescription className="text-[#655b50]">Go back and start the quiz.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push(`/q/${quizId}?cohort=${encodeURIComponent(cohort)}`)}
                className="rounded-md bg-[#1d1b18] text-white hover:bg-[#11100e]"
              >
                Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!quiz) {
    return (
      <main className="min-h-screen bg-[#f8f5ef] text-[#1d1b18]">
        <div className="mx-auto flex w-full max-w-xl flex-col justify-center p-6">
          <Card className="rounded-md border-[#dfd5c7] bg-white shadow-none">
            <CardHeader>
              <CardTitle className="font-display text-3xl">{quizError ? "Quiz unavailable" : "Loading quiz..."}</CardTitle>
              {quizError ? <CardDescription className="text-[#655b50]">{quizError}</CardDescription> : null}
            </CardHeader>
            <CardContent>
              {quizError ? (
                <Button
                  onClick={() => router.push(`/q/${quizId}?cohort=${encodeURIComponent(cohort)}`)}
                  className="rounded-md bg-[#1d1b18] text-white hover:bg-[#11100e]"
                >
                  Back
                </Button>
              ) : (
                <Progress
                  value={40}
                  className="h-2 rounded-md bg-[#efe6d8] [&_[data-slot=progress-indicator]]:bg-[#1d1b18]"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!total) {
    return (
      <main className="min-h-screen bg-[#f8f5ef] text-[#1d1b18]">
        <div className="mx-auto flex w-full max-w-xl flex-col justify-center p-6">
          <Card className="rounded-md border-[#dfd5c7] bg-white shadow-none">
            <CardHeader>
              <CardTitle className="font-display text-3xl">No questions found</CardTitle>
              <CardDescription className="text-[#655b50]">
                This quiz appears empty. Please go back and start again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => router.push(`/q/${quizId}?cohort=${encodeURIComponent(cohort)}`)}
                className="rounded-md bg-[#1d1b18] text-white hover:bg-[#11100e]"
              >
                Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const currentIdx = safeIdx;
  const q = questions[currentIdx];
  const selected = answers[q.id];
  const isQuestionSubmitted = Boolean(submittedQuestions[q.id]);
  const actionButtonClass =
    "w-40 justify-center rounded-md bg-[#1d1b18] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#11100e]";

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#1d1b18]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
        <div className="animate-in slide-in-from-top-2 flex items-center justify-between gap-3 fade-in-0 duration-300">
          <div className="min-w-0">
            <div className="truncate text-sm text-[#6f6559]">{quiz.book?.title || "Quiz"}</div>
          </div>
          <div className="rounded-md border border-[#d6ccbe] bg-white px-3 py-2 font-mono text-sm text-[#1d1b18]">
            {formatTime(remaining)}
          </div>
        </div>

        <Progress value={progress} className="h-2 rounded-md bg-[#efe6d8] [&_[data-slot=progress-indicator]]:bg-[#1d1b18]" />
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <Card
          key={q.id}
          className="animate-in fade-in-0 slide-in-from-bottom-2 rounded-md border-[#dfd5c7] bg-white shadow-none duration-250"
        >
          <CardHeader>
            <CardTitle className="font-display text-2xl leading-tight text-[#1f1d1a]">
              Q{currentIdx + 1}. {q.prompt}
            </CardTitle>
            <CardDescription className="text-[#6f6559]">{q.chapter ? `Chapter ${q.chapter}` : null}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={Number.isInteger(selected) ? String(selected) : ""}
              onValueChange={(v) => {
                if (isQuestionSubmitted) return;
                setAnswer(q.id, Number(v));
              }}
              className="space-y-2"
            >
              {q.options.map((opt, i) => (
                <label
                  key={i}
                  className={cn(
                    "flex items-start gap-3 rounded-md border p-3 transition-all duration-200",
                    isQuestionSubmitted ? "cursor-default" : "cursor-pointer hover:-translate-y-0.5",
                    isQuestionSubmitted && i === q.correctIndex
                      ? "border-emerald-300 bg-emerald-50"
                      : isQuestionSubmitted && selected === i
                        ? "border-rose-300 bg-rose-50"
                        : selected === i
                          ? "border-[#c7b9a4] bg-[#f3ede4] shadow-sm"
                          : "border-[#dfd5c7] bg-[#fffcf7] hover:bg-[#f7f2e9]"
                  )}
                >
                  <RadioGroupItem value={String(i)} className="mt-1" disabled={isQuestionSubmitted || busy} />
                  <div className="text-sm leading-relaxed">{opt}</div>
                </label>
              ))}
            </RadioGroup>

            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                onClick={() => setIdx((x) => Math.max(0, x - 1))}
                disabled={currentIdx === 0 || busy}
                className="rounded-md border border-[#d6ccbe] bg-white text-[#2f2a24] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f3ede4]"
              >
                Back
              </Button>

              {!isQuestionSubmitted ? (
                <Button
                  onClick={() => submitCurrentQuestion(q.id, selected, q.correctIndex)}
                  disabled={!Number.isInteger(selected) || busy}
                  className={actionButtonClass}
                >
                  Submit answer
                </Button>
              ) : currentIdx < questions.length - 1 ? (
                <Button
                  onClick={() => setIdx((x) => Math.min(questions.length - 1, x + 1))}
                  disabled={busy}
                  className={actionButtonClass}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={() => onSubmit(false)}
                  disabled={busy}
                  className={actionButtonClass}
                >
                  {busy ? "Submitting..." : "Finish"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
