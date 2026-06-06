import { createPaidRoute, toolLandingResponse } from "@/lib/x402-seller";
import { TOOLS } from "@/lib/tools";
import { placeOutreachCall } from "@/lib/voice";
import { getChainMode } from "@/lib/config";
import { agentAccount, transferUsdc } from "@/lib/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createPaidRoute(TOOLS["place-call"], async (body) => {
  const to = (body.to as string) ?? "";
  const name = (body.name as string) ?? "there";
  const objective = (body.objective as string) ?? "a quick networking intro";
  const firstMessage = (body.firstMessage as string) ?? undefined;
  const result = await placeOutreachCall({ to, name, objective, firstMessage });

  // The x402 charge is captured before this handler runs. If the call could not
  // be connected, refund the agent so it isn't charged for a call that never
  // happened. Only meaningful when settlement is real on-chain.
  if (!result.ok && getChainMode() === "real") {
    const agent = agentAccount();
    if (agent) {
      try {
        const refund = await transferUsdc(
          agent.address,
          TOOLS["place-call"].price,
          `refund:call-failed`,
        );
        return {
          ...result,
          refunded: true,
          refundTxHash: refund.txHash,
          priceRefundedUsdc: TOOLS["place-call"].price,
        };
      } catch {
        // If the refund transfer itself fails, fall through with no refund flag.
      }
    }
  }
  return result;
});

export async function GET() {
  return toolLandingResponse("place-call");
}
