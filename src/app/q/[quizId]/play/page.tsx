"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";

type Quiz = {
  quizId: string;
  questions: Array<{ id: string; prompt: string; options: string[]; chapter?: number }>;
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

function lsRemove(key: string) {
  try {
    localStorage.removeItem(key);
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
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIdentity, setShowIdentity] = useState(true);

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

  // Prefer quizId from the attempt (server-issued) to avoid params Promise/undefined issues.
  const quizId = String(attempt?.quizId || routeQuizId || "");

  useEffect(() => {
    let ok = true;
    if (!quizId || quizId === "undefined") return;
    fetch(`/api/quiz/${encodeURIComponent(quizId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!ok) return;
        setQuiz(j);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!ok) return;
        setError(e instanceof Error ? e.message : "Failed to load quiz");
      });
    return () => {
      ok = false;
    };
  }, [quizId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const endsAt = attempt?.endsAt ?? (Date.now() + 6 * 60 * 1000);
  const remaining = endsAt - now;
  const timedOut = remaining <= 0;

  const total = quiz?.questions?.length ?? 0;
  const progress = total ? Math.round(((idx + 1) / total) * 100) : 0;

  useEffect(() => {
    if (!timedOut) return;
    // auto submit once
    if (!busy) void onSubmit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedOut]);

  function setAnswer(qid: string, optIndex: number) {
    setAnswers((prev) => ({ ...prev, [qid]: optIndex }));
  }

  async function onSubmit(auto = false) {
    if (!attempt || !quiz) return;
    if (busy) return;
    setBusy(true);
    setError(null);
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

      lsSet(`bcq.result.${attemptId}`, JSON.stringify(data));
      router.push(`/q/${quizId}/result/${attemptId}?cohort=${encodeURIComponent(cohort)}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submit failed";
      setError(msg);
      setBusy(false);
    }
  }

  function onForgetSavedDetails() {
    lsRemove("bcq.identity");
    setShowIdentity(false);
  }

  if (!attemptId || !attempt) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-6">
        <Card>
          <CardHeader>
            <CardTitle>Missing attempt</CardTitle>
            <CardDescription>Go back and start the quiz.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(`/q/${quizId}?cohort=${encodeURIComponent(cohort)}`)}>
              Back
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!quiz) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-6">
        <Card>
          <CardHeader>
            <CardTitle>Loading quiz…</CardTitle>
            {attempt?.displayName ? <CardDescription>Loading for {attempt.displayName}</CardDescription> : null}
          </CardHeader>
          <CardContent>
            <Progress value={40} />
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </CardContent>
        </Card>
      </main>
    );
  }

  const q = quiz.questions[idx];
  const selected = answers[q.id];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground truncate">{quiz.book?.title || "Quiz"}</div>
        </div>
        <div className="flex items-center gap-2">
          {showIdentity && attempt.displayName ? (
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span>Playing as {attempt.displayName}</span>
              <button
                type="button"
                onClick={onForgetSavedDetails}
                className="underline underline-offset-2 hover:text-foreground"
              >
                Forget
              </button>
            </div>
          ) : null}
          <div className="rounded-sm border px-3 py-2 font-mono text-sm">{formatTime(remaining)}</div>
        </div>
      </div>

      <Progress value={progress} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Q{idx + 1}. {q.prompt}
          </CardTitle>
          <CardDescription>
            {q.chapter ? `Chapter ${q.chapter}` : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={Number.isInteger(selected) ? String(selected) : ""}
            onValueChange={(v) => setAnswer(q.id, Number(v))}
            className="space-y-2"
          >
            {q.options.map((opt, i) => (
              <label
                key={i}
                className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/40"
              >
                <RadioGroupItem value={String(i)} className="mt-1" />
                <div className="text-sm leading-relaxed">{opt}</div>
              </label>
            ))}
          </RadioGroup>

          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => setIdx((x) => Math.max(0, x - 1))}
              disabled={idx === 0 || busy}
            >
              Back
            </Button>
            {idx < quiz.questions.length - 1 ? (
              <Button
                onClick={() => setIdx((x) => Math.min(quiz.questions.length - 1, x + 1))}
                disabled={!Number.isInteger(selected) || busy}
              >
                Next
              </Button>
            ) : (
              <Button onClick={() => onSubmit(false)} disabled={busy}>
                {busy ? "Submitting…" : "Finish"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
