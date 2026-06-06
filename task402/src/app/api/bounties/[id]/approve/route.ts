import { NextResponse } from "next/server";
import { db } from "@/lib/store";
import { approveAndPayout, ChainTransferError } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const bounty = db.getBounty(id);
  if (!bounty) {
    return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
  }
  try {
    const result = await approveAndPayout(bounty);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof ChainTransferError) {
      return NextResponse.json(
        { error: err.message, details: err.details },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "approval failed";
    console.error(`[approve] ${id}:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
