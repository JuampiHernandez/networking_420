import { NextResponse } from "next/server";
import { bountyView } from "@/lib/views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const view = bountyView(id);
  if (!view) {
    return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
  }
  return NextResponse.json(view);
}
