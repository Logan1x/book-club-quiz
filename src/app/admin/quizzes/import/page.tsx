"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ImportQuizPage() {
  const adminKey = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("key") || "";
  }, []);

  const [quizId, setQuizId] = useState("sophies-world-ch1-3-adult-cohort-v1");
  const [title, setTitle] = useState("Sophie’s World (Ch 1–3)");
  const [durationSec, setDurationSec] = useState(360);
  const [enableForCohort, setEnableForCohort] = useState("cohort-3");
  const [content, setContent] = useState("");
  const [answerKey, setAnswerKey] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onImport() {
    setBusy(true);
    setMsg(null);
    try {
      const qs = adminKey ? `?key=${encodeURIComponent(adminKey)}` : "";
      const res = await fetch(`/api/admin/quizzes/import${qs}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quizId,
          title,
          durationSec,
          enableForCohort,
          content: JSON.parse(content),
          answerKey: JSON.parse(answerKey),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Import failed");
      setMsg(`Imported: ${j.quizId}`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Import quiz</CardTitle>
          <CardDescription>Paste quiz JSON + answer key JSON.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {msg ? <div className="text-sm">{msg}</div> : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>quizId</Label>
              <Input value={quizId} onChange={(e) => setQuizId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>durationSec</Label>
              <Input value={String(durationSec)} onChange={(e) => setDurationSec(Number(e.target.value || 360))} />
            </div>
            <div className="space-y-2">
              <Label>enable for cohort</Label>
              <Input value={enableForCohort} onChange={(e) => setEnableForCohort(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quiz content JSON</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[220px] font-mono" placeholder="{...}" />
          </div>

          <div className="space-y-2">
            <Label>Answer key JSON</Label>
            <Textarea value={answerKey} onChange={(e) => setAnswerKey(e.target.value)} className="min-h-[180px] font-mono" placeholder="{...}" />
          </div>

          <Button onClick={onImport} disabled={busy || !quizId.trim() || !content.trim() || !answerKey.trim()}>
            {busy ? "Importing…" : "Import"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
