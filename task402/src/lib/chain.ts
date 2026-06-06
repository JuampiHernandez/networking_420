import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  decodeEventLog,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
  USDC_ADDRESS_BASE_SEPOLIA,
  USDC_DECIMALS,
  serverConfig,
  getChainMode,
  simTxHash as fakeTxHash,
} from "./config";

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const TRANSFER_EVENT = {
  type: "event",
  name: "Transfer",
  inputs: [
    { indexed: true, name: "from", type: "address" },
    { indexed: true, name: "to", type: "address" },
    { indexed: false, name: "value", type: "uint256" },
  ],
} as const;

export class ChainTransferError extends Error {
  constructor(
    message: string,
    public readonly details?: {
      availableUsdc?: string;
      requiredUsdc?: string;
      wallet?: string;
    },
  ) {
    super(message);
    this.name = "ChainTransferError";
  }
}

export function publicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(serverConfig.rpcUrl),
  });
}

export function agentAccount() {
  if (!serverConfig.agentPrivateKey) return undefined;
  return privateKeyToAccount(serverConfig.agentPrivateKey as Hex);
}

export function treasuryAccount() {
  if (!serverConfig.treasuryPrivateKey) return undefined;
  return privateKeyToAccount(serverConfig.treasuryPrivateKey as Hex);
}

export function toUsdcUnits(amount: string | number): bigint {
  return parseUnits(String(amount), USDC_DECIMALS);
}

export function fromUsdcUnits(units: bigint): string {
  return formatUnits(units, USDC_DECIMALS);
}

export async function getUsdcBalance(address: string): Promise<string> {
  try {
    const bal = await publicClient().readContract({
      address: USDC_ADDRESS_BASE_SEPOLIA,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address as Hex],
    });
    return fromUsdcUnits(bal as bigint);
  } catch {
    return "0";
  }
}

/**
 * Verify a creator funding tx on Base Sepolia: must succeed and include a USDC
 * transfer to the escrow (treasury) address.
 */
export async function verifyFundingTx(
  txHash: string,
  escrowAddress: string,
  minAmountUsdc: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const client = publicClient();
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash as Hex,
      timeout: 90_000,
    });
    if (receipt.status !== "success") {
      return { ok: false, error: "Funding transaction reverted on Base Sepolia." };
    }

    const minUnits = toUsdcUnits(minAmountUsdc);
    let received = BigInt(0);
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== USDC_ADDRESS_BASE_SEPOLIA.toLowerCase()) {
        continue;
      }
      try {
        const decoded = decodeEventLog({
          abi: [TRANSFER_EVENT],
          data: log.data,
          topics: log.topics,
        });
        if (
          decoded.eventName === "Transfer" &&
          (decoded.args.to as string).toLowerCase() === escrowAddress.toLowerCase()
        ) {
          received += decoded.args.value as bigint;
        }
      } catch {
        // not a USDC Transfer log
      }
    }

    if (received < minUnits) {
      return {
        ok: false,
        error: `Funding tx found on Base Sepolia but escrow received ${fromUsdcUnits(received)} USDC (expected at least ${minAmountUsdc}).`,
      };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "could not verify funding tx";
    return { ok: false, error: `Could not confirm funding on Base Sepolia: ${msg}` };
  }
}

/**
 * Transfer USDC from the treasury wallet to a recipient on Base Sepolia.
 * In sim mode returns a deterministic fake hash. In real mode throws if the
 * treasury lacks balance or the transfer reverts — never silently fakes it.
 */
export async function transferUsdc(
  to: string,
  amount: string,
  memo: string,
): Promise<{ txHash: string; simulated: boolean }> {
  const account = treasuryAccount() ?? agentAccount();
  if (getChainMode() === "sim" || !account) {
    return { txHash: fakeTxHash(`${to}:${amount}:${memo}`), simulated: true };
  }

  const available = await getUsdcBalance(account.address);
  const required = Number(amount);
  if (Number(available) + 1e-9 < required) {
    throw new ChainTransferError(
      `Treasury has ${available} USDC but this transfer needs ${required.toFixed(2)} USDC. ` +
        `Fund the bounty on-chain first (creator wallet → escrow on Base Sepolia).`,
      { availableUsdc: available, requiredUsdc: required.toFixed(2), wallet: account.address },
    );
  }

  const wallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(serverConfig.rpcUrl),
  });
  try {
    const txHash = await wallet.writeContract({
      address: USDC_ADDRESS_BASE_SEPOLIA,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [to as Hex, toUsdcUnits(amount)],
    });
    const receipt = await publicClient().waitForTransactionReceipt({
      hash: txHash,
      timeout: 90_000,
    });
    if (receipt.status !== "success") {
      throw new ChainTransferError("Payout transaction reverted on Base Sepolia.");
    }
    return { txHash, simulated: false };
  } catch (err) {
    if (err instanceof ChainTransferError) throw err;
    const message = err instanceof Error ? err.message : "transfer failed";
    throw new ChainTransferError(`On-chain USDC transfer failed: ${message}`, {
      availableUsdc: available,
      requiredUsdc: required.toFixed(2),
      wallet: account.address,
    });
  }
}
