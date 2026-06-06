import Link from "next/link";

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="panel p-5">
      <div className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-[var(--panel-2)] text-sm font-bold text-[var(--accent-2)]">
        {n}
      </div>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="text-sm text-[var(--muted)]">{body}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-5">
      {/* Hero */}
      <section className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div className="fade-in">
          <span className="badge mb-5">
            <span className="h-2 w-2 rounded-full bg-[var(--accent-2)] pulse-dot" />
            Autonomous networking agent · Privy · x402 · USDC on Base
          </span>
          <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            An agent with a wallet that
            <br />
            <span className="bg-gradient-to-r from-[#5ea2ff] to-[#22d3ee] bg-clip-text text-transparent">
              networks for you.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-[var(--muted)]">
            Give it a goal and a USDC budget. It finds the right people, pays per
            lookup over x402, and reaches out by email — or calls them with an AI
            voice. Every cent settled on Base.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/bounties/new" className="btn btn-primary">
              Brief your agent
            </Link>
            <Link href="/bounties" className="btn btn-ghost">
              See it run →
            </Link>
          </div>
          <p className="mt-4 text-xs text-[var(--muted-2)]">
            Fund 10 USDC and watch the agent spend per contact found, enriched,
            emailed, and called.
          </p>
        </div>

        {/* Payment trail preview */}
        <div className="panel fade-in overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            <span className="ml-2 text-xs text-[var(--muted)]">
              agent · payment trail
            </span>
          </div>
          <pre className="mono overflow-x-auto p-5 text-[13px] leading-relaxed">
            <span className="text-[var(--green)]">Task funded</span>          10.00 USDC
            {"\n"}
            <span className="text-[var(--accent-2)]">x402 →</span> Search contacts  0.05 USDC{" "}
            <span className="text-[var(--muted-2)]">settled</span>
            {"\n"}
            <span className="text-[var(--accent-2)]">x402 →</span> Enrich contact   0.10 USDC{" "}
            <span className="text-[var(--muted-2)]">settled</span>
            {"\n"}
            <span className="text-[var(--accent-2)]">x402 →</span> Send email       0.02 USDC{" "}
            <span className="text-[var(--muted-2)]">settled</span>
            {"\n"}
            <span className="text-[var(--accent-2)]">x402 →</span> Place call       0.25 USDC{" "}
            <span className="text-[var(--muted-2)]">settled</span>
            {"\n"}
            <span className="text-[var(--purple)]">Reached</span>      3 contacts · email + call
            {"\n"}
            <span className="text-[var(--green)]">Agent payout</span>     9.58 USDC
          </pre>
        </div>
      </section>

      {/* How it works */}
      <section className="py-8">
        <h2 className="mb-6 text-2xl font-bold">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Step
            n={1}
            title="Brief your agent"
            body="Sign in with Privy, get an embedded wallet, and fund a networking goal in USDC with a budget + spend caps."
          />
          <Step
            n={2}
            title="It finds + reaches people"
            body="The agent pays x402 APIs per call — search contacts, enrich (email/phone), then emails or places an AI voice call."
          />
          <Step
            n={3}
            title="You stay in control"
            body="Watch every payment in a live ledger, chat or talk to the agent, and approve payout. Unused budget refunds."
          />
        </div>
      </section>

      {/* Comparison */}
      <section className="py-12">
        <div className="panel p-6 md:p-8">
          <h2 className="text-xl font-bold">
            A personal agent that pays its own way.
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <div className="label mb-2">Doing it yourself</div>
              <ul className="space-y-2 text-sm text-[var(--muted)]">
                <li>· Manually hunt for the right people</li>
                <li>· Juggle separate data, email, and calling tools</li>
                <li>· Pay for monthly seats you barely use</li>
                <li>· No record of what each action actually cost</li>
              </ul>
            </div>
            <div>
              <div className="label mb-2 text-[var(--accent-2)]">
                Your networking agent
              </div>
              <ul className="space-y-2 text-sm">
                <li>· One goal + budget → it finds and reaches people</li>
                <li>· Pays per action over x402 (no subscriptions)</li>
                <li>· Emails and places real AI voice calls</li>
                <li>· Transparent USDC ledger + your approval before payout</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* x402 APIs */}
      <section className="py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">x402 services the agent hires</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Each API has its own landing page — real HTTP 402 endpoints, USDC per call.
            </p>
          </div>
          <Link href="/services" className="btn btn-ghost shrink-0">
            View all APIs →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: "ContactGraph", price: "$0.05", href: "/services/contactgraph" },
            { name: "SignalReach", price: "$0.10", href: "/services/signalreach" },
            { name: "MailRail", price: "$0.02", href: "/services/mailrail" },
            { name: "VoiceBridge", price: "$0.25", href: "/services/voicebridge" },
          ].map((api) => (
            <Link
              key={api.href}
              href={api.href}
              className="panel-soft p-4 transition hover:border-[var(--accent)]"
            >
              <div className="font-semibold">{api.name}</div>
              <div className="mt-1 text-sm text-[var(--usdc)]">{api.price} / call</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Powered by */}
      <section className="grid gap-4 pb-20 md:grid-cols-3">
        {[
          {
            t: "Privy",
            d: "Email/social login, embedded wallets, and gas sponsorship — no crypto friction.",
          },
          {
            t: "x402",
            d: "The procurement protocol for agents: pay any API per call over HTTP 402.",
          },
          {
            t: "Base + USDC",
            d: "USDC is the native settlement asset for internet work done by agents.",
          },
        ].map((x) => (
          <div key={x.t} className="panel-soft p-5">
            <div className="font-semibold">{x.t}</div>
            <p className="mt-1 text-sm text-[var(--muted)]">{x.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
