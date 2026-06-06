import { NextResponse } from "next/server";
import { modeInfo } from "@/lib/views";
import {
  USDC_ADDRESS_BASE_SEPOLIA,
  serverConfig,
  publicConfig,
} from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ...modeInfo(),
    usdcAddress: USDC_ADDRESS_BASE_SEPOLIA,
    facilitatorUrl: serverConfig.facilitatorUrl,
    toolSellerConfigured: Boolean(serverConfig.toolSellerAddress),
    privyConfigured: Boolean(publicConfig.privyAppId),
    voiceWidgetConfigured: Boolean(
      process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_AGENT_ID,
    ),
  });
}
