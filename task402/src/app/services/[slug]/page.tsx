import Link from "next/link";
import { notFound } from "next/navigation";
import { getService, SERVICES } from "@/lib/services";
import { publicConfig } from "@/lib/config";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export default async function ServiceLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = getService(slug);
  if (!s) notFound();

  const baseUrl = publicConfig.appUrl;

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <Link
        href="/services"
        className="mb-6 inline-block text-sm text-[var(--muted)] hover:text-[var(--text)]"
      >
        ← All services
      </Link>

      <div className="fade-in">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="badge mb-3">{s.category}</span>
            <h1 className="text-4xl font-bold">{s.brand}</h1>
            <p className="mt-2 text-lg text-[var(--muted)]">{s.tagline}</p>
          </div>
          <div
            className="panel-soft px-5 py-4 text-center"
            style={{ borderColor: `${s.accent}44` }}
          >
            <div className="text-2xl font-bold" style={{ color: s.accent }}>
              {s.priceLabel}
            </div>
            <div className="text-xs text-[var(--muted)]">USDC per call</div>
            <div className="mt-2 badge text-[10px] text-[var(--usdc)]">
              x402 · Base Sepolia
            </div>
          </div>
        </div>

        <p className="mb-8 text-[var(--muted)] leading-relaxed">{s.description}</p>

        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="panel p-5">
            <h3 className="mb-3 font-semibold">Features</h3>
            <ul className="space-y-2 text-sm text-[var(--muted)]">
              {s.features.map((f) => (
                <li key={f}>· {f}</li>
              ))}
            </ul>
          </div>
          <div className="panel p-5">
            <h3 className="mb-3 font-semibold">Use cases</h3>
            <ul className="space-y-2 text-sm text-[var(--muted)]">
              {s.useCases.map((u) => (
                <li key={u}>· {u}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="panel mb-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-3">
            <h3 className="font-semibold">API reference</h3>
            <code className="mono text-xs text-[var(--accent-2)]">
              {s.method} {baseUrl}
              {s.endpoint}
            </code>
          </div>
          <div className="grid md:grid-cols-2">
            <div className="border-b border-[var(--border-soft)] p-5 md:border-b-0 md:border-r">
              <div className="label mb-2">Request</div>
              <pre className="mono overflow-x-auto text-xs leading-relaxed text-[var(--muted)]">
                {s.requestExample}
              </pre>
            </div>
            <div className="p-5">
              <div className="label mb-2">Response (after x402 payment)</div>
              <pre className="mono overflow-x-auto text-xs leading-relaxed text-[var(--muted)]">
                {s.responseExample}
              </pre>
            </div>
          </div>
        </div>

        <div className="panel-soft mb-8 flex flex-wrap items-center justify-between gap-4 p-5 text-sm">
          <div>
            <span className="text-[var(--muted-2)]">Powered by </span>
            <span className="font-medium">{s.poweredBy}</span>
          </div>
          <div className="text-[var(--muted)]">
            Settlement: USDC on Base · HTTP 402 wire protocol
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/bounties/new" className="btn btn-primary">
            Use with your agent →
          </Link>
          <a
            href={s.endpoint}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
          >
            View live endpoint ↗
          </a>
          <Link href="/services" className="btn btn-ghost">
            Browse all APIs
          </Link>
        </div>
      </div>
    </div>
  );
}
