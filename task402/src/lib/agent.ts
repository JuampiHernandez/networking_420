import { nanoid } from "nanoid";
import { db } from "./store";
import { emitEvent } from "./events";
import { callPaidTool, ToolCallError } from "./x402-buyer";
import { sendOutreachEmail } from "./email";
import { complete, llmLabel } from "./llm";
import { TOOLS, type Contact, type EnrichedContact } from "./tools";
import { getChainMode, getLlmMode, explorerTx } from "./config";
import { agentAccount } from "./chain";
import type { AgentRun, Bounty, SpendPolicy, ToolCall } from "./types";

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function policyFromBounty(b: Bounty): SpendPolicy {
  const max = Number(b.maxToolSpendUsdc) || 1;
  return {
    maxTotalSpendUsdc: max,
    maxPerRequestUsdc: max,
    allowedTools: b.allowedTools?.length ? b.allowedTools : Object.keys(TOOLS),
    requireHumanApprovalAboveUsdc: max,
    manualApprovalRequired: b.manualApprovalRequired,
    minVerifierScore: b.minVerifierScore,
  };
}

function extractCount(text: string, fallback = 3): number {
  const m = text.match(/\b(\d{1,2})\b/);
  if (m) return Math.max(1, Math.min(8, Number(m[1])));
  return fallback;
}

type Outreach = { subject: string; emailBody: string; callObjective: string; callFirstMessage: string };

function mockOutreach(b: Bounty, c: EnrichedContact): Outreach {
  const first = c.name.split(" ")[0];
  const objective = b.title;
  return {
    subject: `${first}, quick note about ${c.company}`,
    emailBody: `Hi ${first},\n\nI came across ${c.company} and your work on ${c.topic}. ${c.suggestedAngle}\n\nWould you be open to a quick 15-minute chat this week?\n\nBest,\nYour Networking Agent`,
    callObjective: objective,
    callFirstMessage: `Hi ${first}, I'm an AI assistant reaching out on behalf of a founder interested in ${c.topic} and ${c.company}. Do you have a quick minute?`,
  };
}

async function draftOutreach(b: Bounty, c: EnrichedContact): Promise<Outreach> {
  if (getLlmMode() === "mock") return mockOutreach(b, c);
  const system =
    "You are an expert networking assistant. Write concise, warm, non-spammy outreach. " +
    'Return STRICT JSON with keys: subject, emailBody, callObjective, callFirstMessage. No markdown.';
  const prompt = `Networking goal: ${b.title}
Context: ${b.description}

Contact:
${JSON.stringify(c, null, 2)}

Write a short personalized email (subject + body, sign as "Your Networking Agent") and a one-line phone call objective plus a natural first spoken line. Return JSON only.`;
  const out = await complete(system, prompt);
  if (out === "__MOCK__" || !out.trim()) return mockOutreach(b, c);
  try {
    const cleaned = out.trim().replace(/^```json?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<Outreach>;
    const fallback = mockOutreach(b, c);
    return {
      subject: parsed.subject || fallback.subject,
      emailBody: parsed.emailBody || fallback.emailBody,
      callObjective: parsed.callObjective || fallback.callObjective,
      callFirstMessage: parsed.callFirstMessage || fallback.callFirstMessage,
    };
  } catch {
    return mockOutreach(b, c);
  }
}

/**
 * Meeting-confirmation email sent automatically after a call connects. The
 * meeting link is a hardcoded demo link; swap MEETING_LINK for a real
 * scheduler URL (Cal.com, Google Meet, etc.) when wiring up real booking.
 */
const MEETING_LINK = "https://meet.relay.dev/j/abc-defg-hij";
const MEETING_WHEN = "Tuesday, June 10 at 3:00 PM ET (30 min)";

function meetingConfirmationEmail(c: EnrichedContact): { subject: string; body: string } {
  const first = c.name.split(" ")[0];
  return {
    subject: `Confirmed: our call on ${MEETING_WHEN.split(" at ")[0]}`,
    body:
      `Hi ${first},\n\n` +
      `Great talking just now — thanks for taking the call! As discussed, I've locked in a time for us to connect:\n\n` +
      `  When:  ${MEETING_WHEN}\n` +
      `  Where: ${MEETING_LINK}\n\n` +
      `Just click the link above at the scheduled time to join — no download needed. ` +
      `If you need to reschedule, reply to this email and I'll find another slot.\n\n` +
      `Looking forward to it!\n\n— Your Networking Agent (on behalf of the founder)`,
  };
}

async function recordToolCall(
  runId: string,
  toolName: string,
  status: ToolCall["status"],
  extra: Partial<ToolCall>,
): Promise<ToolCall> {
  const tool = TOOLS[toolName as keyof typeof TOOLS];
  const tc: ToolCall = {
    id: nanoid(),
    agentRunId: runId,
    toolName,
    endpoint: tool?.endpoint ?? "",
    priceUsdc: tool?.price ?? "0",
    status,
    createdAt: nowIso(),
    ...extra,
  };
  return db.saveToolCall(tc);
}

/**
 * Run the networking agent loop against a task: search contacts -> enrich ->
 * draft personalized outreach -> email and/or call within budget. Designed to
 * be invoked fire-and-forget so the UI can stream the timeline over SSE.
 */
export async function runAgentOnBounty(bounty: Bounty): Promise<void> {
  const runId = nanoid();
  const agentAddr = agentAccount()?.address ?? "0xSIMULATED_AGENT_WALLET";
  const outreachMode = bounty.outreachMode ?? "email";

  const run: AgentRun = {
    id: runId,
    bountyId: bounty.id,
    agentWalletAddress: agentAddr,
    status: "running",
    totalToolSpendUsdc: "0",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  db.saveRun(run);

  bounty.status = "running";
  bounty.updatedAt = nowIso();
  db.saveBounty(bounty);

  const policy = policyFromBounty(bounty);
  let spent = 0;

  const emit = (
    type: Parameters<typeof emitEvent>[2],
    msg: string,
    data?: Record<string, unknown>,
  ) => emitEvent(runId, bounty.id, type, msg, data);

  const canAfford = (toolName: keyof typeof TOOLS) => {
    const price = Number(TOOLS[toolName].price);
    return (
      policy.allowedTools.includes(toolName) &&
      price <= policy.maxPerRequestUsdc &&
      spent + price <= policy.maxTotalSpendUsdc + 1e-9
    );
  };

  try {
    emit("status", "Agent run started", {
      runId,
      agentWallet: agentAddr,
      chainMode: getChainMode(),
      llm: llmLabel(),
    });
    await sleep(300);

    emit("step", `Analyzing goal: "${bounty.title}"`);
    await sleep(400);

    emit("policy", "Spend policy loaded", {
      maxTotalSpendUsdc: policy.maxTotalSpendUsdc,
      maxPerRequestUsdc: policy.maxPerRequestUsdc,
      allowedTools: policy.allowedTools,
    });
    await sleep(300);

    const count = extractCount(`${bounty.title} ${bounty.description}`);
    const channelLabel =
      outreachMode === "both"
        ? "email + call"
        : outreachMode === "call"
        ? "call"
        : outreachMode === "none"
        ? "no outreach"
        : "email";
    emit("step", `Plan: search → enrich → draft → ${channelLabel} (target ${count} contacts)`);
    await sleep(400);

    // Helper that enforces policy then pays the tool via x402.
    const runPaidTool = async (
      toolName: keyof typeof TOOLS,
      payload: Record<string, unknown>,
    ) => {
      const tool = TOOLS[toolName];
      const price = Number(tool.price);

      if (!policy.allowedTools.includes(toolName)) {
        emit("policy", `Blocked: ${toolName} is not in the allowed tools`, { toolName });
        await recordToolCall(runId, toolName, "blocked_by_policy", { requestPayload: payload });
        throw new Error(`Tool ${toolName} blocked by policy`);
      }
      if (spent + price > policy.maxTotalSpendUsdc + 1e-9) {
        emit("policy", `Blocked: would exceed total budget of ${policy.maxTotalSpendUsdc} USDC`, {
          toolName,
          spent,
        });
        await recordToolCall(runId, toolName, "blocked_by_policy", { requestPayload: payload });
        throw new Error(`Tool ${toolName} exceeds total budget`);
      }

      emit("tool_call", `Calling ${toolName} (${tool.endpoint})`, {
        toolName,
        endpoint: tool.endpoint,
        price: tool.price,
      });
      await sleep(250);
      emit("payment", `402 Payment Required — ${toolName} wants ${tool.priceLabel}`, {
        toolName,
        price: tool.price,
        status: 402,
      });
      await sleep(250);
      emit("payment", `Signing x402 payment from agent wallet`, {
        toolName,
        agentWallet: agentAddr,
      });

      const result = await callPaidTool(toolName, payload, String(policy.maxPerRequestUsdc));

      if (!result.ok) {
        await recordToolCall(runId, toolName, "failed", {
          requestPayload: payload,
          network: result.network,
        });
        const msg = `Tool ${toolName} failed: ${result.error ?? "unknown error"}`;
        emit("error", msg, { toolName, error: result.error, details: result.data });
        throw new ToolCallError(toolName, msg);
      }

      spent += price;
      run.totalToolSpendUsdc = spent.toFixed(2);
      run.updatedAt = nowIso();
      db.saveRun(run);

      await recordToolCall(runId, toolName, "succeeded", {
        requestPayload: payload,
        responsePayload: result.data,
        paymentTxHash: result.txHash,
        network: result.network,
      });

      emit("payment", `Payment settled${result.simulated ? " (simulated)" : " on Base Sepolia"} — ${tool.priceLabel}`, {
        toolName,
        price: tool.price,
        txHash: result.txHash,
        explorer: result.txHash ? explorerTx(result.txHash) : undefined,
        simulated: result.simulated,
        onChain: !result.simulated,
        totalSpent: run.totalToolSpendUsdc,
      });
      await sleep(200);
      emit("tool_call", `Response unlocked from ${toolName}`, { toolName });
      await sleep(200);
      return result.data as Record<string, unknown>;
    };

    // 1) Search contacts
    const search = (await runPaidTool("search-contacts", {
      query: bounty.title,
      limit: count,
    })) as { items: Contact[] };
    const items = search.items ?? [];
    emit("step", `Found ${items.length} candidate contacts`, {
      contacts: items.map((c) => `${c.name} — ${c.company}`),
    });

    // 2) Enrich contacts (unlock email + phone)
    const enriched = (await runPaidTool("enrich-contact", { contacts: items })) as {
      contacts: EnrichedContact[];
    };
    const contacts = enriched.contacts ?? [];
    emit("step", `Enriched ${contacts.length} contacts with email + phone`);

    // 3) Draft + 4) Reach out within budget
    type Reached = {
      contact: EnrichedContact;
      channels: string[];
      emailId?: string;
      callId?: string;
      transcript?: string;
    };
    const reached: Reached[] = [];

    for (const c of contacts) {
      const wantEmail = outreachMode === "email" || outreachMode === "both";
      const wantCall = outreachMode === "call" || outreachMode === "both";
      const channels: string[] = [];
      const entry: Reached = { contact: c, channels };

      if (!wantEmail && !wantCall) break; // outreachMode === "none"

      emit("step", `Drafting outreach for ${c.name} (${c.company})`);
      const draft = await draftOutreach(bounty, c);

      if (wantEmail) {
        if (!canAfford("send-email")) {
          emit("policy", `Budget reached — skipping remaining emails`, { spent });
        } else {
          const r = (await runPaidTool("send-email", {
            to: c.email,
            subject: draft.subject,
            body: draft.emailBody,
          })) as { ok: boolean; id: string; to: string; simulated: boolean };
          if (r.ok) {
            channels.push("email");
            entry.emailId = r.id;
            emit("output", `Email sent to ${r.to}${r.simulated ? " (sim)" : ""}`, {
              contact: c.name,
              to: r.to,
              subject: draft.subject,
              preview: draft.emailBody,
              simulated: r.simulated,
            });
          }
        }
      }

      if (wantCall) {
        if (!canAfford("place-call")) {
          emit("policy", `Budget reached — skipping remaining calls`, { spent });
        } else {
          const r = (await runPaidTool("place-call", {
            to: c.phone,
            name: c.name,
            objective: draft.callObjective,
            firstMessage: draft.callFirstMessage,
          })) as {
            ok: boolean;
            conversationId: string;
            to: string;
            simulated: boolean;
            transcriptPreview?: string;
            status?: string;
            error?: string;
            refunded?: boolean;
            refundTxHash?: string;
          };
          if (r.ok) {
            channels.push("call");
            entry.callId = r.conversationId;
            entry.transcript = r.transcriptPreview;
            emit("output", `Call placed to ${r.to}${r.simulated ? " (sim)" : ""}`, {
              contact: c.name,
              to: r.to,
              conversationId: r.conversationId,
              firstMessage: r.transcriptPreview,
              simulated: r.simulated,
            });

            // After the call connects, automatically send a meeting-confirmation
            // email with the (demo) meeting link. Routed to DEMO_CONTACT_EMAIL
            // when set. This is a free side-effect, not a paid x402 tool call.
            const invite = meetingConfirmationEmail(c);
            const confirm = await sendOutreachEmail({
              to: c.email,
              subject: invite.subject,
              body: invite.body,
            });
            if (confirm.ok) {
              if (!channels.includes("email")) channels.push("email");
              emit("output", `Meeting confirmation emailed to ${confirm.to}${confirm.simulated ? " (sim)" : ""}`, {
                contact: c.name,
                to: confirm.to,
                subject: invite.subject,
                preview: invite.body,
                meetingLink: MEETING_LINK,
                simulated: confirm.simulated,
              });
            } else {
              emit("error", `Couldn't send meeting confirmation to ${confirm.to}: ${confirm.error ?? "unknown"}`, {
                contact: c.name,
                to: confirm.to,
                error: confirm.error,
              });
            }
          } else {
            // The call could not connect. The seller refunds the x402 charge,
            // so reverse the local spend accounting and drop the tool call from
            // the ledger — the agent isn't charged for a call that never landed.
            const price = Number(TOOLS["place-call"].price);
            if (r.refunded) {
              spent = Math.max(0, spent - price);
              run.totalToolSpendUsdc = spent.toFixed(2);
              run.updatedAt = nowIso();
              db.saveRun(run);
              const last = [...db.listToolCalls(runId)]
                .reverse()
                .find((tc) => tc.toolName === "place-call" && tc.status === "succeeded");
              if (last) {
                last.status = "failed";
                db.saveToolCall(last);
              }
              emit("payment", `Call didn't connect — ${TOOLS["place-call"].priceLabel} refunded to agent`, {
                toolName: "place-call",
                to: r.to,
                refunded: true,
                refundTxHash: r.refundTxHash,
                explorer: r.refundTxHash ? explorerTx(r.refundTxHash) : undefined,
                totalSpent: run.totalToolSpendUsdc,
              });
            }
            emit("error", `Call to ${r.to} could not connect: ${r.error ?? "unknown reason"}`, {
              contact: c.name,
              to: r.to,
              status: r.status,
              error: r.error,
            });
          }
        }
      }

      if (channels.length) reached.push(entry);

      // Stop early if we can no longer afford any outreach.
      if (!canAfford("send-email") && !canAfford("place-call")) break;
    }

    // 5) Compose deliverable summary
    const finalOutput = buildSummary(bounty, reached);
    run.finalOutput = finalOutput;
    run.status = "submitted";
    db.saveRun(run);
    emit("output", "Outreach summary ready", { output: finalOutput });
    await sleep(250);

    const submission = db.saveSubmission({
      id: nanoid(),
      bountyId: bounty.id,
      agentRunId: runId,
      output: finalOutput,
      proofJson: {
        toolSpendUsdc: run.totalToolSpendUsdc,
        contactsReached: reached.length,
        channels: reached.flatMap((r) => r.channels),
      },
      status: "pending",
      createdAt: nowIso(),
    });

    bounty.status = bounty.manualApprovalRequired ? "verification_pending" : "submitted";
    bounty.updatedAt = nowIso();
    db.saveBounty(bounty);

    emit("step", `Reached ${reached.length} contact(s) (total spend ${run.totalToolSpendUsdc} USDC)`, {
      submissionId: submission.id,
      totalToolSpendUsdc: run.totalToolSpendUsdc,
      contactsReached: reached.length,
    });

    emit("done", "Agent run complete — awaiting payout decision", {
      status: bounty.status,
      contactsReached: reached.length,
      manualApprovalRequired: bounty.manualApprovalRequired,
    });
  } catch (err) {
    run.status = "failed";
    run.updatedAt = nowIso();
    db.saveRun(run);
    bounty.status = "open";
    bounty.updatedAt = nowIso();
    db.saveBounty(bounty);
    if (!(err instanceof ToolCallError)) {
      emit("error", err instanceof Error ? err.message : "Agent run failed");
    }
    emit("done", "Agent run failed", { failed: true });
  }
}

function buildSummary(
  b: Bounty,
  reached: Array<{ contact: EnrichedContact; channels: string[] }>,
): string {
  if (!reached.length) {
    return `Goal: ${b.title}\n\nNo contacts were reached (budget too low or outreach disabled).`;
  }
  const lines = reached.map((r, i) => {
    const c = r.contact;
    return [
      `${i + 1}. ${c.name} — ${c.role}, ${c.company} (${c.topic})`,
      `   Reached via: ${r.channels.join(" + ")}`,
      `   ${c.email} · ${c.phone}`,
    ].join("\n");
  });
  return `Networking goal: ${b.title}\n\nContacts reached (${reached.length}):\n\n${lines.join("\n\n")}`;
}

export { policyFromBounty };
