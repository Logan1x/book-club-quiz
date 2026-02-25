"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { adminHeaders, saveAdminKey, readAdminKey } from "@/lib/admin-client";

export default function AdminHome() {
  const [keyInput, setKeyInput] = useState("");
  const [authState, setAuthState] = useState<"checking" | "authorized" | "unauthorized">("checking");
  const [err, setErr] = useState<string | null>(null);

  async function verifyKey(candidate: string, persist = false) {
    setAuthState("checking");
    setErr(null);
    try {
      const res = await fetch("/api/admin/cohorts", { headers: adminHeaders(candidate) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Unauthorized");

      if (persist) saveAdminKey(candidate);
      setAuthState("authorized");
    } catch (e: unknown) {
      setAuthState("unauthorized");
      setErr(e instanceof Error ? e.message : "Unauthorized");
    }
  }

  useEffect(() => {
    const saved = readAdminKey();
    setKeyInput(saved);
    void (async () => {
      setAuthState("checking");
      setErr(null);
      try {
        const res = await fetch("/api/admin/cohorts", { headers: adminHeaders(saved) });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || "Unauthorized");
        setAuthState("authorized");
      } catch (e: unknown) {
        setAuthState("unauthorized");
        setErr(e instanceof Error ? e.message : "Unauthorized");
      }
    })();
  }, []);

  function onUnlock() {
    void verifyKey(keyInput, true);
  }

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#1d1b18]">
      <div className="mx-auto flex w-full max-w-3xl flex-col justify-center gap-4 p-6">
      <Card className="rounded-md border-[#dfd5c7] bg-white shadow-none animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Admin</CardTitle>
          <CardDescription className="text-[#655b50]">Manage cohorts, imports, and analytics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {authState === "authorized" ? (
            <>
              <div className="text-sm text-[#5f564c]">Access granted.</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Link
                  className="rounded-md border border-[#d6ccbe] bg-[#fffcf7] px-4 py-3 text-sm font-semibold text-[#2f2a24] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f3ede4]"
                  href="/admin/cohorts"
                >
                  Cohorts
                </Link>
                <Link
                  className="rounded-md border border-[#d6ccbe] bg-[#fffcf7] px-4 py-3 text-sm font-semibold text-[#2f2a24] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f3ede4]"
                  href="/admin/quizzes/import"
                >
                  Import quiz
                </Link>
                <Link
                  className="rounded-md border border-[#d6ccbe] bg-[#fffcf7] px-4 py-3 text-sm font-semibold text-[#2f2a24] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f3ede4]"
                  href="/admin/analytics"
                >
                  Analytics
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Enter admin key"
                  className="rounded-md border-[#d6ccbe] bg-[#fffcf7]"
                />
                <Button
                  onClick={onUnlock}
                  disabled={authState === "checking"}
                  className="rounded-md bg-[#1d1b18] text-white hover:bg-[#11100e]"
                >
                  {authState === "checking" ? "Checking..." : "Unlock"}
                </Button>
              </div>
              {err ? <div className="text-sm text-red-600">{err}</div> : null}
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </main>
  );
}
