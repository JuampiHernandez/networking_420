"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { RelayLogo } from "@/components/RelayLogo";
import { useWallet } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";

type Cfg = {
  chainMode: "real" | "sim";
  llmMode: "real" | "mock";
  llmLabel: string;
  network: string;
  privyConfigured: boolean;
};

export function Header() {
  const w = useWallet();
  const [cfg, setCfg] = useState<Cfg>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setCfg)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const copyAddress = async () => {
    if (!w.address) return;
    try {
      await navigator.clipboard.writeText(w.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const nav = [
    { label: "Product", href: "/#product" },
    { label: "How it works", href: "/#how-it-works" },
    { label: "APIs", href: "/services" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Docs", href: "/services#how-agents-pay" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(6,8,13,0.85)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-center gap-8">
          <RelayLogo />
          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted)] transition hover:text-[var(--text)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge hidden sm:inline-flex">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
            Built on Base
          </span>
          {cfg && (
            <span
              className="badge hidden xl:inline-flex"
              title="On-chain settlement mode"
            >
              x402:{" "}
              <span
                className={
                  cfg.chainMode === "real"
                    ? "text-[var(--green)]"
                    : "text-[var(--amber)]"
                }
              >
                {cfg.chainMode === "real" ? "on-chain" : "sim"}
              </span>
            </span>
          )}

          {w.authenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                className="panel-soft flex items-center gap-2 px-3 py-1.5"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <span className="h-2 w-2 rounded-full bg-[var(--green)]" />
                <span className="hidden text-xs text-[var(--muted)] sm:inline">
                  {w.usdcBalance ?? "—"} USDC
                </span>
                <span className="mono text-xs">{shortAddr(w.address)}</span>
                <span className="text-[var(--muted-2)]">▾</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="label">Account</span>
                    <span className="badge text-[10px]">
                      {w.mode === "privy" ? "Privy" : "Demo wallet"}
                    </span>
                  </div>

                  {w.email && (
                    <div className="mb-2 truncate text-sm text-[var(--text)]">
                      {w.email}
                    </div>
                  )}

                  <div className="label mb-1">Wallet address</div>
                  <div className="mb-3 flex items-center gap-2">
                    <code className="mono flex-1 truncate rounded-md bg-[var(--bg-soft)] px-2 py-1 text-xs">
                      {w.address ?? "—"}
                    </code>
                    <button
                      className="btn btn-ghost px-2 py-1 text-xs"
                      onClick={copyAddress}
                      title="Copy full address"
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>

                  <div className="mb-3 flex items-center justify-between rounded-md bg-[var(--bg-soft)] px-3 py-2">
                    <span className="text-xs text-[var(--muted)]">USDC balance</span>
                    <div className="flex items-center gap-2">
                      <span className="mono text-sm font-semibold text-[var(--green)]">
                        {w.usdcBalance ?? "—"}
                      </span>
                      <button
                        className="text-xs text-[var(--accent-2)] hover:underline"
                        onClick={() => void w.refreshBalance()}
                      >
                        refresh
                      </button>
                    </div>
                  </div>

                  {w.address && (
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <a
                        className="btn btn-ghost justify-center px-2 py-1 text-xs"
                        href="https://faucet.circle.com"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Get test USDC
                      </a>
                      <a
                        className="btn btn-ghost justify-center px-2 py-1 text-xs"
                        href={`https://sepolia.basescan.org/address/${w.address}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on explorer
                      </a>
                    </div>
                  )}

                  <button
                    className="btn btn-ghost w-full justify-center"
                    onClick={() => {
                      setMenuOpen(false);
                      w.logout();
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                className="btn btn-ghost hidden px-3 py-2 text-sm sm:inline-flex"
                onClick={w.login}
                disabled={!w.ready}
              >
                Sign in
              </button>
              <Link href="/bounties/new" className="btn btn-primary px-4 py-2 text-sm">
                Get started →
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
