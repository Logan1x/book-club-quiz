"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// MVP placeholder: until Neon is wired, we can only show "your" last result (from localStorage).
function lsGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export default function LeaderboardPage({ params }: { params: { quizId: string } }) {
  const sp = useSearchParams();
  const cohort = sp.get("cohort") || "cohort-1";

  const myLast = useMemo(() => {
    // naive scan of localStorage keys
    const items: Array<{ attemptId: string; quizId: string; cohort?: string; displayName?: string; correct: number; total: number; scorePct: number; durationMs: number }> = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || "";
        if (!k.startsWith("bcq.result.")) continue;
        const raw = lsGet(k);
        if (!raw) continue;
        const j = JSON.parse(raw) as { attemptId?: string; quizId?: string; cohort?: string; displayName?: string; correct?: number; total?: number; scorePct?: number; durationMs?: number };
        if (
          j?.attemptId &&
          j?.quizId === params.quizId &&
          (j?.cohort || cohort) === cohort &&
          typeof j.correct === "number" &&
          typeof j.total === "number" &&
          typeof j.scorePct === "number" &&
          typeof j.durationMs === "number"
        ) {
          items.push({
            attemptId: j.attemptId,
            quizId: j.quizId,
            cohort: j.cohort,
            displayName: j.displayName,
            correct: j.correct,
            total: j.total,
            scorePct: j.scorePct,
            durationMs: j.durationMs,
          });
        }
      }
    } catch {
      // ignore
    }
    items.sort((a, b) => (b.scorePct - a.scorePct) || (a.durationMs - b.durationMs));
    return items.slice(0, 10);
  }, [params.quizId, cohort]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard (MVP)</CardTitle>
          <CardDescription>
            Cohort: <span className="font-mono">{cohort}</span> · This is currently device-local.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {myLast.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No attempts yet on this device.
                  </TableCell>
                </TableRow>
              ) : (
                myLast.map((r, i) => (
                  <TableRow key={r.attemptId}>
                    <TableCell>#{i + 1}</TableCell>
                    <TableCell>{r.displayName || "(anon)"}</TableCell>
                    <TableCell>
                      {r.correct}/{r.total}
                    </TableCell>
                    <TableCell>{Math.round(r.durationMs / 1000)}s</TableCell>
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
