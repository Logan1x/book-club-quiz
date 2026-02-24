"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Cohort = { cohortCode: string; cohortName: string; createdAt: number };

export default function AdminCohorts() {
  const [rows, setRows] = useState<Cohort[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [code, setCode] = useState("cohort-3");
  const [name, setName] = useState("Cohort 3");

  const adminKey = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("key") || "";
  }, []);

  async function load() {
    setErr(null);
    const qs = adminKey ? `?key=${encodeURIComponent(adminKey)}` : "";
    const res = await fetch(`/api/admin/cohorts${qs}`);
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
      const qs = adminKey ? `?key=${encodeURIComponent(adminKey)}` : "";
      const res = await fetch(`/api/admin/cohorts${qs}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Cohorts</CardTitle>
          <CardDescription>Create/edit cohorts and enable quizzes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {err ? <div className="text-sm text-red-600">{err}</div> : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Cohort code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="cohort-3" />
            </div>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cohort 3" />
            </div>
          </div>
          <Button onClick={onSave} disabled={busy || !code.trim() || !name.trim()}>
            {busy ? "Saving…" : "Save cohort"}
          </Button>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Quizzes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.cohortCode}>
                  <TableCell className="font-mono">{c.cohortCode}</TableCell>
                  <TableCell>{c.cohortName}</TableCell>
                  <TableCell>
                    <Link className="underline" href={`/admin/cohorts/${encodeURIComponent(c.cohortCode)}/quizzes${adminKey ? `?key=${encodeURIComponent(adminKey)}` : ""}`}>
                      Manage
                    </Link>
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
