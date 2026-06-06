"use client";

import { useEffect, useState } from "react";
import { addrUrl, shortAddr, txUrl, usd } from "@/lib/format";

type SystemStatus = {
  network: string;
  chainMode: string;
  callMode: string;
  escrowAddress?: string;
  fundingHint?: string;
  wallets: {
    agent?: { address: string; usdc: string };
    treasury?: { address: string; usdc: string };
  };
  calls: { configured: boolean; demoPhone?: string; hint?: string };
};

type BountyMoney = {
  budgetUsdc: string;
  escrowTxHash?: string;
  escrowOnChain?: boolean;
  payoutTxHash?: string;
  payoutOnChain?: boolean;
  refundTxHash?: string;
  refundOnChain?: boolean;
  creatorRefundUsdc?: string;
  platformFeeUsdc?: string;
  status: string;
  toolSpend?: string;
};

const STEPS = [
  {
    key: "fund",
    title: "1. Fund escrow",
    who: "You (creator wallet)",
    what: "USDC transfer to escrow on Base Sepolia",
  },
  {
    key: "tools",
    title: "2. Agent pays tools",
    who: "Agent wallet",
    what: "x402 micro-payments per API call (search, email, call…)",
  },
  {
    key: "payout",
    title: "3. Settle & refund",
    who: "Escrow → creator + agent",
    what: "Charge only tool spend + fee; refund the rest to you",
  },
];

export function TransactionFlowPanel({
  bounty,
  chainMode,
}: {
  bounty: BountyMoney;
  chainMode?: string;
}) {
  const [status, setStatus] = useState<SystemStatus>();

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => undefined);
  }, []);

  const funded = Boolean(bounty.escrowTxHash);
  const fundedOnChain = bounty.escrowOnChain === true;
  const settled = Boolean(bounty.payoutTxHash || bounty.refundTxHash);
  const live = chainMode === "real";

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-[var(--border)] px-5 py-3">
        <h3 className="font-semibold">Money flow</h3>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          All USDC on {status?.network ?? "Base Sepolia"}
          {live ? " · live on-chain" : " · simulated demo"}
        </p>
      </div>

      <div className="space-y-0 divide-y divide-[var(--border-soft)]">
        {STEPS.map((step) => {
          let state: "pending" | "done" | "warn" | "active" = "pending";
          let detail = "";
          let hash: string | undefined;

          if (step.key === "fund") {
            if (fundedOnChain) {
              state = "done";
              detail = `${usd(bounty.budgetUsdc)} locked in escrow`;
              hash = bounty.escrowTxHash;
            } else if (funded && live) {
              state = "warn";
              detail = "Escrow record exists but was NOT verified on-chain — re-fund with your wallet";
              hash = bounty.escrowTxHash;
            } else if (funded) {
              state = "done";
              detail = `${usd(bounty.budgetUsdc)} (simulated)`;
              hash = bounty.escrowTxHash;
            } else {
              detail = "Waiting — click Fund and confirm in Privy";
            }
          }

          if (step.key === "tools") {
            const spend = bounty.toolSpend ?? "0";
            if (Number(spend) > 0) {
              state = "done";
              detail = `${usd(spend)} spent via x402 (see ledger)`;
            } else if (bounty.status === "running") {
              state = "active";
              detail = "Agent is paying per tool call…";
            } else {
              detail = "Runs after you start the agent";
            }
          }

          if (step.key === "payout") {
            if (settled) {
              const onChain = bounty.refundOnChain ?? bounty.payoutOnChain;
              state = onChain ? "done" : "warn";
              const refund = Number(
                bounty.creatorRefundUsdc ??
                  Math.max(
                    0,
                    Number(bounty.budgetUsdc) - Number(bounty.toolSpend ?? 0),
                  ),
              );
              const fee = Number(bounty.platformFeeUsdc ?? 0);
              detail = `${usd(refund)} refunded to you${
                fee > 0 ? ` · ${usd(fee)} platform fee` : ""
              }`;
              hash = bounty.refundTxHash ?? bounty.payoutTxHash;
            } else if (
              bounty.status === "submitted" ||
              bounty.status === "verification_pending"
            ) {
              state = "active";
              detail = "Review deliverable, then Approve & settle";
            } else {
              detail = "After you approve the agent's work";
            }
          }

          return (
            <StepRow
              key={step.key}
              step={step}
              state={state}
              detail={detail}
              txHash={hash}
              onChain={
                step.key === "fund"
                  ? fundedOnChain
                  : step.key === "payout"
                  ? (bounty.refundOnChain ?? bounty.payoutOnChain)
                  : step.key === "tools"
                  ? live
                  : undefined
              }
            />
          );
        })}
      </div>

      {status?.fundingHint && (
        <div className="border-t border-[var(--border-soft)] px-5 py-3 text-xs text-[var(--muted)]">
          {status.fundingHint}
        </div>
      )}

      {status?.calls.hint && (
        <div
          className={`border-t border-[var(--border-soft)] px-5 py-3 text-xs ${
            status.callMode === "real" ? "text-[var(--amber)]" : "text-[var(--muted)]"
          }`}
        >
          <span className="font-medium text-[var(--text)]">Calls: </span>
          {status.calls.hint}
          {status.calls.demoPhone && (
            <span className="mono ml-1">{status.calls.demoPhone}</span>
          )}
        </div>
      )}

      {status?.wallets.treasury && (
        <div className="border-t border-[var(--border-soft)] bg-[var(--bg-soft)] px-5 py-3 text-xs text-[var(--muted)]">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>
              Escrow/treasury{" "}
              <a
                href={addrUrl(status.wallets.treasury.address)}
                target="_blank"
                rel="noreferrer"
                className="mono text-[var(--accent-2)] hover:underline"
              >
                {shortAddr(status.wallets.treasury.address)} ↗
              </a>{" "}
              · {usd(status.wallets.treasury.usdc)}
            </span>
            {status.wallets.agent && (
              <span>
                Agent{" "}
                <a
                  href={addrUrl(status.wallets.agent.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="mono text-[var(--accent-2)] hover:underline"
                >
                  {shortAddr(status.wallets.agent.address)} ↗
                </a>{" "}
                · {usd(status.wallets.agent.usdc)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StepRow({
  step,
  state,
  detail,
  txHash,
  onChain,
}: {
  step: { title: string; who: string; what: string };
  state: "pending" | "done" | "warn" | "active";
  detail: string;
  txHash?: string;
  onChain?: boolean;
}) {
  const dot =
    state === "done"
      ? "bg-[var(--green)]"
      : state === "warn"
      ? "bg-[var(--amber)]"
      : state === "active"
      ? "bg-[var(--accent)] pulse-dot"
      : "bg-[var(--muted-2)]";

  return (
    <div className="flex gap-3 px-5 py-3">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{step.title}</div>
        <div className="text-xs text-[var(--muted-2)]">
          {step.who} · {step.what}
        </div>
        <div
          className={`mt-1 text-xs ${
            state === "warn" ? "text-[var(--amber)]" : "text-[var(--muted)]"
          }`}
        >
          {detail}
        </div>
        {txHash && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {onChain === true && (
              <span className="badge text-[var(--green)]">on-chain ↗</span>
            )}
            {onChain === false && (
              <span className="badge text-[var(--amber)]">simulated</span>
            )}
            <a
              href={txUrl(txHash)}
              target="_blank"
              rel="noreferrer"
              className="mono text-[10px] text-[var(--accent-2)] hover:underline"
            >
              {shortAddr(txHash)} on Basescan
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
