import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/store";
import { modeInfo } from "@/lib/views";
import { TOOLS } from "@/lib/tools";
import type { Bounty } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ bounties: db.listBounties(), modes: modeInfo() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const now = new Date().toISOString();

  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const allowedTools: string[] = Array.isArray(body.allowedTools)
    ? body.allowedTools
    : Object.keys(TOOLS);

  const bounty: Bounty = {
    id: nanoid(10),
    creatorId: String(body.creatorId ?? "anon"),
    creatorWallet: body.creatorWallet ? String(body.creatorWallet) : undefined,
    title,
    description: String(body.description ?? ""),
    category: String(body.category ?? "research"),
    deliverableFormat: String(body.deliverableFormat ?? "Numbered list"),
    verificationCriteria: String(
      body.verificationCriteria ?? "Output meets the task requirements.",
    ),
    budgetUsdc: String(body.budgetUsdc ?? "10"),
    maxToolSpendUsdc: String(body.maxToolSpendUsdc ?? "1"),
    deadline: String(
      body.deadline ?? new Date(Date.now() + 86400000).toISOString(),
    ),
    allowedTools,
    manualApprovalRequired: Boolean(body.manualApprovalRequired ?? true),
    minVerifierScore: Number(body.minVerifierScore ?? 70),
    outreachMode: (["email", "call", "both", "none"].includes(String(body.outreachMode))
      ? body.outreachMode
      : "email") as Bounty["outreachMode"],
    status: "funding_required",
    createdAt: now,
    updatedAt: now,
  };

  db.saveBounty(bounty);
  return NextResponse.json({ bounty }, { status: 201 });
}
