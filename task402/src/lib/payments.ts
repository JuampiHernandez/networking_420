import { db } from "./store";
import { transferUsdc, ChainTransferError } from "./chain";
import { emitEvent } from "./events";
import { explorerTx, getChainMode, serverConfig, PLATFORM_FEE_RATE } from "./config";
import type { Bounty } from "./types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export type LedgerRow = {
  label: string;
  detail: string;
  amountUsdc: string;
  direction: "in" | "out" | "neutral";
  txHash?: string;
  onChain?: boolean;
  error?: string;
};

/**
 * Approve a submission and settle, charging the creator only for what the agent
 * actually spent on tools plus a small platform fee:
 *
 *   creator is charged = toolSpend + (toolSpend * PLATFORM_FEE_RATE)
 *   creator refund     = budget − that charge        (escrow → creator)
 *   agent reimbursed   = toolSpend                    (escrow → agent, fronted x402 costs)
 *   platform keeps     = the fee
 *
 * The agent never pockets the leftover budget — it is returned to the creator.
 */
export async function approveAndPayout(bounty: Bounty): Promise<{
  refundTxHash?: string;
  reimbursementTxHash?: string;
  creatorRefund: string;
  agentReimbursement: string;
  platformFee: string;
  toolSpend: string;
  onChain: boolean;
}> {
  const run = db.getRunByBounty(bounty.id);
  const submission = db.getSubmissionByBounty(bounty.id);
  const toolSpend = round2(Number(run?.totalToolSpendUsdc ?? "0"));
  const budget = Number(bounty.budgetUsdc);
  const fee = round2(toolSpend * PLATFORM_FEE_RATE);
  const creatorCharge = round2(toolSpend + fee);
  const refund = Math.max(0, round2(budget - creatorCharge));

  if (getChainMode() === "real" && !bounty.escrowOnChain) {
    throw new ChainTransferError(
      "This bounty was never funded on-chain. Use Fund with your wallet first — the escrow needs real USDC on Base Sepolia before settlement.",
    );
  }

  const agentWallet =
    run?.agentWalletAddress ??
    serverConfig.toolSellerAddress ??
    "0xSIMULATED_AGENT_WALLET";
  const creatorWallet =
    bounty.creatorWallet ?? serverConfig.toolSellerAddress ?? "0xCREATOR";

  // Reimburse the agent the USDC it fronted for x402 tool calls (nets ~0).
  let reimbursementTxHash: string | undefined;
  let reimbursementSimulated = true;
  if (toolSpend > 0) {
    const r = await transferUsdc(
      agentWallet,
      toolSpend.toFixed(2),
      `tool-reimbursement:${bounty.id}`,
    );
    reimbursementTxHash = r.txHash;
    reimbursementSimulated = r.simulated;
  }

  // Refund the unused budget to the creator.
  let refundTxHash: string | undefined;
  let refundSimulated = true;
  if (refund > 0) {
    const r = await transferUsdc(
      creatorWallet,
      refund.toFixed(2),
      `refund:${bounty.id}`,
    );
    refundTxHash = r.txHash;
    refundSimulated = r.simulated;
  }

  const onChain = !reimbursementSimulated || !refundSimulated;

  bounty.status = "paid";
  bounty.payoutTxHash = reimbursementTxHash;
  bounty.payoutOnChain = !reimbursementSimulated;
  bounty.agentReimbursementUsdc = toolSpend.toFixed(2);
  bounty.refundTxHash = refundTxHash;
  bounty.refundOnChain = !refundSimulated;
  bounty.creatorRefundUsdc = refund.toFixed(2);
  bounty.platformFeeUsdc = fee.toFixed(2);
  bounty.updatedAt = new Date().toISOString();
  db.saveBounty(bounty);

  if (submission) {
    submission.status = "accepted";
    db.saveSubmission(submission);
  }
  if (run) {
    run.status = "accepted";
    db.saveRun(run);
    emitEvent(
      run.id,
      bounty.id,
      "payout",
      `Settled: creator charged ${creatorCharge.toFixed(2)} USDC (tools ${toolSpend.toFixed(2)} + fee ${fee.toFixed(2)}); ${refund.toFixed(2)} USDC refunded to creator`,
      {
        toolSpend: toolSpend.toFixed(2),
        platformFee: fee.toFixed(2),
        creatorCharge: creatorCharge.toFixed(2),
        creatorRefund: refund.toFixed(2),
        agentReimbursement: toolSpend.toFixed(2),
        refundTxHash,
        reimbursementTxHash,
        onChain,
        explorerRefund: refundTxHash && !refundSimulated ? explorerTx(refundTxHash) : undefined,
        explorerReimbursement:
          reimbursementTxHash && !reimbursementSimulated ? explorerTx(reimbursementTxHash) : undefined,
        agentWallet,
        creatorWallet,
      },
    );
    emitEvent(run.id, bounty.id, "done", "Bounty settled", { status: "paid" });
  }

  return {
    refundTxHash,
    reimbursementTxHash,
    creatorRefund: refund.toFixed(2),
    agentReimbursement: toolSpend.toFixed(2),
    platformFee: fee.toFixed(2),
    toolSpend: toolSpend.toFixed(2),
    onChain,
  };
}

/**
 * Reject a submission: the creator pays only the real tool cost (no platform
 * fee on rejected work). Refund (budget − toolSpend) to the creator and
 * reimburse the agent the toolSpend it fronted. Settled in USDC on Base Sepolia.
 */
export async function rejectAndRefund(bounty: Bounty): Promise<{
  refundTxHash?: string;
  reimbursementTxHash?: string;
  refundAmount: string;
  agentReimbursement: string;
  onChain: boolean;
}> {
  const run = db.getRunByBounty(bounty.id);
  const submission = db.getSubmissionByBounty(bounty.id);
  const toolSpend = round2(Number(run?.totalToolSpendUsdc ?? "0"));
  const budget = Number(bounty.budgetUsdc);
  const refund = Math.max(0, round2(budget - toolSpend));

  if (getChainMode() === "real" && !bounty.escrowOnChain) {
    throw new ChainTransferError(
      "This bounty was never funded on-chain. Nothing to refund until you fund with a real Base Sepolia USDC transfer.",
    );
  }

  const agentWallet =
    run?.agentWalletAddress ??
    serverConfig.toolSellerAddress ??
    "0xSIMULATED_AGENT_WALLET";
  const creatorWallet =
    bounty.creatorWallet ?? serverConfig.toolSellerAddress ?? "0xCREATOR";

  let reimbursementTxHash: string | undefined;
  let reimbursementSimulated = true;
  if (toolSpend > 0) {
    const r = await transferUsdc(
      agentWallet,
      toolSpend.toFixed(2),
      `tool-reimbursement:${bounty.id}`,
    );
    reimbursementTxHash = r.txHash;
    reimbursementSimulated = r.simulated;
  }

  let refundTxHash: string | undefined;
  let refundSimulated = true;
  if (refund > 0) {
    const r = await transferUsdc(
      creatorWallet,
      refund.toFixed(2),
      `refund:${bounty.id}`,
    );
    refundTxHash = r.txHash;
    refundSimulated = r.simulated;
  }

  const onChain = !reimbursementSimulated || !refundSimulated;

  bounty.status = "rejected";
  bounty.refundTxHash = refundTxHash;
  bounty.refundOnChain = !refundSimulated;
  bounty.creatorRefundUsdc = refund.toFixed(2);
  bounty.payoutTxHash = reimbursementTxHash;
  bounty.payoutOnChain = !reimbursementSimulated;
  bounty.agentReimbursementUsdc = toolSpend.toFixed(2);
  bounty.platformFeeUsdc = "0.00";
  bounty.updatedAt = new Date().toISOString();
  db.saveBounty(bounty);

  if (submission) {
    submission.status = "rejected";
    db.saveSubmission(submission);
  }
  if (run) {
    run.status = "rejected";
    db.saveRun(run);
    emitEvent(
      run.id,
      bounty.id,
      "payout",
      `Rejected — ${refund.toFixed(2)} USDC refunded to creator (only the ${toolSpend.toFixed(2)} USDC tool cost was charged, no fee)`,
      {
        refund: refund.toFixed(2),
        agentReimbursement: toolSpend.toFixed(2),
        refundTxHash,
        reimbursementTxHash,
        onChain,
        explorer: refundTxHash && !refundSimulated ? explorerTx(refundTxHash) : undefined,
      },
    );
  }

  return {
    refundTxHash,
    reimbursementTxHash,
    refundAmount: refund.toFixed(2),
    agentReimbursement: toolSpend.toFixed(2),
    onChain,
  };
}

/**
 * Build the payment ledger for a bounty (funding, tool spends, payout/refund).
 */
export function buildLedger(bounty: Bounty): LedgerRow[] {
  const run = db.getRunByBounty(bounty.id);
  const rows: LedgerRow[] = [];

  if (bounty.escrowTxHash) {
    rows.push({
      label: "Bounty funded",
      detail: "Creator → escrow (Base Sepolia)",
      amountUsdc: Number(bounty.budgetUsdc).toFixed(2),
      direction: "in",
      txHash: bounty.escrowTxHash,
      onChain: bounty.escrowOnChain ?? getChainMode() === "real",
    });
  }

  if (run) {
    for (const tc of db.listToolCalls(run.id)) {
      if (tc.status === "succeeded") {
        rows.push({
          label: `Tool: ${tc.toolName}`,
          detail: `Agent → tool seller · ${tc.endpoint}`,
          amountUsdc: Number(tc.priceUsdc).toFixed(2),
          direction: "out",
          txHash: tc.paymentTxHash,
          onChain: getChainMode() === "real" && Boolean(tc.paymentTxHash),
        });
      }
    }
  }

  if (bounty.platformFeeUsdc && Number(bounty.platformFeeUsdc) > 0) {
    rows.push({
      label: "Platform fee",
      detail: `Service fee on tool spend (${Math.round(PLATFORM_FEE_RATE * 100)}%)`,
      amountUsdc: Number(bounty.platformFeeUsdc).toFixed(2),
      direction: "out",
    });
  }
  if (bounty.payoutTxHash) {
    rows.push({
      label: "Agent tool-cost reimbursement",
      detail: "Escrow → agent wallet (covers x402 spend)",
      amountUsdc: Number(
        bounty.agentReimbursementUsdc ?? run?.totalToolSpendUsdc ?? "0",
      ).toFixed(2),
      direction: "out",
      txHash: bounty.payoutTxHash,
      onChain: bounty.payoutOnChain,
    });
  }
  if (bounty.refundTxHash) {
    const toolSpend = Number(run?.totalToolSpendUsdc ?? "0");
    rows.push({
      label: "Creator refund (unused budget)",
      detail: "Escrow → creator wallet (Base Sepolia)",
      amountUsdc: Number(
        bounty.creatorRefundUsdc ??
          Math.max(0, Number(bounty.budgetUsdc) - toolSpend),
      ).toFixed(2),
      direction: "in",
      txHash: bounty.refundTxHash,
      onChain: bounty.refundOnChain,
    });
  }

  return rows;
}

export { ChainTransferError };
