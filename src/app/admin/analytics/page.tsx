"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminAnalytics() {
  const adminKey = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("key") || "";
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
      const qs = adminKey ? `&key=${encodeURIComponent(adminKey)}` : "";
      const res = await fetch(`/api/admin/analytics?quizId=${encodeURIComponent(quizId)}&cohort=${encodeURIComponent(cohort)}${qs}`);
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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>Basic cohort stats (no per-question breakdown yet).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {err ? <div className="text-sm text-red-600">{err}</div> : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>quizId</Label>
              <Input value={quizId} onChange={(e) => setQuizId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>cohort</Label>
              <Input value={cohort} onChange={(e) => setCohort(e.target.value)} />
            </div>
          </div>

          <Button onClick={load} disabled={busy || !quizId.trim() || !cohort.trim()}>
            {busy ? "Loading…" : "Load"}
          </Button>

          {data ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground">Submissions</div>
                  <div className="text-2xl font-semibold">{data.submissions}</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground">Avg score</div>
                  <div className="text-2xl font-semibold">{data.avgScorePct ? data.avgScorePct.toFixed(1) : "—"}%</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground">Avg time</div>
                  <div className="text-2xl font-semibold">
                    {data.avgDurationMs ? `${Math.round(data.avgDurationMs / 1000)}s` : "—"}
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bucket</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.buckets || []).map((b) => (
                    <TableRow key={b.bucket}>
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
    </main>
  );
}
