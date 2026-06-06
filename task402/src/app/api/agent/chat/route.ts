import { NextRequest, NextResponse } from "next/server";
import { complete, llmLabel } from "@/lib/llm";
import { getLlmMode } from "@/lib/config";
import { bountyView } from "@/lib/views";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Msg = { role: "user" | "assistant"; content: string };

function buildContext(bountyId?: string): string {
  if (!bountyId) {
    return "No specific task is open. You can describe the networking agent's capabilities: it finds contacts, pays per lookup via x402 (USDC on Base), and reaches out by email (Resend) or AI voice call (ElevenLabs).";
  }
  const v = bountyView(bountyId);
  if (!v) return "The referenced task could not be found.";
  const reached =
    (v.run?.finalOutput ? v.run.finalOutput : undefined) ?? "(no outreach yet)";
  return [
    `Current task: "${v.bounty.title}"`,
    `Goal/description: ${v.bounty.description}`,
    `Status: ${v.bounty.status}`,
    `Budget: ${v.bounty.budgetUsdc} USDC · Max tool spend: ${v.bounty.maxToolSpendUsdc} USDC`,
    `Outreach mode: ${v.bounty.outreachMode ?? "email"}`,
    `Total spent so far: ${v.run?.totalToolSpendUsdc ?? "0"} USDC`,
    `Allowed tools: ${v.bounty.allowedTools.join(", ")}`,
    `Outreach summary:\n${reached}`,
  ].join("\n");
}

function mockReply(message: string, context: string): string {
  return [
    `(${llmLabel()}) Here's what I know about the current task:`,
    "",
    context,
    "",
    `You asked: "${message}". Add an OpenAI/Anthropic key to enable live conversational replies.`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    message?: string;
    bountyId?: string;
    history?: Msg[];
  };
  const message = String(body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const context = buildContext(body.bountyId);

  if (getLlmMode() === "mock") {
    return NextResponse.json({ reply: mockReply(message, context), llm: llmLabel() });
  }

  const system =
    "You are the user's autonomous networking agent. You have a USDC wallet on Base and pay per action via x402: " +
    "search-contacts, enrich-contact, send-email (Resend), and place-call (ElevenLabs voice). " +
    "Be concise, helpful, and concrete. Answer questions about the current task, what you spent, and who you reached. " +
    "If the user asks you to do something outside the current run, explain how they'd kick it off (brief a task + budget, then Run agent).";

  const history = (body.history ?? [])
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "Agent"}: ${m.content}`)
    .join("\n");

  const prompt = `Context about the current task:\n${context}\n\nConversation so far:\n${history}\n\nUser: ${message}\n\nReply as the agent.`;

  const reply = await complete(system, prompt);
  return NextResponse.json({
    reply: reply === "__MOCK__" ? mockReply(message, context) : reply,
    llm: llmLabel(),
  });
}
