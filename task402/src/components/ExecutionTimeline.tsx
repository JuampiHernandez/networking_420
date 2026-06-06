"use client";

import { shortAddr, txUrl } from "@/lib/format";

export type RunEvent = {
  id: string;
  type: string;
  message: string;
  data?: Record<string, unknown>;
  ts: string;
};

const TYPE_META: Record<string, { dot: string; label: string }> = {
  status: { dot: "bg-[var(--accent-2)]", label: "STATUS" },
  step: { dot: "bg-[var(--accent)]", label: "STEP" },
  policy: { dot: "bg-[var(--amber)]", label: "POLICY" },
  tool_call: { dot: "bg-[var(--accent-2)]", label: "TOOL" },
  payment: { dot: "bg-[var(--usdc)]", label: "x402" },
  output: { dot: "bg-[var(--purple)]", label: "OUTPUT" },
  verification: { dot: "bg-[var(--purple)]", label: "VERIFY" },
  payout: { dot: "bg-[var(--green)]", label: "PAYOUT" },
  done: { dot: "bg-[var(--green)]", label: "DONE" },
  error: { dot: "bg-[var(--red)]", label: "ERROR" },
};

function fmtTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour12: false,
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

export function ExecutionTimeline({
  events,
  running,
}: {
  events: RunEvent[];
  running: boolean;
}) {
  const errors = events.filter((e) => e.type === "error");

  return (
    <div className="panel flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Agent execution</h3>
          {running && (
            <span className="badge">
              <span className="h-2 w-2 rounded-full bg-[var(--green)] pulse-dot" />
              live
            </span>
          )}
          {errors.length > 0 && !running && (
            <span className="badge text-[var(--red)]">
              {errors.length} issue{errors.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <span className="text-xs text-[var(--muted-2)]">{events.length} events</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {events.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm text-[var(--muted)]">
            <div>
              <p>No activity yet.</p>
              <p className="text-xs text-[var(--muted-2)]">
                Fund the task on Base Sepolia, then run the agent to see the x402
                payment trail.
              </p>
            </div>
          </div>
        ) : (
          <ol className="relative space-y-3 before:absolute before:left-[5px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-[var(--border)]">
            {events.map((e) => {
              const meta = TYPE_META[e.type] ?? TYPE_META.step;
              const d = e.data ?? {};
              const hash = d.txHash as string | undefined;
              const isError = e.type === "error";
              const explorer = d.explorer as string | undefined;

              return (
                <li
                  key={e.id}
                  className={`fade-in relative pl-6 ${isError ? "rounded-lg border border-[var(--red)]/30 bg-[var(--red)]/5 py-2 pr-2" : ""}`}
                >
                  <span
                    className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full ring-4 ring-[var(--panel)] ${meta.dot}`}
                  />
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[10px] font-bold tracking-wider text-[var(--muted-2)]">
                      {meta.label}
                    </span>
                    <span className="mono text-[10px] text-[var(--muted-2)]">
                      {fmtTime(e.ts)}
                    </span>
                  </div>
                  <p className={`text-sm ${isError ? "text-[var(--red)]" : ""}`}>
                    {e.message}
                  </p>

                  {/* Error details */}
                  {isError && d.error != null && (
                    <p className="mt-1 text-xs text-[var(--red)]/80">
                      {String(d.error)}
                    </p>
                  )}

                  {/* Payment / settlement details */}
                  {(hash || d.price != null || d.payout != null) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                      {d.price != null && (
                        <span className="badge text-[var(--usdc)]">
                          {Number(d.price).toFixed(2)} USDC
                        </span>
                      )}
                      {d.payout != null && (
                        <span className="badge text-[var(--green)]">
                          payout {Number(d.payout).toFixed(2)} USDC
                        </span>
                      )}
                      {d.simulated === true && (
                        <span className="badge text-[var(--amber)]">simulated</span>
                      )}
                      {(d.onChain === true || (d.simulated === false && hash)) && (
                        <span className="badge text-[var(--green)]">
                          Base Sepolia ↗
                        </span>
                      )}
                      {hash && (
                        <a
                          href={explorer ?? txUrl(hash)}
                          target="_blank"
                          rel="noreferrer"
                          className="mono text-[var(--accent-2)] hover:underline"
                        >
                          {shortAddr(hash)} ↗
                        </a>
                      )}
                    </div>
                  )}

                  {/* Email / call output previews */}
                  {e.type === "output" && d.subject != null && (
                    <div className="mt-2 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-soft)] p-3 text-xs">
                      <div className="font-medium">{String(d.subject)}</div>
                      {d.preview != null && (
                        <p className="mt-1 whitespace-pre-wrap text-[var(--muted)]">
                          {String(d.preview)}
                        </p>
                      )}
                    </div>
                  )}

                  {e.type === "output" && d.firstMessage != null && !d.subject && (
                    <div className="mt-2 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-soft)] p-3 text-xs text-[var(--muted)]">
                      <span className="text-[var(--muted-2)]">Opening line: </span>
                      {String(d.firstMessage)}
                    </div>
                  )}

                  {/* Verification score bar */}
                  {e.type === "verification" && d.score != null && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel-2)]">
                        <div
                          className={`h-full ${
                            d.passed ? "bg-[var(--green)]" : "bg-[var(--red)]"
                          }`}
                          style={{ width: `${Math.min(100, Number(d.score))}%` }}
                        />
                      </div>
                      {d.notes ? (
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {String(d.notes)}
                        </p>
                      ) : null}
                    </div>
                  )}

                  {/* Raw deliverable blob */}
                  {e.type === "output" && d.output ? (
                    <pre className="mono mt-2 max-h-44 overflow-auto rounded-lg border border-[var(--border-soft)] bg-[var(--bg-soft)] p-3 text-xs leading-relaxed text-[var(--muted)]">
                      {String(d.output)}
                    </pre>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
