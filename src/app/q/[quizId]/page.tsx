"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type StartResp = {
  attemptId: string;
  quizId: string;
  cohort: string;
  startedAt: number;
  endsAt: number;
  durationSec: number;
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

export default function JoinPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const routeParams = useParams<{ quizId: string }>();
  const quizId = String(routeParams?.quizId || "");
  const cohort = sp.get("cohort") || "cohort-1";

  const storageKey = useMemo(() => `bcq.identity`, []);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const raw = lsGet(storageKey);
    if (!raw) return;
    try {
      const j = JSON.parse(raw);
      if (j?.name) setName(String(j.name));
      if (j?.whatsapp) setWhatsapp(String(j.whatsapp));
    } catch {
      // ignore
    }
  }, [storageKey]);

  async function onStart() {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (!quizId) {
      alert("Missing quiz id in URL");
      return;
    }

    lsSet(storageKey, JSON.stringify({ name: cleanName, whatsapp: whatsapp.trim() || null }));

    setBusy(true);
    try {
      const res = await fetch("/api/attempts/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quizId, cohort }),
      });
      const data = (await res.json()) as StartResp | { error?: string };
      if (!res.ok) throw new Error(("error" in data && data.error) ? data.error : "Failed to start");

      lsSet(
        `bcq.attempt.${data.attemptId}`,
        JSON.stringify({ ...data, displayName: cleanName, whatsapp: whatsapp.trim() || null })
      );
      router.push(
        `/q/${quizId}/play?cohort=${encodeURIComponent(cohort)}&attemptId=${encodeURIComponent(data.attemptId)}`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to start";
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle>Join quiz</CardTitle>
          <CardDescription>
            Timed: 6 minutes. Cohort: <span className="font-mono">{cohort}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">WhatsApp phone (optional)</label>
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+91…" />
            <p className="text-xs text-muted-foreground">Saved locally on this device for next time.</p>
          </div>

          <Button disabled={busy || !name.trim()} onClick={onStart} className="w-full">
            {busy ? "Starting…" : "Start quiz"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
