"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { adminHeaders, readAdminKey } from "@/lib/admin-client";

export default function ImportQuizPage() {
  const adminKey = useMemo(() => {
    return readAdminKey();
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
      const res = await fetch(`/api/admin/quizzes/import`, {
        method: "POST",
        headers: { "content-type": "application/json", ...adminHeaders(adminKey) },
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
    <main className="min-h-screen bg-[#f8f5ef] text-[#1d1b18]">
      <div className="mx-auto flex w-full max-w-4xl flex-col justify-center gap-4 p-6">
      <Card className="rounded-md border-[#dfd5c7] bg-white shadow-none animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Import quiz</CardTitle>
          <CardDescription className="text-[#655b50]">Paste quiz JSON + answer key JSON.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {msg ? <div className="text-sm text-[#5f564c]">{msg}</div> : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[#2f2a24]">quizId</Label>
              <Input value={quizId} onChange={(e) => setQuizId(e.target.value)} className="rounded-md border-[#d6ccbe] bg-[#fffcf7]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#2f2a24]">title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-md border-[#d6ccbe] bg-[#fffcf7]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#2f2a24]">durationSec</Label>
              <Input
                value={String(durationSec)}
                onChange={(e) => setDurationSec(Number(e.target.value || 360))}
                className="rounded-md border-[#d6ccbe] bg-[#fffcf7]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#2f2a24]">enable for cohort</Label>
              <Input
                value={enableForCohort}
                onChange={(e) => setEnableForCohort(e.target.value)}
                className="rounded-md border-[#d6ccbe] bg-[#fffcf7]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#2f2a24]">Quiz content JSON</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[220px] rounded-md border-[#d6ccbe] bg-[#fffcf7] font-mono"
              placeholder="{...}"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#2f2a24]">Answer key JSON</Label>
            <Textarea
              value={answerKey}
              onChange={(e) => setAnswerKey(e.target.value)}
              className="min-h-[180px] rounded-md border-[#d6ccbe] bg-[#fffcf7] font-mono"
              placeholder="{...}"
            />
          </div>

          <Button
            onClick={onImport}
            disabled={busy || !quizId.trim() || !content.trim() || !answerKey.trim()}
            className="rounded-md bg-[#1d1b18] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#11100e]"
          >
            {busy ? "Importing…" : "Import"}
          </Button>
        </CardContent>
      </Card>
      </div>
    </main>
  );
}
