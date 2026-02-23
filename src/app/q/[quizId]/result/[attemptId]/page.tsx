"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toPng } from "html-to-image";
import { Badge } from "@/components/ui/badge";

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

export default function ResultPage({ params }: { params: { quizId: string; attemptId: string } }) {
  const router = useRouter();
  const sp = useSearchParams();
  const cohort = sp.get("cohort") || "cohort-1";

  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const result = useMemo(() => {
    const raw = lsGet(`bcq.result.${params.attemptId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [params.attemptId]);

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

      // Try native share first (typing varies by TS lib target)
      const nav = navigator as unknown as {
        share?: (data: unknown) => Promise<void>;
        canShare?: (data: unknown) => boolean;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: "Quiz result" });
        return;
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
    const url = `${window.location.origin}/q/${params.quizId}/leaderboard?cohort=${encodeURIComponent(cohort)}`;
    const text = `I just finished the quiz! Leaderboard: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  if (!result) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-6">
        <Card>
          <CardHeader>
            <CardTitle>Result not found</CardTitle>
            <CardDescription>Finish the quiz first.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={() => router.push(`/q/${params.quizId}?cohort=${encodeURIComponent(cohort)}`)}>
              Start
            </Button>
            <Button variant="secondary" onClick={() => router.push(`/`)}>
              Home
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-6">
      <div ref={cardRef} className="rounded-xl border bg-background p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Book Club Quiz</div>
            <div className="text-lg font-semibold leading-tight">Sophie’s World (Ch 1–3)</div>
          </div>
          <Badge variant="secondary">{cohort}</Badge>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Score</div>
            <div className="text-xl font-semibold">{result.correct}/{result.total}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Time</div>
            <div className="text-xl font-semibold">{msToHuman(result.durationMs)}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Rank</div>
            <div className="text-xl font-semibold">#{result.rank?.position}</div>
            <div className="text-xs text-muted-foreground">of {result.rank?.total}</div>
          </div>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          {result.displayName ? `Player: ${result.displayName}` : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next</CardTitle>
          <CardDescription>Share your result or view leaderboard.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button onClick={onShareImage} disabled={busy}>
            {busy ? "Preparing…" : "Share result as image"}
          </Button>
          <Button variant="secondary" onClick={onWhatsAppLink}>
            Share leaderboard link on WhatsApp
          </Button>
          <Button variant="outline" onClick={() => router.push(`/q/${params.quizId}/leaderboard?cohort=${encodeURIComponent(cohort)}`)}>
            View leaderboard
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
