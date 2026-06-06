import { NextResponse } from "next/server";
import { db } from "@/lib/store";
import { runAgentOnBounty } from "@/lib/agent";

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
  if (bounty.status === "running") {
    // Idempotent: duplicate clicks while a run is active should attach to SSE, not error.
    return NextResponse.json({ started: true, bountyId: id, alreadyRunning: true });
  }
  if (bounty.status !== "open" && bounty.status !== "rejected") {
    return NextResponse.json(
      { error: `Bounty must be funded/open to run (status: ${bounty.status})` },
      { status: 400 },
    );
  }

  // Fire-and-forget; the UI streams progress over SSE.
  void runAgentOnBounty(bounty).catch(() => {});

  return NextResponse.json({ started: true, bountyId: id });
}
