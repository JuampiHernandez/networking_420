import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "x402-next";
import {
  USDC_ADDRESS_BASE_SEPOLIA,
  X402_NETWORK,
  getChainMode,
  serverConfig,
  simTxHash,
} from "./config";
import { toUsdcUnits } from "./chain";
import { TOOLS, type ToolDef } from "./tools";
import { getServiceByToolId } from "./services";

const ZERO = "0x0000000000000000000000000000000000000000";

function payTo(): `0x${string}` {
  return (serverConfig.toolSellerAddress ?? ZERO) as `0x${string}`;
}

type Produce = (body: Record<string, unknown>) => Promise<unknown> | unknown;

async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Build a Next.js App Router POST handler for an x402-paid tool.
 *
 * Real mode: wraps the resource with `withX402` so the agent must present a
 * valid X-PAYMENT header that is verified + settled on Base Sepolia by the
 * facilitator before the resource is unlocked.
 *
 * Sim mode: implements the same wire protocol (HTTP 402 -> X-PAYMENT -> 200
 * with an X-PAYMENT-RESPONSE settlement record) but settles locally so the
 * demo runs without funded keys.
 */
export function createPaidRoute(tool: ToolDef, produce: Produce) {
  const handler = async (req: NextRequest) => {
    const body = await readBody(req);
    const data = await produce(body);
    return NextResponse.json(data);
  };

  if (getChainMode() === "real" && serverConfig.toolSellerAddress) {
    const wrapped = withX402(
      handler,
      payTo(),
      {
        price: tool.priceLabel,
        network: X402_NETWORK,
        config: {
          description: tool.description,
          // Pin the resource URL so facilitator verification matches the buyer.
          resource: serverConfig.appUrl + tool.endpoint,
        },
      },
      { url: serverConfig.facilitatorUrl as `${string}://${string}` },
    );
    return (req: NextRequest) => wrapped(req);
  }

  // ---- Simulated x402 flow ----
  return simulatedX402Handler(tool, handler);
}

function simulatedX402Handler(
  tool: ToolDef,
  handler: (req: NextRequest) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    const paymentHeader = req.headers.get("x-payment");

    if (!paymentHeader) {
      const accepts = [
        {
          scheme: "exact",
          network: X402_NETWORK,
          maxAmountRequired: toUsdcUnits(tool.price).toString(),
          resource: serverConfig.appUrl + tool.endpoint,
          description: tool.description,
          mimeType: "application/json",
          payTo: payTo(),
          maxTimeoutSeconds: 60,
          asset: USDC_ADDRESS_BASE_SEPOLIA,
          extra: { name: "USDC", version: "2", simulated: true },
        },
      ];
      return NextResponse.json(
        { x402Version: 1, error: "X-PAYMENT header is required", accepts },
        { status: 402 },
      );
    }

    const res = await handler(req);
    const txHash = simTxHash(`${tool.name}:${paymentHeader.slice(0, 12)}`);
    const settlement = {
      success: true,
      transaction: txHash,
      network: X402_NETWORK,
      payer: "0xSIMULATED_AGENT_WALLET",
      simulated: true,
    };
    res.headers.set(
      "X-PAYMENT-RESPONSE",
      Buffer.from(JSON.stringify(settlement)).toString("base64"),
    );
    return res;
  };
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Human-friendly landing page served on GET of a paid tool endpoint. Explains
 * the API's capabilities, pricing and the x402 paywall it returns on POST.
 */
export function toolLandingResponse(toolId: string): NextResponse {
  const tool = TOOLS[toolId];
  if (!tool) {
    return NextResponse.json({ error: "Unknown tool" }, { status: 404 });
  }
  const svc = getServiceByToolId(toolId);
  const brand = svc?.brand ?? tool.name;
  const tagline = svc?.tagline ?? tool.description;
  const description = svc?.description ?? tool.description;
  const accent = svc?.accent ?? "#3b82f6";
  const payTo = serverConfig.toolSellerAddress ?? ZERO;
  const live = getChainMode() === "real" && Boolean(serverConfig.toolSellerAddress);

  const accepts = {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: X402_NETWORK,
        maxAmountRequired: toUsdcUnits(tool.price).toString(),
        resource: serverConfig.appUrl + tool.endpoint,
        description: tool.description,
        mimeType: "application/json",
        payTo,
        maxTimeoutSeconds: 60,
        asset: USDC_ADDRESS_BASE_SEPOLIA,
        extra: { name: "USDC", version: "2" },
      },
    ],
  };

  const features = svc?.features ?? [];
  const useCases = svc?.useCases ?? [];
  const li = (items: string[]) =>
    items.map((i) => `<li>${esc(i)}</li>`).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(brand)} — x402 API</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:#06080d; color:#e6edf3; font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  a { color:#7cc4ff; text-decoration:none; }
  a:hover { text-decoration:underline; }
  .wrap { max-width:880px; margin:0 auto; padding:48px 24px 80px; }
  .badge { display:inline-flex; align-items:center; gap:6px; font-size:12px; padding:3px 10px; border:1px solid #1e2733; border-radius:999px; color:#9bb0c3; background:#0b0f16; }
  .price { font-size:30px; font-weight:800; color:${accent}; }
  h1 { font-size:38px; margin:14px 0 6px; letter-spacing:-.02em; }
  .tag { color:#9bb0c3; font-size:18px; margin:0 0 20px; }
  .panel { border:1px solid #1e2733; background:#0b0f16; border-radius:14px; padding:20px 22px; margin:16px 0; }
  .grid { display:grid; gap:16px; grid-template-columns:1fr 1fr; }
  @media (max-width:640px){ .grid{ grid-template-columns:1fr; } }
  .k { color:#6f8093; font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
  .v { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:13px; word-break:break-all; }
  pre { background:#05070b; border:1px solid #1e2733; border-radius:10px; padding:14px; overflow:auto; font-size:12.5px; color:#a9c7e8; }
  ul { margin:8px 0 0; padding-left:18px; color:#9bb0c3; }
  li { margin:4px 0; }
  .head { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; flex-wrap:wrap; }
  .dot { width:8px; height:8px; border-radius:99px; background:${live ? "#34d399" : "#fbbf24"}; }
  code.inline { background:#05070b; border:1px solid #1e2733; border-radius:6px; padding:1px 6px; font-family:ui-monospace,monospace; font-size:13px; }
  .muted { color:#6f8093; font-size:13px; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <div>
        <span class="badge">${esc(svc?.category ?? tool.category)} · x402 API</span>
        <h1>${esc(brand)}</h1>
        <p class="tag">${esc(tagline)}</p>
      </div>
      <div style="text-align:right">
        <div class="price">${esc(tool.priceLabel)}</div>
        <div class="muted">USDC per call</div>
        <div class="badge" style="margin-top:8px"><span class="dot"></span>${live ? "live on Base Sepolia" : "simulated settlement"}</div>
      </div>
    </div>

    <p class="muted" style="font-size:15px;color:#9bb0c3">${esc(description)}</p>

    <div class="panel">
      <div class="k">Endpoint</div>
      <div class="v" style="margin-top:4px;color:#7cc4ff">${esc(tool.method)} ${esc(serverConfig.appUrl + tool.endpoint)}</div>
      <div class="grid" style="margin-top:16px">
        <div><div class="k">Network</div><div class="v">Base Sepolia (84532)</div></div>
        <div><div class="k">Asset</div><div class="v">USDC · ${esc(USDC_ADDRESS_BASE_SEPOLIA)}</div></div>
        <div><div class="k">Pay to</div><div class="v">${esc(payTo)}</div></div>
        <div><div class="k">Protocol</div><div class="v">x402 (HTTP 402 · EIP-3009)</div></div>
      </div>
    </div>

    ${features.length || useCases.length ? `<div class="grid">
      ${features.length ? `<div class="panel"><div class="k">Capabilities</div><ul>${li(features)}</ul></div>` : ""}
      ${useCases.length ? `<div class="panel"><div class="k">Use cases</div><ul>${li(useCases)}</ul></div>` : ""}
    </div>` : ""}

    ${svc ? `<div class="grid">
      <div class="panel"><div class="k">Request</div><pre>${esc(svc.requestExample)}</pre></div>
      <div class="panel"><div class="k">Response (after payment)</div><pre>${esc(svc.responseExample)}</pre></div>
    </div>` : ""}

    <div class="panel">
      <div class="k">402 challenge (what a POST without payment returns)</div>
      <pre>${esc(JSON.stringify(accepts, null, 2))}</pre>
      <p class="muted">An agent signs a USDC payment authorization for this challenge, the facilitator settles it on Base Sepolia, then the same request is retried and the resource unlocks. No API keys, no subscription — pay per call.</p>
    </div>

    <p class="muted">${svc ? `Full product page: <a href="${esc(serverConfig.appUrl)}/services/${esc(svc.slug)}">/services/${esc(svc.slug)}</a> · ` : ""}Powered by ${esc(svc?.poweredBy ?? "Relay")}.</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
