import {
  agentAccount,
  treasuryAccount,
  getUsdcBalance,
} from "./chain";
import {
  getChainMode,
  getCallMode,
  getEmailMode,
  getLlmMode,
  type LlmMode,
  publicConfig,
  serverConfig,
  EXPLORER_BASE_URL,
  USDC_ADDRESS_BASE_SEPOLIA,
} from "./config";
import { llmLabel } from "./llm";

export type SystemStatus = {
  network: string;
  chainMode: "real" | "sim";
  llmMode: LlmMode;
  llmLabel: string;
  emailMode: "real" | "sim";
  callMode: "real" | "sim";
  usdcAddress: string;
  explorer: string;
  privyConfigured: boolean;
  escrowAddress?: string;
  wallets: {
    agent?: { address: string; usdc: string };
    treasury?: { address: string; usdc: string };
  };
  calls: {
    configured: boolean;
    demoPhone?: string;
    hint?: string;
  };
  fundingHint?: string;
};

export async function getSystemStatus(): Promise<SystemStatus> {
  const agent = agentAccount();
  const treasury = treasuryAccount();
  const escrow =
    publicConfig.privyAppId && process.env.NEXT_PUBLIC_ESCROW_ADDRESS
      ? process.env.NEXT_PUBLIC_ESCROW_ADDRESS
      : serverConfig.toolSellerAddress;

  const wallets: SystemStatus["wallets"] = {};
  if (agent) {
    wallets.agent = {
      address: agent.address,
      usdc: await getUsdcBalance(agent.address),
    };
  }
  if (treasury) {
    wallets.treasury = {
      address: treasury.address,
      usdc: await getUsdcBalance(treasury.address),
    };
  }

  let callsHint: string | undefined;
  if (getCallMode() === "real" && serverConfig.demoContactPhone) {
    callsHint =
      "Outbound calls route to DEMO_CONTACT_PHONE. On Twilio trial accounts that number must be verified at console.twilio.com → Verified Caller IDs.";
  } else if (getCallMode() === "sim") {
    callsHint =
      "Set ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, and ELEVENLABS_AGENT_PHONE_NUMBER_ID for live calls.";
  }

  let fundingHint: string | undefined;
  if (getChainMode() === "real") {
    fundingHint =
      "Live mode: Fund sends your USDC to escrow on Base Sepolia (real tx). Approve & pay releases escrow to the agent on-chain.";
    const tBal = wallets.treasury?.usdc;
    if (tBal && Number(tBal) < 1) {
      fundingHint +=
        ` Treasury currently holds ${tBal} USDC — fund each bounty on-chain before approving payout.`;
    }
  }

  return {
    network: "Base Sepolia",
    chainMode: getChainMode(),
    llmMode: getLlmMode(),
    llmLabel: llmLabel(),
    emailMode: getEmailMode(),
    callMode: getCallMode(),
    usdcAddress: USDC_ADDRESS_BASE_SEPOLIA,
    explorer: EXPLORER_BASE_URL,
    privyConfigured: Boolean(publicConfig.privyAppId),
    escrowAddress: escrow,
    wallets,
    calls: {
      configured: getCallMode() === "real",
      demoPhone: serverConfig.demoContactPhone,
      hint: callsHint,
    },
    fundingHint,
  };
}
