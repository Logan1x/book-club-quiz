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

function lsRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export default function JoinPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const routeParams = useParams<{ quizId: string }>();
  const quizId = String(routeParams?.quizId || "");
  const cohort = sp.get("cohort") || "cohort-3";

  const storageKey = useMemo(() => "bcq.identity", []);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [usingSavedIdentity, setUsingSavedIdentity] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = lsGet(storageKey);
    if (!raw) return;
    try {
      const j = JSON.parse(raw);
      const savedName = String(j?.name || "").trim();
      const savedWhatsapp = String(j?.whatsapp || "").trim();
      if (savedName) {
        setName(savedName);
        setWhatsapp(savedWhatsapp);
        setUsingSavedIdentity(true);
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  function onForgetSavedDetails() {
    lsRemove(storageKey);
    setUsingSavedIdentity(false);
    setHasAutoStarted(false);
    setName("");
    setWhatsapp("");
  }

  useEffect(() => {
    if (!usingSavedIdentity) return;
    if (!name.trim()) return;
    if (busy || hasAutoStarted) return;
    setHasAutoStarted(true);
    void onStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usingSavedIdentity, name, busy, hasAutoStarted]);

  async function onStart() {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (!quizId) {
      setError("Missing quiz id in URL");
      return;
    }

    lsSet(storageKey, JSON.stringify({ name: cleanName, whatsapp: whatsapp.trim() || null }));

    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/attempts/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quizId, cohort }),
      });
      const data = (await res.json()) as StartResp | { error?: string };
      if (!res.ok) throw new Error("error" in data && data.error ? data.error : "Failed to start");
      if (!("attemptId" in data)) throw new Error("Failed to start");

      lsSet(
        `bcq.attempt.${data.attemptId}`,
        JSON.stringify({ ...data, displayName: cleanName, whatsapp: whatsapp.trim() || null })
      );
      router.push(`/q/${quizId}/play?cohort=${encodeURIComponent(cohort)}&attemptId=${encodeURIComponent(data.attemptId)}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to start";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#1d1b18]">
      <div className="mx-auto flex w-full max-w-xl flex-col justify-center p-6">
        <Card className="animate-in fade-in-0 slide-in-from-bottom-2 rounded-md border-[#dfd5c7] bg-white shadow-none duration-400">
          <CardHeader>
            <CardTitle className="font-display text-3xl font-semibold text-[#1f1d1a]">Join quiz</CardTitle>
            <CardDescription className="text-[#655b50]">
              Quiz: <span className="font-mono">{quizId || "(missing)"}</span> · Timed: 6 minutes · Cohort:{" "}
              <span className="font-mono">{cohort}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {usingSavedIdentity && name.trim() ? (
              <>
                <div className="text-sm text-[#655b50]">
                  You are signed in as <span className="font-medium text-[#1d1b18]">{name}</span>
                  {whatsapp ? <span> ({whatsapp})</span> : null}
                </div>
                <Button disabled className="w-full rounded-md bg-[#1d1b18] text-white">
                  {busy ? `Loading quiz for ${name}...` : "Preparing your quiz..."}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onForgetSavedDetails}
                  className="w-full rounded-md border-[#d6ccbe] bg-white text-[#2f2a24] hover:bg-[#f3ede4]"
                >
                  Forget saved details
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#2f2a24]">Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="rounded-md border-[#d6ccbe] bg-[#fffcf7] transition-colors duration-200 focus-visible:border-[#b9aa95]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#2f2a24]">WhatsApp phone (optional)</label>
                  <Input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+91..."
                    className="rounded-md border-[#d6ccbe] bg-[#fffcf7] transition-colors duration-200 focus-visible:border-[#b9aa95]"
                  />
                  <p className="text-xs text-[#7a6f62]">Saved locally on this device for next time.</p>
                </div>
                <Button
                  disabled={busy || !name.trim() || !quizId}
                  onClick={onStart}
                  className="w-full rounded-md bg-[#1d1b18] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#11100e]"
                >
                  {busy ? "Loading quiz..." : "Start quiz"}
                </Button>
              </>
            )}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
