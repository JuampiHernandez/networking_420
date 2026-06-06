"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  usePrivy,
  useWallets,
  useLogin,
  useLogout,
  useSendTransaction,
  useCreateWallet,
} from "@privy-io/react-auth";
import {
  createPublicClient,
  http,
  encodeFunctionData,
  formatUnits,
} from "viem";
import { baseSepolia } from "viem/chains";

const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
const ESCROW = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ?? "") as string;

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "a", type: "address" }],
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

export type WalletCtx = {
  mode: "privy" | "demo";
  ready: boolean;
  authenticated: boolean;
  address?: string;
  email?: string;
  usdcBalance?: string;
  login: () => void;
  logout: () => void;
  refreshBalance: () => Promise<void>;
  fundBounty: (amountUsdc: string) => Promise<{ txHash: string }>;
};

const Ctx = createContext<WalletCtx | null>(null);

export function useWallet(): WalletCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWallet must be used within WalletProvider");
  return c;
}

function publicClient() {
  return createPublicClient({ chain: baseSepolia, transport: http() });
}

async function readUsdc(address: string): Promise<string> {
  try {
    const bal = await publicClient().readContract({
      address: USDC,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    });
    return Number(formatUnits(bal as bigint, 6)).toFixed(2);
  } catch {
    return "0.00";
  }
}

/** Privy-backed wallet provider (used when NEXT_PUBLIC_PRIVY_APP_ID is set). */
function PrivyWalletProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const { createWallet } = useCreateWallet();
  const [balance, setBalance] = useState<string>();
  const creatingRef = useRef(false);

  // Always prefer the Privy embedded wallet (the one funded in-app), even when
  // an external extension like Rabby/MetaMask is also detected by Privy.
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const hasEmbeddedLinked = (user?.linkedAccounts ?? []).some(
    (a) =>
      a.type === "wallet" &&
      (a as { walletClientType?: string }).walletClientType === "privy",
  );
  const address =
    embeddedWallet?.address ??
    (hasEmbeddedLinked ? user?.wallet?.address : undefined) ??
    user?.wallet?.address ??
    wallets?.[0]?.address;
  const email = user?.email?.address;

  // If the user is authenticated but no embedded wallet exists yet (e.g. the
  // account was created under an older config), provision one so they always
  // have an in-app wallet to fund from.
  useEffect(() => {
    if (!ready || !authenticated) return;
    if (embeddedWallet || creatingRef.current) return;
    creatingRef.current = true;
    createWallet()
      .catch(() => {
        // user may already have one mid-provisioning; ignore
      })
      .finally(() => {
        creatingRef.current = false;
      });
  }, [ready, authenticated, embeddedWallet, createWallet]);

  const refreshBalance = useCallback(async () => {
    if (address) setBalance(await readUsdc(address));
  }, [address]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  const fundBounty = useCallback(
    async (amountUsdc: string) => {
      if (!ESCROW) {
        throw new Error(
          "Escrow address not configured (NEXT_PUBLIC_ESCROW_ADDRESS). Cannot fund on-chain.",
        );
      }
      if (!address) {
        throw new Error("Connect your wallet before funding.");
      }
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [
          ESCROW as `0x${string}`,
          BigInt(Math.round(Number(amountUsdc) * 1e6)),
        ],
      });

      // Prefer the Privy embedded wallet (funded in-app). Only fall back to an
      // external wallet (Rabby/MetaMask/Coinbase) if there is no embedded one.
      // External wallets MUST send via their own EIP-1193 provider —
      // Privy's useSendTransaction is embedded-only.
      const wallet =
        embeddedWallet ??
        wallets.find(
          (w) => w.address?.toLowerCase() === address.toLowerCase(),
        ) ??
        wallets[0];
      const isEmbedded = wallet?.walletClientType === "privy";

      try {
        if (isEmbedded) {
          // Gas sponsorship requires a paymaster configured in the Privy
          // dashboard for Base Sepolia. Default to sponsored (gas-less) but
          // gracefully fall back to a self-paid tx if sponsorship is disabled,
          // so funding never hard-fails with a 400 "Gas sponsorship is not
          // enabled" error. Set NEXT_PUBLIC_PRIVY_GAS_SPONSOR=false to skip the
          // sponsored attempt entirely.
          const wantSponsor =
            (process.env.NEXT_PUBLIC_PRIVY_GAS_SPONSOR ?? "true") !== "false";

          const submit = async (sponsor: boolean) => {
            const res = await sendTransaction(
              { to: USDC, data, chainId: baseSepolia.id } as never,
              {
                ...(sponsor ? { sponsor: true } : {}),
                // Privy's modal only shows native ETH value (0 for ERC-20 calls).
                // This description makes the USDC amount explicit to the user.
                uiOptions: {
                  description: `Fund task escrow: ${Number(amountUsdc).toFixed(2)} USDC on Base Sepolia → ${ESCROW.slice(0, 6)}…${ESCROW.slice(-4)}`,
                  buttonText: `Send ${Number(amountUsdc).toFixed(2)} USDC`,
                },
              } as never,
            );
            return typeof res === "string"
              ? res
              : (res as { hash?: string })?.hash;
          };

          const isSponsorshipError = (e: unknown) => {
            const m = (e instanceof Error ? e.message : String(e)).toLowerCase();
            return m.includes("sponsor"); // "Gas sponsorship is not enabled"
          };

          let txHash: string | undefined;
          try {
            txHash = await submit(wantSponsor);
          } catch (err) {
            if (wantSponsor && isSponsorshipError(err)) {
              // Paymaster not configured — retry paying gas from the embedded
              // wallet (needs a little Base Sepolia ETH).
              txHash = await submit(false);
            } else {
              throw err;
            }
          }

          if (!txHash) {
            throw new Error(
              "Privy did not return a transaction hash. Funding was not submitted.",
            );
          }
          await refreshBalance();
          return { txHash };
        }

        // ---- External wallet: send through its provider ----
        if (!wallet) {
          throw new Error("No connected wallet found.");
        }
        try {
          await wallet.switchChain(baseSepolia.id);
        } catch {
          throw new Error(
            "Switch your wallet to Base Sepolia (testnet) and try again.",
          );
        }
        const provider = await wallet.getEthereumProvider();
        const txHash = (await provider.request({
          method: "eth_sendTransaction",
          params: [{ from: address, to: USDC, data, value: "0x0" }],
        })) as string;
        if (!txHash) {
          throw new Error("Wallet did not return a transaction hash.");
        }
        await refreshBalance();
        return { txHash };
      } catch (err) {
        const raw =
          err instanceof Error ? err.message : "USDC transfer failed in wallet";
        const low = raw.toLowerCase();
        let msg = raw;
        if (low.includes("sponsor")) {
          msg =
            "Gas sponsorship is not enabled for this Privy app on Base Sepolia. " +
            "Enable a paymaster in the Privy dashboard, or set " +
            "NEXT_PUBLIC_PRIVY_GAS_SPONSOR=false and fund the embedded wallet " +
            "with a little Base Sepolia ETH for gas.";
        } else if (
          low.includes("insufficient") ||
          low.includes("gas") ||
          low.includes("funds")
        ) {
          msg =
            "The embedded wallet has no Base Sepolia ETH to pay gas. " +
            "Send it some testnet ETH, or enable gas sponsorship in the Privy dashboard.";
        }
        throw new Error(`Funding failed: ${msg}`);
      }
    },
    [sendTransaction, refreshBalance, address, wallets, embeddedWallet],
  );

  const value = useMemo<WalletCtx>(
    () => ({
      mode: "privy",
      ready,
      authenticated,
      address,
      email,
      usdcBalance: balance,
      login: () => login(),
      logout: () => void logout(),
      refreshBalance,
      fundBounty,
    }),
    [ready, authenticated, address, email, balance, login, logout, refreshBalance, fundBounty],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Demo wallet provider (used when Privy is not configured). */
function DemoWalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string>();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("task402_demo_wallet");
    if (saved) {
      setAddress(saved);
      setAuthenticated(true);
    }
  }, []);

  const login = useCallback(() => {
    const hex =
      "0x" +
      Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join("");
    localStorage.setItem("task402_demo_wallet", hex);
    setAddress(hex);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("task402_demo_wallet");
    setAddress(undefined);
    setAuthenticated(false);
  }, []);

  const value = useMemo<WalletCtx>(
    () => ({
      mode: "demo",
      ready: true,
      authenticated,
      address,
      email: authenticated ? "demo@task402.dev" : undefined,
      usdcBalance: authenticated ? "1000.00" : undefined,
      login,
      logout,
      refreshBalance: async () => {},
      fundBounty: async (amountUsdc) => {
        void amountUsdc;
        return { txHash: `0xDEMO${Date.now().toString(16).padEnd(56, "0").slice(0, 56)}` };
      },
    }),
    [authenticated, address, login, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const hasPrivy = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  return hasPrivy ? (
    <PrivyWalletProvider>{children}</PrivyWalletProvider>
  ) : (
    <DemoWalletProvider>{children}</DemoWalletProvider>
  );
}
