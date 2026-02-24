"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Row = { quizId: string; title: string; enabled: boolean };

export default function CohortQuizAdmin() {
  const p = useParams<{ cohortCode?: string | string[] }>();
  const cohortCode = String(Array.isArray(p?.cohortCode) ? p?.cohortCode[0] : p?.cohortCode || "");

  const adminKey = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("key") || "";
  }, []);

  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const qs = adminKey ? `?key=${encodeURIComponent(adminKey)}` : "";
    const res = await fetch(`/api/admin/cohorts/${encodeURIComponent(cohortCode)}/quizzes${qs}`);
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || "Failed");
    setRows(j.quizzes || []);
  }

  useEffect(() => {
    if (!cohortCode) return;
    load().catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortCode]);

  async function toggle(quizId: string, enabled: boolean) {
    setErr(null);
    const qs = adminKey ? `?key=${encodeURIComponent(adminKey)}` : "";
    const res = await fetch(`/api/admin/cohorts/${encodeURIComponent(cohortCode)}/quizzes${qs}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quizId, enabled }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || "Failed");
    await load();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Quizzes for {cohortCode}</CardTitle>
          <CardDescription>Enable/disable quizzes for this cohort.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {err ? <div className="text-sm text-red-600">{err}</div> : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quiz</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.quizId}>
                  <TableCell>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.quizId}</div>
                  </TableCell>
                  <TableCell>{r.enabled ? <Badge>Enabled</Badge> : <Badge variant="secondary">Disabled</Badge>}</TableCell>
                  <TableCell className="text-right">
                    {r.enabled ? (
                      <Button variant="secondary" onClick={() => toggle(r.quizId, false)}>
                        Disable
                      </Button>
                    ) : (
                      <Button onClick={() => toggle(r.quizId, true)}>Enable</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
