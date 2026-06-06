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
      const res = await fetchWithPay(url, {
        method: tool.method,
        headers: baseHeaders,
        body,
      });
      const data = await res.json().catch(() => ({}));
      const header = res.headers.get("x-payment-response");
      const decoded = header ? decodeXPaymentResponse(header) : undefined;
      return {
        ok: res.ok,
        data,
        txHash: decoded?.transaction,
        payer: decoded?.payer,
        network: X402_NETWORK,
        priceUsdc: tool.price,
        simulated: false,
        challenged402: true,
        error: res.ok ? undefined : `HTTP ${res.status}`,
      };
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
    error: res.ok ? undefined : `HTTP ${res.status}`,
  };
}
