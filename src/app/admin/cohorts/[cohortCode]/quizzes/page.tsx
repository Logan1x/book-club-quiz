"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminHeaders, readAdminKey } from "@/lib/admin-client";

type Row = { quizId: string; title: string; enabled: boolean };

export default function CohortQuizAdmin() {
  const p = useParams<{ cohortCode?: string | string[] }>();
  const cohortCode = String(Array.isArray(p?.cohortCode) ? p?.cohortCode[0] : p?.cohortCode || "");

  const adminKey = useMemo(() => {
    return readAdminKey();
  }, []);

  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/admin/cohorts/${encodeURIComponent(cohortCode)}/quizzes`, {
      headers: adminHeaders(adminKey),
    });
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
    const res = await fetch(`/api/admin/cohorts/${encodeURIComponent(cohortCode)}/quizzes`, {
      method: "POST",
      headers: { "content-type": "application/json", ...adminHeaders(adminKey) },
      body: JSON.stringify({ quizId, enabled }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || "Failed");
    await load();
  }

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#1d1b18]">
      <div className="mx-auto flex w-full max-w-4xl flex-col justify-center gap-4 p-6">
      <Card className="rounded-md border-[#dfd5c7] bg-white shadow-none animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Quizzes for {cohortCode}</CardTitle>
          <CardDescription className="text-[#655b50]">Enable/disable quizzes for this cohort.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {err ? <div className="text-sm text-red-600">{err}</div> : null}
          <Table className="rounded-md border border-[#e7ddcf]">
            <TableHeader>
              <TableRow>
                <TableHead>Quiz</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.quizId} className="transition-colors hover:bg-[#f7f2e9]">
                  <TableCell>
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-[#7a6f62] font-mono">{r.quizId}</div>
                  </TableCell>
                  <TableCell>{r.enabled ? <Badge>Enabled</Badge> : <Badge variant="secondary">Disabled</Badge>}</TableCell>
                  <TableCell className="text-right">
                    {r.enabled ? (
                      <Button
                        variant="secondary"
                        onClick={() => toggle(r.quizId, false)}
                        className="rounded-md border border-[#d6ccbe] bg-white text-[#2f2a24] hover:bg-[#f3ede4]"
                      >
                        Disable
                      </Button>
                    ) : (
                      <Button
                        onClick={() => toggle(r.quizId, true)}
                        className="rounded-md bg-[#1d1b18] text-white hover:bg-[#11100e]"
                      >
                        Enable
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </main>
  );
}
