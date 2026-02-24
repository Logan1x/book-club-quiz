import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cohorts } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    requireAdmin(req);
    const rows = await db
      .select({ cohortCode: cohorts.cohortCode, cohortName: cohorts.cohortName, createdAt: cohorts.createdAt })
      .from(cohorts)
      .orderBy(desc(cohorts.createdAt));
    return NextResponse.json({ cohorts: rows.map((r) => ({ ...r, createdAt: r.createdAt.getTime() })) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const cohortCode = String(body?.cohortCode || "").trim();
    const cohortName = String(body?.cohortName || "").trim();
    if (!cohortCode || !cohortName) return NextResponse.json({ error: "cohortCode and cohortName are required" }, { status: 400 });

    await db.insert(cohorts).values({ cohortCode, cohortName }).onConflictDoUpdate({
      target: cohorts.cohortCode,
      set: { cohortName },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    const status = msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
