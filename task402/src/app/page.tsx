import Link from "next/link";
import { RelayLogo } from "@/components/RelayLogo";
import { SERVICES } from "@/lib/services";

const EXECUTION_STEPS = [
  {
    time: "11:10:45",
    icon: "🎯",
    iconBg: "bg-[#3b82f6]/20",
    title: "Task funded by you",
    detail: "10.00 USDC locked in escrow",
    settled: true,
  },
  {
    time: "11:10:46",
    icon: "🔍",
    iconBg: "bg-[#3b82f6]/20",
    title: "Search contacts",
    detail: "0.05 USDC · 3 results",
    settled: true,
  },
  {
    time: "11:10:47",
    icon: "✨",
    iconBg: "bg-[#a78bfa]/20",
    title: "Enrich contact",
    detail: "0.10 USDC · email + phone",
    settled: true,
  },
  {
    time: "11:10:48",
    icon: "✉️",
    iconBg: "bg-[#22d3ee]/20",
    title: "Send email",
    detail: "0.02 USDC · personalized draft",
    settled: true,
  },
  {
    time: "11:10:49",
    icon: "📞",
    iconBg: "bg-[#34d399]/20",
    title: "Place AI voice call",
    detail: "0.25 USDC · lead qualified",
    settled: true,
  },
];

const LEDGER_ITEMS = [
  { label: "Search contacts", amount: "-0.05" },
  { label: "Enrich contact", amount: "-0.10" },
  { label: "Send email", amount: "-0.02" },
  { label: "Place call", amount: "-0.25" },
];

function DashboardPreview() {
  const pct = 90;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="dashboard-preview float-slow fade-in">
      <div className="flex overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl shadow-[#3b82f6]/15">
        {/* Sidebar */}
        <div className="hidden w-12 shrink-0 flex-col items-center gap-4 border-r border-[var(--border-soft)] bg-[var(--bg-soft)] py-4 sm:flex">
          {["🏠", "⚡", "✓", "👥", "📄", "⚙"].map((icon, i) => (
            <div
              key={i}
              className={`grid h-8 w-8 place-items-center rounded-lg text-sm ${
                i === 1
                  ? "bg-[var(--accent)]/20 text-[var(--accent-2)]"
                  : "text-[var(--muted-2)]"
              }`}
            >
              {icon}
            </div>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 border-b border-[var(--border-soft)] px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-1 text-[11px] text-[var(--muted)]">Relay · dashboard</span>
          </div>

          <div className="grid lg:grid-cols-[1fr_200px]">
            {/* Active execution */}
            <div className="border-b border-[var(--border-soft)] p-4 lg:border-b-0 lg:border-r">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text)]">
                  Active execution
                </span>
                <span className="badge text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] pulse-dot" />
                  running
                </span>
              </div>
              <p className="mb-4 text-[11px] leading-relaxed text-[var(--muted)]">
                Find 3 AI infrastructure founders in NYC and email them about a
                partnership.
              </p>
              <div className="space-y-3">
                {EXECUTION_STEPS.map((step) => (
                  <div key={step.title} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <div
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs ${step.iconBg}`}
                      >
                        {step.icon}
                      </div>
                      <div className="mt-1 w-px flex-1 bg-[var(--border-soft)]" />
                    </div>
                    <div className="min-w-0 flex-1 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">{step.title}</span>
                        {step.settled && (
                          <span className="shrink-0 text-[10px] text-[var(--green)]">
                            ✓ Settled
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[var(--muted-2)]">
                        <span>{step.time}</span>
                        <span>{step.detail}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* USDC ledger */}
            <div className="p-4">
              <div className="mb-3 text-xs font-semibold">USDC ledger</div>
              <div className="mb-3 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <div className="text-[var(--muted-2)]">Budget</div>
                  <div className="mono font-semibold text-[var(--usdc)]">10.00</div>
                </div>
                <div>
                  <div className="text-[var(--muted-2)]">Spent</div>
                  <div className="mono font-semibold text-[var(--amber)]">0.96</div>
                </div>
              </div>
              <div className="mb-4 flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                    <circle
                      cx="32"
                      cy="32"
                      r={r}
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="5"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r={r}
                      fill="none"
                      stroke="var(--green)"
                      strokeWidth="5"
                      strokeDasharray={circ}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center">
                    <span className="text-xs font-bold text-[var(--green)]">{pct}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--muted-2)]">Remaining</div>
                  <div className="mono text-sm font-semibold text-[var(--green)]">
                    9.04 USDC
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                {LEDGER_ITEMS.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between text-[10px]"
                  >
                    <span className="truncate text-[var(--muted)]">{item.label}</span>
                    <span className="mono shrink-0 text-[var(--muted-2)]">
                      {item.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HowStep({
  icon,
  iconBg,
  title,
  body,
}: {
  icon: string;
  iconBg: string;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center">
      <div
        className={`mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl text-xl ${iconBg}`}
      >
        {icon}
      </div>
      <h3 className="mb-2 text-sm font-semibold leading-snug">{title}</h3>
      <p className="text-xs leading-relaxed text-[var(--muted)]">{body}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <div className="landing-grid pointer-events-none absolute inset-x-0 top-0 h-[720px]" />
      <div className="glow-ring absolute -left-32 top-24 h-64 w-64 bg-[#3b82f6]/20" />
      <div className="glow-ring absolute -right-24 top-48 h-72 w-72 bg-[#22d3ee]/15" />

      <div className="relative mx-auto max-w-7xl px-5">
        {/* Hero */}
        <section id="product" className="grid items-center gap-12 py-14 md:grid-cols-2 md:py-20 lg:py-24">
          <div className="fade-in">
            <span className="badge mb-5">
              Autonomous networking agent · Powered by x402 · Base + USDC
            </span>
            <h1 className="text-balance text-[2.75rem] font-bold leading-[1.05] tracking-tight md:text-6xl lg:text-[4rem]">
              An agent with a wallet that{" "}
              <span className="bg-gradient-to-r from-[#5ea2ff] to-[#22d3ee] bg-clip-text text-transparent">
                networks for you.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[var(--muted)] md:text-lg">
              Give your agent a goal and a USDC budget. It finds the right people,
              reaches out by email or AI voice, and pays per action using x402.
              Every cent is transparent. You stay in control.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/bounties/new" className="btn btn-primary px-6 py-3">
                Try Relay →
              </Link>
              <a href="#how-it-works" className="btn btn-ghost px-6 py-3">
                <span className="mr-1 opacity-70">▶</span> See how it works
              </a>
            </div>
            <div className="live-ticker mt-6 flex flex-wrap items-center gap-3 text-xs">
              <span className="badge border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)] pulse-dot" />
                LIVE ON BASE SEPOLIA
              </span>
              <span className="mono text-[var(--muted-2)]">
                Agent 0x7A13…c5ad paid 0.05 USDC to /x402/search · 11:10:45
              </span>
            </div>
          </div>

          <DashboardPreview />
        </section>

        {/* Trusted by */}
        <section className="trusted-strip py-8">
          <p className="label mb-5 text-center">Trusted by builders</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {["BASE", "x402", "USDC", "privy", "OpenAI"].map((name) => (
              <span
                key={name}
                className="text-sm font-bold tracking-widest text-[var(--muted-2)] opacity-60 transition hover:opacity-100"
              >
                {name}
              </span>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-[var(--border-soft)] py-16 md:py-20">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold md:text-3xl">How it works</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <HowStep
              icon="🎯"
              iconBg="bg-[#3b82f6]/15"
              title="Set a goal and fund it"
              body="Describe the outcome you want and fund your agent with USDC on Base."
            />
            <HowStep
              icon="⚡"
              iconBg="bg-[#a78bfa]/15"
              title="Your agent takes action"
              body="It searches, enriches, emails, and calls using best-in-class x402 APIs."
            />
            <HowStep
              icon="📊"
              iconBg="bg-[#34d399]/15"
              title="Every payment is live"
              body="Watch each x402 micro-payment and result in real time."
            />
            <HowStep
              icon="🛡️"
              iconBg="bg-[#fbbf24]/15"
              title="You approve. We pay. You win."
              body="You approve the payout. Unused budget is refunded automatically."
            />
          </div>
        </section>

        {/* Pricing / APIs */}
        <section id="pricing" className="py-16">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="label">Pay per action</span>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                No subscriptions. Only what your agent uses.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
                Each tool is an x402 endpoint — your agent pays in USDC per call,
                settled on Base.
              </p>
            </div>
            <Link href="/services" className="btn btn-ghost shrink-0 self-start">
              View all APIs →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((api) => (
              <Link
                key={api.slug}
                href={`/services/${api.slug}`}
                className="panel-soft group p-5 transition hover:border-[var(--accent)]"
              >
                <span className="badge mb-3 text-[10px]">{api.category}</span>
                <div className="font-semibold">{api.brand}</div>
                <div className="mt-0.5 text-xs text-[var(--muted)]">{api.tagline}</div>
                <div className="mt-3 text-sm font-bold" style={{ color: api.accent }}>
                  {api.priceLabel}
                  <span className="font-normal text-[var(--muted-2)]"> / call</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Safety */}
        <section className="py-8">
          <div className="panel overflow-hidden p-0">
            <div className="grid lg:grid-cols-2">
              <div className="border-b border-[var(--border-soft)] p-8 lg:border-b-0 lg:border-r">
                <span className="label">Safety first</span>
                <h2 className="mt-2 text-2xl font-bold">
                  Bounded spending you can inspect
                </h2>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Relay enforces hard budgets, tool allowlists, and a full payment
                  trail — so you always know exactly what your agent did.
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  {[
                    "Hard budget cap you set when funding",
                    "Per-tool allowlist — no surprise spend",
                    "You approve final settlement",
                    "Failed voice calls auto-refund",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-[var(--green)]">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[var(--bg-soft)] p-8">
                <div className="label mb-4">The insight</div>
                <p className="text-xl font-bold leading-snug">
                  An agent that can&apos;t pay can&apos;t work.
                </p>
                <p className="mt-2 text-xl font-bold text-[var(--accent-2)]">
                  So we gave it a wallet and a budget.
                </p>
                <p className="mt-4 text-sm text-[var(--muted)]">
                  Relay buys search, enrichment, email, and voice-call tools per
                  call in USDC on Base — and delivers booked meetings.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 pb-20">
          <div className="panel relative overflow-hidden px-6 py-12 text-center md:px-12 md:py-14">
            <div className="glow-ring absolute left-1/2 top-0 h-40 w-96 -translate-x-1/2 bg-[#3b82f6]/25" />
            <div className="relative">
              <h2 className="text-balance text-3xl font-bold">
                Ready to let your agent do the networking?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-[var(--muted)]">
                Fund 10 USDC, describe who you want to meet, and watch every
                payment in real time.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/bounties/new" className="btn btn-primary px-8 py-3">
                  Get started →
                </Link>
                <Link href="/bounties" className="btn btn-ghost px-8 py-3">
                  See live tasks
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[var(--border-soft)] py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <RelayLogo size="sm" />
            <p className="text-center text-xs text-[var(--muted)]">
              The networking agent that can actually spend money — safely.
            </p>
            <div className="flex gap-4 text-xs text-[var(--muted)]">
              <Link href="/services" className="hover:text-[var(--text)]">
                APIs
              </Link>
              <Link href="/bounties" className="hover:text-[var(--text)]">
                Tasks
              </Link>
              <Link href="/bounties/new" className="hover:text-[var(--text)]">
                Get started
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
