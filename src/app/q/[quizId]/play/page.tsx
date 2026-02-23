"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function formatTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function PlayPage({ params }: { params: { quizId: string } }) {
  const router = useRouter();
  const sp = useSearchParams();
  const cohort = sp.get("cohort") || "cohort-1";
  const attemptId = sp.get("attemptId") || "";

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);

  const attempt: AttemptStart | null = useMemo(() => {
    if (!attemptId) return null;
    const raw = lsGet(`bcq.attempt.${attemptId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [attemptId]);

  useEffect(() => {
    let ok = true;
    fetch(`/api/quiz/${params.quizId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!ok) return;
        setQuiz(j);
      });
    return () => {
      ok = false;
    };
  }, [params.quizId]);

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
    try {
      const res = await fetch("/api/attempts/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quizId: params.quizId,
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
      router.push(`/q/${params.quizId}/result/${attemptId}?cohort=${encodeURIComponent(cohort)}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submit failed";
      alert(msg);
      setBusy(false);
    }
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
            <Button onClick={() => router.push(`/q/${params.quizId}?cohort=${encodeURIComponent(cohort)}`)}>
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
          </CardHeader>
          <CardContent>
            <Progress value={40} />
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
          <div className="text-sm font-medium">{attempt.displayName}</div>
        </div>
        <div className="rounded-md border px-3 py-2 font-mono text-sm">
          {formatTime(remaining)}
        </div>
      </div>

      <Progress value={progress} />

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
