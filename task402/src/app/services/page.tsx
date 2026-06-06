import Link from "next/link";
import { SERVICES } from "@/lib/services";

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-12">
      <div className="mb-10 max-w-2xl">
        <span className="badge mb-4">
          <span className="h-2 w-2 rounded-full bg-[var(--usdc)]" />
          x402 API marketplace
        </span>
        <h1 className="text-4xl font-bold tracking-tight">
          Services your agent can hire
        </h1>
        <p className="mt-4 text-lg text-[var(--muted)]">
          Real HTTP endpoints. Each returns{" "}
          <span className="text-[var(--amber)]">402 Payment Required</span> until
          an agent wallet pays in USDC on Base Sepolia. No subscriptions — per call
          settlement via x402.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {SERVICES.map((s) => (
          <Link
            key={s.slug}
            href={`/services/${s.slug}`}
            className="panel group flex flex-col gap-4 p-6 transition hover:border-[var(--accent)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="badge mb-2">{s.category}</span>
                <h2 className="text-xl font-bold">{s.brand}</h2>
                <p className="text-sm text-[var(--muted)]">{s.tagline}</p>
              </div>
              <span
                className="shrink-0 rounded-lg px-3 py-1 text-sm font-bold"
                style={{
                  background: `${s.accent}22`,
                  color: s.accent,
                }}
              >
                {s.priceLabel}
                <span className="block text-[10px] font-normal opacity-80">
                  per call
                </span>
              </span>
            </div>
            <p className="line-clamp-2 text-sm text-[var(--muted)]">
              {s.description}
            </p>
            <div className="mt-auto flex items-center justify-between border-t border-[var(--border-soft)] pt-4 text-xs">
              <code className="mono text-[var(--muted-2)]">{s.endpoint}</code>
              <span className="text-[var(--accent-2)] group-hover:underline">
                View API →
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="panel mt-10 p-6 text-sm text-[var(--muted)]">
        <strong className="text-[var(--text)]">How agents pay</strong>
        <p className="mt-2">
          Your networking agent calls these endpoints during a task. Each tool
          responds with HTTP 402 and an x402 payment challenge. The agent signs
          a USDC authorization, the facilitator settles on Base Sepolia, and the
          resource unlocks. Every payment appears in the task ledger.
        </p>
        <Link href="/bounties/new" className="btn btn-primary mt-4">
          Brief your agent →
        </Link>
      </div>
    </div>
  );
}
