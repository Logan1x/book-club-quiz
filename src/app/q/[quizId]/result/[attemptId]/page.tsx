"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toPng } from "html-to-image";
import { Badge } from "@/components/ui/badge";
import { cohortLabel } from "@/lib/cohort";

function lsGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function msToHuman(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}m ${ss}s`;
}

export default function ResultPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const routeParams = useParams<{ quizId?: string | string[]; attemptId?: string | string[] }>();
  const quizIdRaw = routeParams?.quizId;
  const attemptIdRaw = routeParams?.attemptId;
  const quizId = String(Array.isArray(quizIdRaw) ? quizIdRaw[0] : quizIdRaw || "");
  const attemptId = String(Array.isArray(attemptIdRaw) ? attemptIdRaw[0] : attemptIdRaw || "");
  const cohort = sp.get("cohort") || "cohort-1";

  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const cached = useMemo(() => {
    if (!attemptId) return null;
    const raw = lsGet(`bcq.result.${attemptId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [attemptId]);

  type ResultShape = {
    attemptId: string;
    quizId: string;
    cohort: string;
    displayName?: string | null;
    whatsapp?: string | null;
    durationMs?: number | null;
    correct?: number | null;
    total?: number | null;
    scorePct?: number | null;
    rank?: { position: number; total: number };
  };

  const [result, setResult] = useState<ResultShape | null>(cached as ResultShape | null);

  useEffect(() => {
    if (result) return;
    if (!attemptId) return;
    fetch(`/api/attempts/${encodeURIComponent(attemptId)}`)
      .then((r) => r.json())
      .then((j) => setResult(j))
      .catch(() => {
        // ignore
      });
  }, [attemptId, result]);

  useEffect(() => {
    if (!result) {
      // if missing, go back
      // (don’t hard redirect immediately; allow UI)
    }
  }, [result]);

  async function onShareImage() {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "quiz-result.png", { type: "image/png" });

      // Try native share first (some browsers report canShare=false on repeat)
      const nav = navigator as unknown as {
        share?: (data: unknown) => Promise<void>;
        canShare?: (data: unknown) => boolean;
      };
      if (nav.share) {
        try {
          await nav.share({ files: [file], title: "Quiz result" });
          return;
        } catch (err: unknown) {
          // If user cancels share sheet, don't force a download.
          if (err && typeof err === "object" && "name" in err && (err as { name?: string }).name === "AbortError") {
            return;
          }
          // Otherwise fall through to download.
        }
      }

      // Fallback: download
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "quiz-result.png";
      a.click();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Share failed";
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  function onWhatsAppLink() {
    const url = `${window.location.origin}/q/${quizId}/leaderboard?cohort=${encodeURIComponent(cohort)}`;
    const text = `I just finished the quiz! Leaderboard: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  if (!result) {
    return (
      <main className="min-h-screen bg-[#f8f5ef] text-[#1d1b18]">
        <div className="mx-auto flex w-full max-w-xl flex-col justify-center p-6">
        <Card className="rounded-md border-[#dfd5c7] bg-white shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-3xl">Result not found</CardTitle>
            <CardDescription className="text-[#655b50]">Finish the quiz first.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              onClick={() => router.push(`/q/${quizId}?cohort=${encodeURIComponent(cohort)}`)}
              className="rounded-md bg-[#1d1b18] text-white hover:bg-[#11100e]"
            >
              Start
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push(`/`)}
              className="rounded-md border border-[#d6ccbe] bg-white text-[#2f2a24] hover:bg-[#f3ede4]"
            >
              Home
            </Button>
          </CardContent>
        </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#1d1b18]">
      <div className="mx-auto flex w-full max-w-xl flex-col justify-center gap-4 p-6">
      <div ref={cardRef} className="rounded-md border border-[#dfd5c7] bg-white p-5 shadow-none animate-in fade-in-0 slide-in-from-bottom-2 duration-400">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-[#6f6559]">UBC Cohort Quiz</div>
            <div className="font-display text-2xl font-semibold leading-tight">Sophie’s World (Ch 1–3)</div>
          </div>
          <Badge variant="secondary">{cohortLabel(cohort)}</Badge>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md border border-[#dfd5c7] bg-[#fffcf7] p-3">
            <div className="text-xs text-[#7a6f62]">Score</div>
            <div className="text-xl font-semibold">{result.correct}/{result.total}</div>
          </div>
          <div className="rounded-md border border-[#dfd5c7] bg-[#fffcf7] p-3">
            <div className="text-xs text-[#7a6f62]">Time</div>
            <div className="text-xl font-semibold">{msToHuman(result.durationMs ?? 0)}</div>
          </div>
          <div className="rounded-md border border-[#dfd5c7] bg-[#fffcf7] p-3">
            <div className="text-xs text-[#7a6f62]">Rank</div>
            <div className="text-xl font-semibold">#{result.rank?.position}</div>
            <div className="text-xs text-[#7a6f62]">of {result.rank?.total}</div>
          </div>
        </div>

        <div className="mt-4 text-sm text-[#6f6559]">
          {result.displayName ? `Player: ${result.displayName}` : null}
        </div>
      </div>

      <Card className="rounded-md border-[#dfd5c7] bg-white shadow-none animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Next</CardTitle>
          <CardDescription className="text-[#655b50]">Share your result or view leaderboard.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            onClick={onShareImage}
            disabled={busy}
            className="rounded-md bg-[#1d1b18] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#11100e]"
          >
            {busy ? "Preparing…" : "Share result as image"}
          </Button>
          <Button
            variant="secondary"
            onClick={onWhatsAppLink}
            className="rounded-md border border-[#d6ccbe] bg-white text-[#2f2a24] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f3ede4]"
          >
            Share leaderboard link on WhatsApp
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/q/${quizId}/leaderboard?cohort=${encodeURIComponent(cohort)}`)}
            className="rounded-md border border-[#d6ccbe] bg-white text-[#2f2a24] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f3ede4]"
          >
            View leaderboard
          </Button>
        </CardContent>
      </Card>
      </div>
    </main>
  );
}
