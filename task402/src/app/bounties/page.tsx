"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { STATUS_STYLES, usd, timeAgo } from "@/lib/format";

type Bounty = {
  id: string;
  title: string;
  description: string;
  category: string;
  budgetUsdc: string;
  maxToolSpendUsdc: string;
  status: string;
  createdAt: string;
};

export default function BountiesPage() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/bounties").then((x) => x.json());
    setBounties(r.bounties ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = async () => {
    await fetch("/api/demo/reset", { method: "POST" });
    await load();
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your tasks</h1>
          <p className="text-sm text-[var(--muted)]">
            Give your networking agent a goal + budget. It finds people, pays per
            lookup with x402, and reaches out by email or AI voice call.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={reset} title="Clear all demo data">
            Reset demo
          </button>
          <Link href="/bounties/new" className="btn btn-primary">
            New task
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="panel p-10 text-center text-[var(--muted)]">Loading…</div>
      ) : bounties.length === 0 ? (
        <div className="panel p-12 text-center">
          <p className="text-[var(--muted)]">No tasks yet.</p>
          <Link href="/bounties/new" className="btn btn-primary mt-4">
            Brief your first task
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bounties.map((b) => (
            <Link
              key={b.id}
              href={`/bounties/${b.id}`}
              className="panel fade-in flex flex-col gap-3 p-5 transition hover:border-[var(--accent)]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="badge">{b.category}</span>
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    STATUS_STYLES[b.status] ?? "text-[var(--muted)]"
                  }`}
                >
                  {b.status.replace(/_/g, " ")}
                </span>
              </div>
              <h3 className="line-clamp-2 font-semibold">{b.title}</h3>
              <p className="line-clamp-2 text-sm text-[var(--muted)]">
                {b.description || "No description"}
              </p>
              <div className="mt-auto flex items-center justify-between border-t border-[var(--border-soft)] pt-3 text-sm">
                <span className="font-semibold text-[var(--green)]">
                  {usd(b.budgetUsdc)}
                </span>
                <span className="text-xs text-[var(--muted-2)]">
                  {timeAgo(b.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
