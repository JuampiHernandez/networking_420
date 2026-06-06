import { createSigner } from "x402/types";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";
import { X402_NETWORK, getChainMode, serverConfig } from "./config";
import { toUsdcUnits } from "./chain";
import { TOOLS } from "./tools";

export type PaidToolResult = {
  ok: boolean;
  data: unknown;
  txHash?: string;
  payer?: string;
  network: string;
  priceUsdc: string;
  simulated: boolean;
  challenged402: boolean;
  error?: string;
};

const X402_RETRIES = 3;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatHttpError(status: number, data: unknown): string {
  if (data && typeof data === "object" && "error" in data) {
    const detail = String((data as { error: unknown }).error);
    return `HTTP ${status}: ${detail}`;
  }
  return `HTTP ${status}`;
}

function decodePaymentHeader(header: string | null) {
  if (!header) return undefined;
  try {
    return decodeXPaymentResponse(header);
  } catch {
    try {
      return JSON.parse(Buffer.from(header, "base64").toString()) as {
        transaction?: string;
        payer?: string;
      };
    } catch {
      return undefined;
    }
  }
}

/**
 * Agent-side x402 buyer. Calls a paid tool endpoint, handling the
 * 402 -> sign payment -> retry -> unlock resource flow.
 */
export async function callPaidTool(
  toolName: keyof typeof TOOLS,
  payload: Record<string, unknown>,
  maxPaymentUsdc: string,
): Promise<PaidToolResult> {
  const tool = TOOLS[toolName];
  const url = serverConfig.appUrl + tool.endpoint;
  const body = JSON.stringify(payload);
  const baseHeaders = { "Content-Type": "application/json" };

  // ---- Real on-chain x402 (signed EIP-3009, settled via facilitator) ----
  if (getChainMode() === "real" && serverConfig.agentPrivateKey) {
    try {
      const signer = await createSigner(
        X402_NETWORK,
        serverConfig.agentPrivateKey as `0x${string}`,
      );
      const fetchWithPay = wrapFetchWithPayment(
        fetch,
        signer,
        toUsdcUnits(maxPaymentUsdc),
      );

      let lastResult: PaidToolResult | undefined;
      for (let attempt = 0; attempt < X402_RETRIES; attempt++) {
        if (attempt > 0) await sleep(400 * attempt);

        const res = await fetchWithPay(url, {
          method: tool.method,
          headers: baseHeaders,
          body,
        });
        const data = await res.json().catch(() => ({}));
        const decoded = decodePaymentHeader(res.headers.get("x-payment-response"));
        const challenged402 = res.status === 402 || Boolean(decoded);

        lastResult = {
          ok: res.ok,
          data,
          txHash: decoded?.transaction,
          payer: decoded?.payer,
          network: X402_NETWORK,
          priceUsdc: tool.price,
          simulated: false,
          challenged402,
          error: res.ok ? undefined : formatHttpError(res.status, data),
        };

        if (res.ok) return lastResult;
        // Facilitator settlement can fail transiently after a signed payment.
        if (res.status !== 402 || attempt === X402_RETRIES - 1) break;
      }

      return (
        lastResult ?? {
          ok: false,
          data: {},
          network: X402_NETWORK,
          priceUsdc: tool.price,
          simulated: false,
          challenged402: false,
          error: "payment failed",
        }
      );
    } catch (err) {
      return {
        ok: false,
        data: {},
        network: X402_NETWORK,
        priceUsdc: tool.price,
        simulated: false,
        challenged402: false,
        error: err instanceof Error ? err.message : "payment failed",
      };
    }
  }

  // ---- Simulated x402 (real HTTP 402 handshake, local settlement) ----
  let res = await fetch(url, { method: tool.method, headers: baseHeaders, body });
  let challenged = false;
  if (res.status === 402) {
    challenged = true;
    const fakePayment = Buffer.from(
      JSON.stringify({
        x402Version: 1,
        scheme: "exact",
        network: X402_NETWORK,
        payload: { simulated: true, maxAmount: maxPaymentUsdc },
      }),
    ).toString("base64");
    res = await fetch(url, {
      method: tool.method,
      headers: { ...baseHeaders, "X-PAYMENT": fakePayment },
      body,
    });
  }
  const data = await res.json().catch(() => ({}));
  const header = res.headers.get("x-payment-response");
  let txHash: string | undefined;
  let payer: string | undefined;
  if (header) {
    try {
      const decoded = JSON.parse(Buffer.from(header, "base64").toString());
      txHash = decoded.transaction;
      payer = decoded.payer;
    } catch {
      // ignore
    }
  }
  return {
    ok: res.ok,
    data,
    txHash,
    payer,
    network: X402_NETWORK,
    priceUsdc: tool.price,
    simulated: true,
    challenged402: challenged,
    error: res.ok ? undefined : formatHttpError(res.status, data),
  };
}

export class ToolCallError extends Error {
  readonly toolName: string;
  readonly reported = true;

  constructor(toolName: string, message: string) {
    super(message);
    this.name = "ToolCallError";
    this.toolName = toolName;
  }
}
