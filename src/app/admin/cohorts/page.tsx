"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminHeaders, readAdminKey } from "@/lib/admin-client";

type Cohort = { cohortCode: string; cohortName: string; createdAt: number };

export default function AdminCohorts() {
  const [rows, setRows] = useState<Cohort[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [code, setCode] = useState("cohort-3");
  const [name, setName] = useState("Cohort 3");

  const adminKey = useMemo(() => {
    return readAdminKey();
  }, []);

  async function load() {
    setErr(null);
    const res = await fetch(`/api/admin/cohorts`, { headers: adminHeaders(adminKey) });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error || "Failed");
    setRows(j.cohorts || []);
  }

  useEffect(() => {
    load().catch((e) => setErr(e instanceof Error ? e.message : "Failed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/cohorts`, {
        method: "POST",
        headers: { "content-type": "application/json", ...adminHeaders(adminKey) },
        body: JSON.stringify({ cohortCode: code.trim(), cohortName: name.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed");
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-[#1d1b18]">
      <div className="mx-auto flex w-full max-w-4xl flex-col justify-center gap-4 p-6">
      <Card className="rounded-md border-[#dfd5c7] bg-white shadow-none animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <CardHeader>
          <CardTitle className="font-display text-3xl">Cohorts</CardTitle>
          <CardDescription className="text-[#655b50]">Create/edit cohorts and enable quizzes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {err ? <div className="text-sm text-red-600">{err}</div> : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[#2f2a24]">Cohort code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="cohort-3"
                className="rounded-md border-[#d6ccbe] bg-[#fffcf7]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#2f2a24]">Display name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Cohort 3"
                className="rounded-md border-[#d6ccbe] bg-[#fffcf7]"
              />
            </div>
          </div>
          <Button
            onClick={onSave}
            disabled={busy || !code.trim() || !name.trim()}
            className="rounded-md bg-[#1d1b18] text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#11100e]"
          >
            {busy ? "Saving…" : "Save cohort"}
          </Button>

          <Table className="rounded-md border border-[#e7ddcf]">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Quizzes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.cohortCode} className="transition-colors hover:bg-[#f7f2e9]">
                  <TableCell className="font-mono">{c.cohortCode}</TableCell>
                  <TableCell>{c.cohortName}</TableCell>
                  <TableCell>
                      <Link
                        className="inline-flex rounded-md border border-[#d6ccbe] bg-[#fffcf7] px-2.5 py-1 text-xs font-semibold text-[#2f2a24] transition-colors hover:bg-[#f3ede4]"
                        href={`/admin/cohorts/${encodeURIComponent(c.cohortCode)}/quizzes`}
                      >
                        Manage
                      </Link>
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
