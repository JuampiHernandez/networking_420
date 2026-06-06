import { NextResponse } from "next/server";
import { db } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  db.reset();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  db.reset();
  return NextResponse.json({ ok: true });
}
