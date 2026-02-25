"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminHeaders, readAdminKey } from "@/lib/admin-client";

export default function AdminAnalytics() {
  const adminKey = useMemo(() => {
    return readAdminKey();
  }, []);

  const [quizId, setQuizId] = useState("sophies-world-ch1-3-adult-cohort-v1");
  const [cohort, setCohort] = useState("cohort-3");
  type AnalyticsResp = {
    submissions: number;
    avgScorePct: number | null;
    avgDurationMs: number | null;
    buckets: Array<{ bucket: string; count: number }>;
  };

  const [data, setData] = useState<AnalyticsResp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/analytics?quizId=${encodeURIComponent(quizId)}&cohort=${encodeURIComponent(cohort)}`, {
        headers: adminHeaders(adminKey),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed");
      setData(j);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
      setData(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#1d1b18]">
      <div className="mx-auto flex w-full max-w-4xl flex-col justify-center gap-4 p-6">
      <Card className="rounded-md border-[#dfd5c7] bg-white shadow-none animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Analytics</CardTitle>
          <CardDescription className="text-[#655b50]">Basic cohort stats (no per-question breakdown yet).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {err ? <div className="text-sm text-red-600">{err}</div> : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[#2f2a24]">quizId</Label>
              <Input value={quizId} onChange={(e) => setQuizId(e.target.value)} className="rounded-md border-[#d6ccbe] bg-[#fffcf7]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#2f2a24]">cohort</Label>
              <Input value={cohort} onChange={(e) => setCohort(e.target.value)} className="rounded-md border-[#d6ccbe] bg-[#fffcf7]" />
            </div>
          </div>

          <Button
            onClick={load}
            disabled={busy || !quizId.trim() || !cohort.trim()}
            className="rounded-md bg-[#1d1b18] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#11100e]"
          >
            {busy ? "Loading…" : "Load"}
          </Button>

          {data ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-[#dfd5c7] bg-[#fffcf7] p-4">
                  <div className="text-xs text-[#7a6f62]">Submissions</div>
                  <div className="text-2xl font-semibold">{data.submissions}</div>
                </div>
                <div className="rounded-md border border-[#dfd5c7] bg-[#fffcf7] p-4">
                  <div className="text-xs text-[#7a6f62]">Avg score</div>
                  <div className="text-2xl font-semibold">{data.avgScorePct ? data.avgScorePct.toFixed(1) : "—"}%</div>
                </div>
                <div className="rounded-md border border-[#dfd5c7] bg-[#fffcf7] p-4">
                  <div className="text-xs text-[#7a6f62]">Avg time</div>
                  <div className="text-2xl font-semibold">
                    {data.avgDurationMs ? `${Math.round(data.avgDurationMs / 1000)}s` : "—"}
                  </div>
                </div>
              </div>

              <Table className="rounded-md border border-[#e7ddcf]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Bucket</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.buckets || []).map((b) => (
                    <TableRow key={b.bucket} className="transition-colors hover:bg-[#f7f2e9]">
                      <TableCell>{b.bucket}</TableCell>
                      <TableCell className="text-right">{b.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
      </div>
    </main>
  );
}
