/**
 * Central configuration + runtime-mode detection for Task402.
 *
 * The app is designed to run in two modes per subsystem so the demo is always
 * functional, and becomes fully on-chain / LLM-powered the moment keys exist:
 *
 *  - chainMode "real": agent signs + settles x402 payments and USDC transfers
 *    on Base Sepolia using AGENT_PRIVATE_KEY + a real facilitator.
 *  - chainMode "sim":  x402 wire protocol still runs (402 -> X-PAYMENT -> settle)
 *    but settlement is mocked locally with deterministic fake tx hashes.
 *
 *  - llmMode "real": agent reasoning/drafting uses OpenAI/Anthropic.
 *  - llmMode "mock": deterministic templated output (still demoable).
 */

export const USDC_DECIMALS = 6;

/**
 * Platform fee charged on top of what the agent actually spent on tools.
 * The creator is charged `toolSpend * (1 + PLATFORM_FEE_RATE)` and the rest of
 * the escrowed budget is refunded — the agent never pockets the leftover.
 * Expressed as a fraction of tool spend (0.10 = 10%). Override via env.
 */
export const PLATFORM_FEE_RATE = (() => {
  const v = Number(process.env.PLATFORM_FEE_RATE);
  return Number.isFinite(v) && v >= 0 ? v : 0.1;
})();

// Base Sepolia
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const USDC_ADDRESS_BASE_SEPOLIA =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
export const EXPLORER_BASE_URL = "https://sepolia.basescan.org";
export const X402_NETWORK = "base-sepolia" as const;

function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export const serverConfig = {
  appUrl: env("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000",
  rpcUrl: env("BASE_SEPOLIA_RPC_URL") ?? "https://sepolia.base.org",
  facilitatorUrl: env("X402_FACILITATOR_URL") ?? "https://x402.org/facilitator",

  agentPrivateKey: env("AGENT_PRIVATE_KEY"),
  treasuryPrivateKey: env("TREASURY_PRIVATE_KEY"),
  // Address that receives x402 tool payments (the "tool/API seller").
  toolSellerAddress: env("TOOL_SELLER_ADDRESS"),

  llmProvider: (env("LLM_PROVIDER") ?? "openai") as "openai" | "anthropic",
  llmModel: env("LLM_MODEL"),
  openaiKey: env("OPENAI_API_KEY"),
  anthropicKey: env("ANTHROPIC_API_KEY"),

  // ---- Resend (real outreach email) ----
  resendKey: env("RESEND_API_KEY"),
  resendFrom: env("RESEND_FROM") ?? "Networking Agent <onboarding@resend.dev>",

  // ---- ElevenLabs (real AI voice calls) ----
  elevenLabsKey: env("ELEVENLABS_API_KEY"),
  elevenLabsAgentId: env("ELEVENLABS_AGENT_ID"),
  elevenLabsAgentPhoneId: env("ELEVENLABS_AGENT_PHONE_NUMBER_ID"),
  elevenLabsVoiceAgentId: env("NEXT_PUBLIC_ELEVENLABS_VOICE_AGENT_ID"),

  // ---- Demo overrides: route all outreach to you so you can see it land ----
  demoContactEmail: env("DEMO_CONTACT_EMAIL"),
  demoContactPhone: env("DEMO_CONTACT_PHONE"),
};

export const publicConfig = {
  privyAppId: process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export type ChainMode = "real" | "sim";
export type LlmMode = "real" | "mock";

export function getChainMode(): ChainMode {
  return serverConfig.agentPrivateKey ? "real" : "sim";
}

export function getLlmMode(): LlmMode {
  if (serverConfig.llmProvider === "anthropic") {
    return serverConfig.anthropicKey ? "real" : "mock";
  }
  return serverConfig.openaiKey ? "real" : "mock";
}

export function getEmailMode(): "real" | "sim" {
  return serverConfig.resendKey ? "real" : "sim";
}

export function getCallMode(): "real" | "sim" {
  return serverConfig.elevenLabsKey &&
    serverConfig.elevenLabsAgentId &&
    serverConfig.elevenLabsAgentPhoneId
    ? "real"
    : "sim";
}

export function explorerTx(hash: string): string {
  return `${EXPLORER_BASE_URL}/tx/${hash}`;
}

/** Deterministic-ish fake tx hash used for simulated settlement records. */
export function simTxHash(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hex = (h.toString(16) + Date.now().toString(16) + Math.floor(Math.random() * 1e9).toString(16))
    .padEnd(64, "0")
    .slice(0, 64);
  return `0x${hex}`;
}

export function explorerAddress(address: string): string {
  return `${EXPLORER_BASE_URL}/address/${address}`;
}
