import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/store";
import { getChainMode, simTxHash, serverConfig } from "@/lib/config";
import { verifyFundingTx } from "@/lib/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const bounty = db.getBounty(id);
  if (!bounty) {
    return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const realMode = getChainMode() === "real";
  const escrow =
    serverConfig.toolSellerAddress ??
    process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
    "";

  if (realMode) {
    const txHash = body.txHash ? String(body.txHash) : "";
    if (!txHash || !txHash.startsWith("0x")) {
      return NextResponse.json(
        {
          error:
            "Real on-chain funding required. Connect your wallet and confirm the USDC transfer in Privy — no simulated escrow is accepted in live mode.",
        },
        { status: 400 },
      );
    }
    if (!escrow) {
      return NextResponse.json(
        { error: "Escrow address is not configured (NEXT_PUBLIC_ESCROW_ADDRESS / TOOL_SELLER_ADDRESS)." },
        { status: 500 },
      );
    }

    const verified = await verifyFundingTx(txHash, escrow, bounty.budgetUsdc);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 400 });
    }

    if (body.creatorWallet) bounty.creatorWallet = String(body.creatorWallet);
    bounty.escrowTxHash = txHash;
    bounty.escrowOnChain = true;
    bounty.status = "open";
    bounty.updatedAt = new Date().toISOString();
    db.saveBounty(bounty);

    return NextResponse.json({
      bounty,
      escrowTxHash: txHash,
      onChain: true,
      explorer: `https://sepolia.basescan.org/tx/${txHash}`,
    });
  }

  // Sim mode — local demo only
  const txHash = simTxHash(`escrow:${id}`);
  if (body.creatorWallet) bounty.creatorWallet = String(body.creatorWallet);
  bounty.escrowTxHash = txHash;
  bounty.escrowOnChain = false;
  bounty.status = "open";
  bounty.updatedAt = new Date().toISOString();
  db.saveBounty(bounty);

  return NextResponse.json({ bounty, escrowTxHash: txHash, onChain: false });
}
