"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { baseSepolia } from "viem/chains";
import { WalletProvider } from "@/lib/wallet";

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    // Demo mode: no Privy app configured. The WalletProvider falls back to a
    // local demo wallet so the rest of the app remains fully usable.
    return <WalletProvider>{children}</WalletProvider>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={
        {
          appearance: {
            theme: "dark",
            accentColor: "#3b82f6",
            walletChainType: "ethereum-only",
          },
          // Always provision an embedded wallet so funding uses in-app funds,
          // even when an external extension (Rabby/MetaMask) is also present.
          embeddedWallets: { createOnLogin: "all-users" },
          // Email creates the embedded wallet without extra dashboard config.
          // ("google" requires enabling Google OAuth in the Privy dashboard —
          // it was returning 403 "Login with Google not allowed".)
          loginMethods: ["email"],
          defaultChain: baseSepolia,
          supportedChains: [baseSepolia],
        } as never
      }
    >
      <WalletProvider>{children}</WalletProvider>
    </PrivyProvider>
  );
}
