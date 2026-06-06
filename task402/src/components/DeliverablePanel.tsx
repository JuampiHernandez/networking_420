"use client";

import { useState } from "react";
import { txUrl, shortAddr, usd } from "@/lib/format";

/** Minimal shape of a stored tool call we read from the bounty view. */
export type ToolCallView = {
  id: string;
  toolName: string;
  priceUsdc: string;
  status: string;
  paymentTxHash?: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
  createdAt: string;
};

type Contact = {
  id?: string;
  name: string;
  role?: string;
  company?: string;
  topic?: string;
  email?: string;
  phone?: string;
  whyRelevant?: string;
};

type EmailAction = {
  to: string;
  subject: string;
  body: string;
  delivered: boolean;
  txHash?: string;
};

type CallAction = {
  to: string;
  firstMessage?: string;
  objective?: string;
  transcript?: string;
  connected: boolean;
  status?: string;
  error?: string;
  txHash?: string;
};

type ContactReport = {
  contact: Contact;
  emails: EmailAction[];
  calls: CallAction[];
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

/** Build a structured, human-readable report from raw x402 tool calls. */
function buildReport(toolCalls: ToolCallView[]) {
  const succeeded = toolCalls.filter((t) => t.status === "succeeded");

  // Contacts come from the enrichment step (richest), falling back to search.
  const enrich = succeeded.find((t) => t.toolName === "enrich-contact");
  const search = succeeded.find((t) => t.toolName === "search-contacts");
  const rawContacts =
    (asRecord(enrich?.responsePayload).contacts as Contact[] | undefined) ??
    (asRecord(search?.responsePayload).items as Contact[] | undefined) ??
    [];

  const emailCalls = toolCalls.filter((t) => t.toolName === "send-email");
  const callCalls = toolCalls.filter((t) => t.toolName === "place-call");

  const emailActions: (EmailAction & { contactKey: string })[] = emailCalls.map(
    (t) => {
      const req = asRecord(t.requestPayload);
      const res = asRecord(t.responsePayload);
      return {
        contactKey: (str(req.to) ?? "").toLowerCase(),
        to: str(req.to) ?? str(res.to) ?? "",
        subject: str(req.subject) ?? "(no subject)",
        body: str(req.body) ?? "",
        delivered: t.status === "succeeded" && res.ok !== false,
        txHash: t.paymentTxHash,
      };
    },
  );

  const callActions: (CallAction & { contactKey: string })[] = callCalls.map(
    (t) => {
      const req = asRecord(t.requestPayload);
      const res = asRecord(t.responsePayload);
      return {
        contactKey: (str(req.name) ?? "").toLowerCase(),
        to: str(res.to) ?? str(req.to) ?? "",
        firstMessage: str(req.firstMessage),
        objective: str(req.objective),
        transcript: str(res.transcriptPreview),
        connected: res.ok === true && t.status === "succeeded",
        status: str(res.status),
        error: str(res.error),
        txHash: t.paymentTxHash,
      };
    },
  );

  const reports: ContactReport[] = rawContacts.map((c) => {
    const emailKey = (c.email ?? "").toLowerCase();
    const nameKey = (c.name ?? "").toLowerCase();
    return {
      contact: c,
      emails: emailActions.filter((e) => e.contactKey === emailKey),
      calls: callActions.filter((cl) => cl.contactKey === nameKey),
    };
  });

  const servicesPaid = succeeded.reduce(
    (sum, t) => sum + Number(t.priceUsdc || 0),
    0,
  );

  return {
    reports,
    stats: {
      contacts: rawContacts.length,
      emailsSent: emailActions.filter((e) => e.delivered).length,
      callsConnected: callActions.filter((c) => c.connected).length,
      callsAttempted: callActions.length,
      servicesPaid,
    },
  };
}

export function DeliverablePanel({
  toolCalls,
  rawOutput,
}: {
  toolCalls: ToolCallView[];
  rawOutput?: string;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const { reports, stats } = buildReport(toolCalls);

  if (!reports.length) {
    return (
      <div className="panel overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-3">
          <h3 className="font-semibold">Deliverable</h3>
        </div>
        <div className="p-5 text-sm text-[var(--muted)]">
          No outreach has completed yet.
        </div>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <h3 className="font-semibold">Deliverable</h3>
        {rawOutput && (
          <button
            className="text-xs text-[var(--muted-2)] hover:text-[var(--text)]"
            onClick={() => setShowRaw((s) => !s)}
          >
            {showRaw ? "Show summary" : "Show raw"}
          </button>
        )}
      </div>

      {showRaw && rawOutput ? (
        <pre className="mono max-h-72 overflow-auto p-4 text-xs leading-relaxed text-[var(--muted)]">
          {rawOutput}
        </pre>
      ) : (
        <div className="space-y-4 p-5">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <Stat label="Contacts" value={String(stats.contacts)} />
            <Stat label="Emails sent" value={String(stats.emailsSent)} />
            <Stat
              label="Calls"
              value={
                stats.callsAttempted
                  ? `${stats.callsConnected}/${stats.callsAttempted}`
                  : "0"
              }
            />
            <Stat label="Paid (x402)" value={usd(stats.servicesPaid)} accent />
          </div>

          {/* Per-contact report */}
          <div className="space-y-3">
            {reports.map((r, i) => (
              <ContactCard key={r.contact.id ?? i} report={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-soft)] px-2 py-2.5">
      <div
        className={`text-base font-bold ${
          accent ? "text-[var(--usdc)]" : "text-[var(--text)]"
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-[var(--muted-2)]">
        {label}
      </div>
    </div>
  );
}

function ContactCard({ report }: { report: ContactReport }) {
  const { contact, emails, calls } = report;
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-soft)]">
      <button
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="min-w-0">
          <div className="font-medium">{contact.name}</div>
          <div className="text-xs text-[var(--muted)]">
            {[contact.role, contact.company].filter(Boolean).join(" · ")}
            {contact.topic ? ` — ${contact.topic}` : ""}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {emails.length > 0 && (
            <span className="badge text-[var(--accent-2)]">✉ email</span>
          )}
          {calls.map((c, i) => (
            <span
              key={i}
              className={`badge ${
                c.connected ? "text-[var(--green)]" : "text-[var(--red)]"
              }`}
            >
              ☎ {c.connected ? "call" : "call failed"}
            </span>
          ))}
          <span className="text-[var(--muted-2)]">{open ? "▾" : "▸"}</span>
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-[var(--border-soft)] px-4 py-3">
          {contact.whyRelevant && (
            <p className="text-xs text-[var(--muted)]">
              <span className="text-[var(--muted-2)]">Why: </span>
              {contact.whyRelevant}
            </p>
          )}

          {emails.map((e, i) => (
            <ActionBlock
              key={`e${i}`}
              icon="✉"
              title={`Email → ${e.to}`}
              ok={e.delivered}
              txHash={e.txHash}
            >
              <div className="text-xs font-medium text-[var(--text)]">
                {e.subject}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-xs text-[var(--muted)]">
                {e.body}
              </p>
            </ActionBlock>
          ))}

          {calls.map((c, i) => (
            <ActionBlock
              key={`c${i}`}
              icon="☎"
              title={`Call → ${c.to}`}
              ok={c.connected}
              txHash={c.txHash}
            >
              {c.firstMessage && (
                <p className="whitespace-pre-wrap text-xs text-[var(--muted)]">
                  <span className="text-[var(--muted-2)]">Agent said: </span>
                  {c.firstMessage}
                </p>
              )}
              {c.connected ? (
                <p className="mt-1 text-xs text-[var(--muted-2)]">
                  Awaiting recipient reply (live transcript not captured yet).
                </p>
              ) : (
                <p className="mt-1 text-xs text-[var(--red)]">
                  Could not connect{c.error ? `: ${c.error}` : ""}
                </p>
              )}
            </ActionBlock>
          ))}

          {emails.length === 0 && calls.length === 0 && (
            <p className="text-xs text-[var(--muted-2)]">
              No outreach actions recorded for this contact.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ActionBlock({
  icon,
  title,
  ok,
  txHash,
  children,
}: {
  icon: string;
  title: string;
  ok: boolean;
  txHash?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-[var(--border-soft)] bg-[var(--panel)] p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">
          {icon} {title}
        </span>
        <span
          className={`badge ${
            ok ? "text-[var(--green)]" : "text-[var(--red)]"
          }`}
        >
          {ok ? "sent" : "failed"}
        </span>
      </div>
      {children}
      {txHash && (
        <a
          href={txUrl(txHash)}
          target="_blank"
          rel="noreferrer"
          className="mono mt-2 inline-flex items-center gap-1 text-[10px] text-[var(--accent-2)] hover:underline"
        >
          Paid via x402 · {shortAddr(txHash)} on Basescan ↗
        </a>
      )}
    </div>
  );
}
