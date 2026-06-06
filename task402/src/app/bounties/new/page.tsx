"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWallet } from "@/lib/wallet";

const ALL_TOOLS = ["search-contacts", "enrich-contact", "send-email", "place-call"];

const EXAMPLES = [
  "Find 3 AI infrastructure founders in NYC and email them about a partnership around agentic payments.",
  "Reach 2 onchain payments founders and call them to set up a quick intro chat.",
  "Find 4 RAG / search infra builders and send each a personalized intro email.",
];

const BUDGET_PRESETS = ["5", "10", "25"];

const OUTREACH_MODES = [
  { id: "email", label: "Email", hint: "Send personalized emails" },
  { id: "call", label: "Call", hint: "Place AI voice calls" },
  { id: "both", label: "Email + Call", hint: "Do both" },
  { id: "none", label: "Research only", hint: "Find + enrich, no outreach" },
];

function titleFromPrompt(p: string): string {
  const firstLine = p.trim().split("\n")[0].trim();
  return firstLine.length > 70 ? firstLine.slice(0, 67) + "…" : firstLine;
}

export default function NewTaskPage() {
  const router = useRouter();
  const w = useWallet();
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [prompt, setPrompt] = useState(EXAMPLES[0]);
  const [budgetUsdc, setBudgetUsdc] = useState("10");
  const [outreachMode, setOutreachMode] = useState("email");
  const [manualApprovalRequired, setManualApprovalRequired] = useState(true);
  const [allowedTools, setAllowedTools] = useState<string[]>(ALL_TOOLS);

  const toggleTool = (id: string) =>
    setAllowedTools((tools) =>
      tools.includes(id) ? tools.filter((t) => t !== id) : [...tools, id],
    );

  const submit = async () => {
    if (!w.authenticated) {
      w.login();
      return;
    }
    if (!prompt.trim()) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/bounties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleFromPrompt(prompt),
          description: prompt.trim(),
          category: "networking",
          // The agent decides format + how it reaches people; these stay internal.
          deliverableFormat: "Contacts reached, with channel + outcome",
          verificationCriteria: prompt.trim(),
          budgetUsdc,
          // Let the agent spend up to the whole escrowed budget on tools;
          // it only spends what the run needs and the rest refunds.
          maxToolSpendUsdc: budgetUsdc,
          minVerifierScore: 70,
          manualApprovalRequired,
          outreachMode,
          allowedTools,
          creatorId: w.address ?? "anon",
          creatorWallet: w.address,
        }),
      });
      const data = await r.json();
      if (data.bounty?.id) router.push(`/bounties/${data.bounty.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <div className="mb-7 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          What should your agent do?
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Describe a networking goal in plain language and set a USDC budget. The
          agent figures out the rest — who to find, what to pay for, how to reach them.
        </p>
      </div>

      <div className="panel space-y-6 p-6">
        {/* Prompt */}
        <div>
          <textarea
            className="textarea min-h-[120px] text-base leading-relaxed"
            placeholder="e.g. Find 3 AI founders in NYC and email them about a partnership…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            autoFocus
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPrompt(ex)}
                className="badge text-left opacity-70 transition hover:opacity-100"
                title={ex}
              >
                {ex.length > 42 ? ex.slice(0, 40) + "…" : ex}
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div>
          <label className="label">Budget</label>
          <div className="mt-2 flex items-center gap-2">
            {BUDGET_PRESETS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBudgetUsdc(b)}
                className={`btn ${
                  budgetUsdc === b ? "btn-primary" : "btn-ghost"
                } px-4`}
              >
                ${b}
              </button>
            ))}
            <div className="relative ml-1 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-2)]">
                $
              </span>
              <input
                className="input pl-6"
                type="number"
                min="1"
                value={budgetUsdc}
                onChange={(e) => setBudgetUsdc(e.target.value)}
              />
            </div>
            <span className="text-sm text-[var(--muted)]">USDC</span>
          </div>
          <p className="mt-2 text-xs text-[var(--muted-2)]">
            Escrowed up front. You’re only charged what the agent actually spends on tools (plus a small platform fee) — the rest is refunded to you.
          </p>
        </div>

        {/* Outreach mode */}
        <div>
          <label className="label">How should it reach people?</label>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {OUTREACH_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setOutreachMode(m.id)}
                className={`rounded-lg border p-3 text-left transition ${
                  outreachMode === m.id
                    ? "border-[var(--accent)] bg-[var(--bg-soft)]"
                    : "border-[var(--border-soft)] opacity-70 hover:opacity-100"
                }`}
              >
                <div className="text-sm font-semibold">{m.label}</div>
                <div className="text-[11px] text-[var(--muted)]">{m.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced */}
        <div className="border-t border-[var(--border-soft)] pt-4">
          <button
            type="button"
            className="text-sm text-[var(--accent-2)] hover:underline"
            onClick={() => setShowAdvanced((s) => !s)}
          >
            {showAdvanced ? "− Hide" : "+ Advanced"} guardrails
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-soft)] p-3">
                <input
                  type="checkbox"
                  checked={manualApprovalRequired}
                  onChange={(e) => setManualApprovalRequired(e.target.checked)}
                />
                <span className="text-sm">
                  Require my approval before payout
                  <span className="block text-xs text-[var(--muted)]">
                    You review what the agent did before USDC is released.
                  </span>
                </span>
              </label>

              <div>
                <label className="label">Tools the agent may pay for</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ALL_TOOLS.map((t) => {
                    const on = allowedTools.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTool(t)}
                        className={`badge ${
                          on
                            ? "border-[var(--accent)] text-[var(--text)]"
                            : "opacity-50"
                        }`}
                      >
                        {on ? "✓ " : ""}
                        {t}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-[var(--muted-2)]">
                  Spend policy enforced server-side before every x402 payment.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between border-t border-[var(--border-soft)] pt-4">
          <span className="text-xs text-[var(--muted)]">
            {w.authenticated
              ? `Wallet ${w.address?.slice(0, 8)}…`
              : "You’ll sign in first."}
          </span>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={submitting || !prompt.trim()}
          >
            {submitting
              ? "Creating…"
              : w.authenticated
                ? "Create task →"
                : "Sign in & create"}
          </button>
        </div>
      </div>
    </div>
  );
}
