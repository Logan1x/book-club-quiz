"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toPng } from "html-to-image";
import { cohortLabel } from "@/lib/cohort";

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

function fmtSeconds(ms: number | null) {
  const s = Math.max(0, Math.round((ms ?? 0) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function initials(name: string | null) {
  const v = (name || "").trim();
  if (!v) return "?";
  const parts = v.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function relTime(ts: number | null) {
  if (!ts) return "—";
  const d = Date.now() - ts;
  const m = Math.round(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const days = Math.round(h / 24);
  return `${days}d ago`;
}

export default function LeaderboardPage() {
  const sp = useSearchParams();
  const cohort = sp.get("cohort") || "cohort-3";
  const p = useParams<{ quizId?: string | string[] }>();
  const quizId = String(Array.isArray(p?.quizId) ? p?.quizId[0] : p?.quizId || "");

  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const shareRef = useRef<HTMLDivElement | null>(null);

  const identity = useMemo(() => {
    try {
      const raw = localStorage.getItem("bcq.identity");
      if (!raw) return { name: "", whatsapp: "" };
      const j = JSON.parse(raw) as { name?: string; whatsapp?: string | null };
      return { name: String(j?.name || ""), whatsapp: String(j?.whatsapp || "") };
    } catch {
      return { name: "", whatsapp: "" };
    }
  }, []);

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

  const stats = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const best = rows[0];
    const me = rows.find(
      (r) =>
        (identity.name && r.displayName?.trim() === identity.name.trim()) ||
        (identity.whatsapp && r.whatsapp?.trim() === identity.whatsapp.trim())
    );
    return {
      total: rows.length,
      best,
      me,
    };
  }, [rows, identity.name, identity.whatsapp]);

  async function onShareLeaderboard() {
    if (!shareRef.current) return;
    setShareBusy(true);
    try {
      const node = shareRef.current;
      const rect = node.getBoundingClientRect();
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height),
        style: {
          left: "0px",
          top: "0px",
        },
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "leaderboard.png", { type: "image/png" });

      const nav = navigator as unknown as {
        share?: (data: unknown) => Promise<void>;
      };
      if (nav.share) {
        try {
          await nav.share({ files: [file], title: "Leaderboard" });
          return;
        } catch {
          // fallthrough
        }
      }

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "leaderboard.png";
      a.click();
    } finally {
      setShareBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>
                Quiz: <span className="font-mono">{quizId}</span> · Cohort:{" "}
                <span className="font-mono">{cohortLabel(cohort)}</span>
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Ranked by score ↓ then time ↑</Badge>
              {stats?.total ? <Badge variant="outline">{stats.total} submissions</Badge> : null}
              <Button variant="secondary" onClick={onShareLeaderboard} disabled={shareBusy || rows === null}>
                {shareBusy ? "Preparing…" : "Share image"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Offscreen share card (Top 10) */}
          <div
            ref={shareRef}
            style={{ position: "fixed", left: -9999, top: 0, width: 720, padding: 24, background: "white", color: "black" }}
          >
            <div style={{ fontSize: 14, opacity: 0.7 }}>Book Club Quiz</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>Leaderboard</div>
            <div style={{ fontSize: 14, marginTop: 4, opacity: 0.75 }}>
              {quizId} · {cohortLabel(cohort)}
            </div>
            <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb" }} />
            <div style={{ marginTop: 12 }}>
              {(rows || []).slice(0, 10).map((r) => (
                <div
                  key={r.attemptId}
                  style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}
                >
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 42, fontWeight: 700 }}>#{r.rank}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.displayName || "(anon)"}</div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>Time: {fmtSeconds(r.durationMs)} · Submitted {relTime(r.submittedAt)}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    {(r.correct ?? 0)}/{(r.total ?? 0)} ({r.scorePct ?? 0}%)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {err ? <div className="text-sm text-red-600">{err}</div> : null}

          {stats?.me ? (
            <div className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Your best (this device identity)</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge>#{stats.me.rank}</Badge>
                    <span className="truncate font-medium">{stats.me.displayName || "(anon)"}</span>
                    <Badge variant="outline">{stats.me.correct ?? 0}/{stats.me.total ?? 0}</Badge>
                    <Badge variant="secondary">{stats.me.scorePct ?? 0}%</Badge>
                    <span className="text-xs text-muted-foreground">{fmtSeconds(stats.me.durationMs)}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{relTime(stats.me.submittedAt)}</div>
              </div>
            </div>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Time</TableHead>
                <TableHead className="text-right">Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows === null ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No submissions yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const isMe =
                    (identity.name && r.displayName?.trim() === identity.name.trim()) ||
                    (identity.whatsapp && r.whatsapp?.trim() === identity.whatsapp.trim());
                  const top3 = r.rank <= 3;

                  return (
                    <TableRow key={r.attemptId} className={isMe ? "bg-muted/40" : undefined}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={top3 ? "default" : "secondary"}>#{r.rank}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{initials(r.displayName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {r.displayName || "(anon)"}{isMe ? " (you)" : ""}
                            </div>
                            <div className="text-xs text-muted-foreground">Attempt: {r.attemptId.slice(0, 8)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant="outline">{r.correct ?? 0}/{r.total ?? 0}</Badge>
                          <Badge variant="secondary">{r.scorePct ?? 0}%</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{fmtSeconds(r.durationMs)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground" title={r.submittedAt ? new Date(r.submittedAt).toLocaleString() : ""}>
                        {relTime(r.submittedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
