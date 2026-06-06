"use client";

import { shortAddr, txUrl, usd } from "@/lib/format";

export type LedgerRow = {
  label: string;
  detail: string;
  amountUsdc: string;
  direction: "in" | "out" | "neutral";
  txHash?: string;
  onChain?: boolean;
};

export function LedgerPanel({
  rows,
  budget,
  toolSpend,
}: {
  rows: LedgerRow[];
  budget: string;
  toolSpend: string;
}) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <h3 className="font-semibold">USDC ledger</h3>
        <span className="badge text-[var(--usdc)]">Base Sepolia</span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-[var(--border-soft)]">
        <div className="bg-[var(--panel)] p-4">
          <div className="label">Budget</div>
          <div className="mt-1 text-lg font-bold text-[var(--green)]">
            {usd(budget)}
          </div>
        </div>
        <div className="bg-[var(--panel)] p-4">
          <div className="label">Tool spend</div>
          <div className="mt-1 text-lg font-bold text-[var(--usdc)]">
            {usd(toolSpend)}
          </div>
        </div>
      </div>

      <div className="divide-y divide-[var(--border-soft)]">
        {rows.length === 0 ? (
          <div className="p-5 text-sm text-[var(--muted)]">
            No transactions yet.
          </div>
        ) : (
          rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{r.label}</div>
                <div className="truncate text-xs text-[var(--muted-2)]">
                  {r.detail}
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span
                  className={`text-sm font-semibold ${
                    r.direction === "in"
                      ? "text-[var(--green)]"
                      : "text-[var(--text)]"
                  }`}
                >
                  {r.direction === "out" ? "−" : "+"}
                  {Number(r.amountUsdc).toFixed(2)}
                </span>
                {r.txHash ? (
                  <div className="flex items-center gap-1.5">
                    {r.onChain === true && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--green)]">
                        on-chain
                      </span>
                    )}
                    {r.onChain === false && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-[var(--amber)]">
                        sim
                      </span>
                    )}
                    <a
                      href={txUrl(r.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="mono text-[10px] text-[var(--accent-2)] hover:underline"
                    >
                      {shortAddr(r.txHash)} ↗
                    </a>
                  </div>
                ) : (
                  <span className="text-[10px] text-[var(--muted-2)]">pending</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
