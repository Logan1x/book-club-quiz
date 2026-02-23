"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = {
  rank: number;
  attemptId: string;
  displayName: string | null;
  whatsapp: string | null;
  correct: number | null;
  total: number | null;
  scorePct: number | null;
  durationMs: number | null;
  submittedAt: number | null;
};

export default function LeaderboardPage() {
  const sp = useSearchParams();
  const cohort = sp.get("cohort") || "cohort-1";
  const p = useParams<{ quizId?: string | string[] }>();
  const quizId = String(Array.isArray(p?.quizId) ? p?.quizId[0] : p?.quizId || "");

  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId) return;

    let alive = true;

    fetch(`/api/leaderboard?quizId=${encodeURIComponent(quizId)}&cohort=${encodeURIComponent(cohort)}&limit=50`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!alive) return;
        if (!ok) throw new Error(j?.error || "Failed to load leaderboard");
        setErr(null);
        setRows(j.leaderboard as Row[]);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load leaderboard");
        setRows([]);
      });

    return () => {
      alive = false;
    };
  }, [quizId, cohort]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>
            Quiz: <span className="font-mono">{quizId}</span> · Cohort:{" "}
            <span className="font-mono">{cohort}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {err ? <div className="mb-3 text-sm text-red-600">{err}</div> : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows === null ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No submissions yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.attemptId}>
                    <TableCell>#{r.rank}</TableCell>
                    <TableCell>{r.displayName || "(anon)"}</TableCell>
                    <TableCell>
                      {r.correct ?? 0}/{r.total ?? 0}
                    </TableCell>
                    <TableCell>{Math.round((r.durationMs ?? 0) / 1000)}s</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
