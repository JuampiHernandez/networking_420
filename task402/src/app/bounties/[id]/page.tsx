"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { ExecutionTimeline, type RunEvent } from "@/components/ExecutionTimeline";
import { LedgerPanel, type LedgerRow } from "@/components/LedgerPanel";
import { ChatPanel } from "@/components/ChatPanel";
import { DeliverablePanel, type ToolCallView } from "@/components/DeliverablePanel";
import { TransactionFlowPanel } from "@/components/TransactionFlowPanel";
import { STATUS_STYLES, shortAddr, txUrl, usd } from "@/lib/format";

type View = {
  bounty: {
    id: string;
    title: string;
    description: string;
    category: string;
    deliverableFormat: string;
    verificationCriteria: string;
    budgetUsdc: string;
    maxToolSpendUsdc: string;
    minVerifierScore: number;
    outreachMode?: string;
    manualApprovalRequired: boolean;
    allowedTools: string[];
    status: string;
    escrowTxHash?: string;
    escrowOnChain?: boolean;
    payoutTxHash?: string;
    payoutOnChain?: boolean;
    refundTxHash?: string;
    refundOnChain?: boolean;
    creatorRefundUsdc?: string;
    agentReimbursementUsdc?: string;
    platformFeeUsdc?: string;
    creatorWallet?: string;
  };
  run?: {
    id: string;
    status: string;
    totalToolSpendUsdc: string;
    agentWalletAddress?: string;
    finalOutput?: string;
    verificationScore?: number;
    verificationNotes?: string;
  };
  submission?: {
    output: string;
    verificationScore?: number;
    verificationNotes?: string;
    status: string;
  };
  toolCalls?: ToolCallView[];
  ledger: LedgerRow[];
  events: RunEvent[];
  modes: { chainMode: string; llmMode: string; llmLabel: string };
};

export default function BountyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const w = useWallet();
  const [view, setView] = useState<View>();
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const esRef = useRef<EventSource | null>(null);
  const runInFlightRef = useRef(false);

  // Pure dedup (no external ref mutation) so React strict-mode double-invokes
  // of the updater stay correct.
  const mergeEvents = useCallback((incoming: RunEvent[]) => {
    if (!incoming.length) return;
    setEvents((prev) => {
      const ids = new Set(prev.map((e) => e.id));
      const next = [...prev];
      for (const e of incoming) {
        if (!ids.has(e.id)) {
          ids.add(e.id);
          next.push(e);
        }
      }
      return next.length === prev.length ? prev : next;
    });
  }, []);

  const loadView = useCallback(async () => {
    const r = await fetch(`/api/bounties/${id}`).then((x) => x.json());
    if (r?.bounty) {
      setView(r);
      mergeEvents(r.events ?? []);
    }
  }, [id, mergeEvents]);

  useEffect(() => {
    void loadView();
  }, [loadView]);

  const startStream = useCallback(() => {
    if (esRef.current) return;
    const es = new EventSource(`/api/bounties/${id}/events`);
    esRef.current = es;
    es.onmessage = (ev) => {
      try {
        const e = JSON.parse(ev.data) as RunEvent;
        mergeEvents([e]);
        if (e.type === "done") {
          setRunning(false);
          void loadView();
          es.close();
          esRef.current = null;
        }
      } catch {
        // ignore
      }
    };
    es.onerror = () => {
      es.close();
      esRef.current = null;
    };
  }, [id, mergeEvents, loadView]);

  useEffect(() => {
    if (view?.bounty?.status === "running" && view?.run?.status === "running") {
      setRunning(true);
      startStream();
    }
  }, [view?.bounty?.status, view?.run?.status, startStream]);

  useEffect(() => {
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);

  const b = view?.bounty;

  const fund = async () => {
    if (!w.authenticated) return w.login();
    setBusy("fund");
    setActionError(undefined);
    try {
      const { txHash } = await w.fundBounty(b!.budgetUsdc);
      const res = await fetch(`/api/bounties/${id}/fund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, creatorWallet: w.address }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(
          data?.error ??
            `Could not confirm funding on Base Sepolia (HTTP ${res.status}).`,
        );
        return;
      }
      await loadView();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Funding failed");
    } finally {
      setBusy(undefined);
    }
  };

  const run = async () => {
    if (runInFlightRef.current || running) return;
    runInFlightRef.current = true;
    setBusy("run");
    setRunning(true);
    setActionError(undefined);
    try {
      const res = await fetch(`/api/bounties/${id}/run`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRunning(false);
        setActionError(data?.error ?? `Could not start agent (HTTP ${res.status})`);
        return;
      }
      setView((v) =>
        v ? { ...v, bounty: { ...v.bounty, status: "running" } } : v,
      );
      startStream();
    } catch (err) {
      setRunning(false);
      setActionError(err instanceof Error ? err.message : "Could not start agent");
    } finally {
      runInFlightRef.current = false;
      setBusy(undefined);
    }
  };

  const decide = async (action: "approve" | "reject") => {
    setBusy(action);
    setActionError(undefined);
    try {
      const res = await fetch(`/api/bounties/${id}/${action}`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.details?.availableUsdc
          ? ` (treasury: ${data.details.availableUsdc} USDC available)`
          : "";
        setActionError((data?.error ?? `Failed to ${action}`) + detail);
        return;
      }
      await loadView();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setBusy(undefined);
    }
  };

  if (!b) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-20 text-center text-[var(--muted)]">
        Loading bounty…
      </div>
    );
  }

  const canFund = b.status === "funding_required";
  const canRun = (b.status === "open" || b.status === "rejected") && !running;
  const canDecide =
    b.status === "submitted" || b.status === "verification_pending";
  const toolSpend = view?.run?.totalToolSpendUsdc ?? "0";
  const needsRealFund =
    view?.modes.chainMode === "real" &&
    b.escrowTxHash &&
    !b.escrowOnChain &&
    b.status !== "funding_required";

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      {/* Title bar */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="badge">{b.category}</span>
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${
                STATUS_STYLES[b.status] ?? "text-[var(--muted)]"
              }`}
            >
              {b.status.replace(/_/g, " ")}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold">{b.title}</h1>
        </div>
        <div className="flex gap-2">
          {canFund && (
            <button className="btn btn-primary" onClick={fund} disabled={busy === "fund"}>
              {busy === "fund" ? "Funding…" : `Fund ${usd(b.budgetUsdc)}`}
            </button>
          )}
          {canRun && (
            <button
              className="btn btn-primary"
              onClick={run}
              disabled={busy === "run" || running}
            >
              {busy === "run" ? "Starting…" : "Run agent ▶"}
            </button>
          )}
          {canDecide && (
            <>
              <button
                className="btn btn-green"
                onClick={() => decide("approve")}
                disabled={busy === "approve"}
              >
                {busy === "approve" ? "Paying…" : "Approve & pay"}
              </button>
              <button
                className="btn btn-red"
                onClick={() => decide("reject")}
                disabled={busy === "reject"}
              >
                {busy === "reject" ? "Refunding…" : "Reject"}
              </button>
            </>
          )}
        </div>
      </div>

      {actionError && (
        <div className="mb-6 rounded-lg border border-[var(--red)]/40 bg-[var(--red)]/10 px-4 py-3 text-sm text-[var(--red)]">
          {actionError}
        </div>
      )}

      {needsRealFund && (
        <div className="mb-6 rounded-lg border border-[var(--amber)]/40 bg-[var(--amber)]/10 px-4 py-3 text-sm text-[var(--amber)]">
          This bounty was not funded with a verified Base Sepolia transaction. Create a
          new task and use <strong>Fund</strong> with your wallet, or re-fund after
          resetting status — payout will fail until escrow holds real USDC.
        </div>
      )}

      {/* 3-column layout */}
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)_360px]">
        {/* Left: details + policy */}
        <div className="space-y-5">
          <TransactionFlowPanel
            bounty={{
              budgetUsdc: b.budgetUsdc,
              escrowTxHash: b.escrowTxHash,
              escrowOnChain: b.escrowOnChain,
              payoutTxHash: b.payoutTxHash,
              payoutOnChain: b.payoutOnChain,
              refundTxHash: b.refundTxHash,
              refundOnChain: b.refundOnChain,
              creatorRefundUsdc: b.creatorRefundUsdc,
              platformFeeUsdc: b.platformFeeUsdc,
              status: b.status,
              toolSpend,
            }}
            chainMode={view?.modes.chainMode}
          />

          <div className="panel p-5">
            <h3 className="mb-3 font-semibold">Task</h3>
            <p className="text-sm text-[var(--muted)]">{b.description}</p>
            <dl className="mt-4 space-y-3 text-sm">
              <Row k="Deliverable" v={b.deliverableFormat} />
              <Row k="Verification" v={b.verificationCriteria} />
              <Row k="Deadline" v="24h" />
            </dl>
          </div>

          <div className="panel p-5">
            <h3 className="mb-3 font-semibold">Spend policy</h3>
            <dl className="space-y-3 text-sm">
              <Row k="Budget" v={usd(b.budgetUsdc)} accent />
              <Row k="Max tool spend" v={usd(b.maxToolSpendUsdc)} />
              <Row k="Outreach mode" v={b.outreachMode ?? "email"} />
              <Row
                k="Manual approval"
                v={b.manualApprovalRequired ? "Required" : "Auto"}
              />
            </dl>
            <div className="mt-4">
              <div className="label mb-2">Allowed tools</div>
              <div className="flex flex-wrap gap-1.5">
                {b.allowedTools.map((t) => (
                  <span key={t} className="badge">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="panel-soft p-4 text-xs text-[var(--muted)]">
            <div className="mb-2 font-semibold text-[var(--text)]">
              Powered by
            </div>
            <div className="space-y-1">
              <div>
                Auth/wallet:{" "}
                <span className="text-[var(--text)]">
                  {w.mode === "privy" ? "Privy" : "Demo wallet"}
                </span>
              </div>
              <div>
                x402 settlement:{" "}
                <span className="text-[var(--text)]">
                  {view?.modes.chainMode === "real" ? "on-chain" : "simulated"}
                </span>
              </div>
              <div>
                Agent LLM:{" "}
                <span className="text-[var(--text)]">{view?.modes.llmLabel}</span>
              </div>
              {view?.run?.agentWalletAddress && (
                <div>
                  Agent wallet:{" "}
                  <span className="mono text-[var(--text)]">
                    {shortAddr(view.run.agentWalletAddress)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: timeline */}
        <div className="min-h-[560px]">
          <ExecutionTimeline events={events} running={running} />
        </div>

        {/* Right: ledger + chat + verifier + review */}
        <div className="space-y-5">
          <LedgerPanel rows={view?.ledger ?? []} budget={b.budgetUsdc} toolSpend={toolSpend} />

          <ChatPanel bountyId={b.id} />

          {view?.run?.verificationScore != null && (
            <div className="panel p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Verifier</h3>
                <span
                  className={`text-2xl font-bold ${
                    (view.run.verificationScore ?? 0) >= b.minVerifierScore
                      ? "text-[var(--green)]"
                      : "text-[var(--red)]"
                  }`}
                >
                  {view.run.verificationScore}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {view.run.verificationNotes}
              </p>
            </div>
          )}

          {view?.submission?.output && (
            <DeliverablePanel
              toolCalls={view.toolCalls ?? []}
              rawOutput={view.submission.output}
            />
          )}

          {(b.payoutTxHash || b.refundTxHash) && (
            <div className="panel p-5">
              <h3 className="mb-2 font-semibold">Settlement</h3>
              <p className="mb-3 text-xs text-[var(--muted)]">
                You’re charged only the {usd(toolSpend)} the agent spent on tools
                {b.platformFeeUsdc && Number(b.platformFeeUsdc) > 0
                  ? ` + ${usd(b.platformFeeUsdc)} platform fee`
                  : ""}
                . The rest is refunded.
              </p>
              {b.refundTxHash && (
                <SettleRow
                  label={`Refunded to you${b.creatorRefundUsdc ? ` · ${usd(b.creatorRefundUsdc)}` : ""}`}
                  hash={b.refundTxHash}
                  good
                />
              )}
              {b.payoutTxHash && (
                <SettleRow
                  label={`Agent tool-cost reimbursement${b.agentReimbursementUsdc ? ` · ${usd(b.agentReimbursementUsdc)}` : ""}`}
                  hash={b.payoutTxHash}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  k,
  v,
  accent,
}: {
  k: string;
  v: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-[var(--muted-2)]">{k}</dt>
      <dd
        className={`text-right ${accent ? "font-semibold text-[var(--green)]" : "text-[var(--text)]"}`}
      >
        {v}
      </dd>
    </div>
  );
}

function SettleRow({
  label,
  hash,
  good,
}: {
  label: string;
  hash: string;
  good?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className={good ? "text-[var(--green)]" : "text-[var(--muted)]"}>
        {label}
      </span>
      <a
        href={txUrl(hash)}
        target="_blank"
        rel="noreferrer"
        className="mono text-xs text-[var(--accent-2)] hover:underline"
      >
        {shortAddr(hash)} ↗
      </a>
    </div>
  );
}
