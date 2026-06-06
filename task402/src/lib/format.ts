export const EXPLORER = "https://sepolia.basescan.org";

export function shortAddr(a?: string): string {
  if (!a) return "—";
  if (a.length <= 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function txUrl(hash?: string): string | undefined {
  if (!hash) return undefined;
  return `${EXPLORER}/tx/${hash}`;
}

export function addrUrl(addr?: string): string | undefined {
  if (!addr) return undefined;
  return `${EXPLORER}/address/${addr}`;
}

export function usd(amount?: string | number): string {
  const n = Number(amount ?? 0);
  return `${n.toFixed(2)} USDC`;
}

export function timeAgo(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const STATUS_STYLES: Record<string, string> = {
  draft: "text-[var(--muted)]",
  funding_required: "text-[var(--amber)]",
  open: "text-[var(--accent-2)]",
  claimed: "text-[var(--accent-2)]",
  running: "text-[var(--accent)]",
  submitted: "text-[var(--purple)]",
  verification_pending: "text-[var(--purple)]",
  accepted: "text-[var(--green)]",
  paid: "text-[var(--green)]",
  rejected: "text-[var(--red)]",
  expired: "text-[var(--muted)]",
  refunded: "text-[var(--amber)]",
};
