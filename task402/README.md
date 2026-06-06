# Task402 — Tasks that pay themselves

**Agent-native bounties on Base.** Fund a task in USDC, let an AI agent complete it by buying x402-paid tools, and pay verified work instantly on Base — with a fully transparent payment trail.

Built for the Coinbase/Base hackathon using **Privy**, **x402**, and **USDC on Base Sepolia**.

> Pump.fun GO proved demand for open bounty markets. Task402 makes the same primitive programmable for agents: paid tasks over HTTP, settled in USDC, with x402-powered tools and Privy onboarding.

---

## What it does

1. A creator signs in with **Privy** (embedded wallet, gas sponsorship) and funds a bounty in **USDC**.
2. An **agent** accepts the bounty and executes it, paying **x402** APIs per call (search → enrich → verify).
3. Each tool returns **HTTP 402 Payment Required**; the agent signs + settles the payment, then unlocks the result.
4. A verifier scores the deliverable. On approval, USDC settles to the agent on **Base**; unused budget refunds.
5. The whole thing is visible as a live **execution timeline + USDC ledger**.

## Two runtime modes (always demoable)

Each subsystem auto-detects keys and degrades gracefully, so the demo **always works**:

| Subsystem | `real` (keys present) | `sim` (no keys) |
|---|---|---|
| x402 settlement | Signed EIP-3009 payments verified + settled on Base Sepolia via facilitator | Real HTTP `402 → X-PAYMENT → 200` handshake, settled locally with mock tx hashes |
| Wallet / auth | Privy embedded wallet + gas sponsorship | Local demo wallet |
| Agent reasoning | OpenAI / Anthropic | Deterministic templated output |

The current mode is shown in the header (`x402: on-chain/sim`, `LLM: live/mock`).

## Quick start

```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # optional: fill in keys to go fully on-chain
npm run dev
```

Open http://localhost:3000 → **Create bounty** → **Fund** → **Run agent ▶** → **Approve & pay**.
Use **Reset demo** on the bounties page to clear state.

## Going fully on-chain

Fill `.env.local` (see `.env.example`):

- `NEXT_PUBLIC_PRIVY_APP_ID` — from the Privy dashboard
- `NEXT_PUBLIC_ESCROW_ADDRESS` — the escrow address creators fund (= `TREASURY_PRIVATE_KEY`'s address)
- `AGENT_PRIVATE_KEY` — funded Base Sepolia wallet that pays x402 tools (needs testnet USDC)
- `TOOL_SELLER_ADDRESS` — address that receives x402 tool payments
- `TREASURY_PRIVATE_KEY` — wallet that pays agents / refunds creators
- `X402_FACILITATOR_URL` — defaults to `https://x402.org/facilitator` (Base Sepolia)
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` (+ `LLM_PROVIDER`, `LLM_MODEL`)

USDC on Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

## Architecture

```
src/
  app/
    page.tsx                      Landing / pitch
    bounties/                     List, create, and the bounty detail dashboard
    api/
      bounties/...                CRUD + fund/run/approve/reject + SSE events
      tools/                      x402 paid tool endpoints (sellers)
  lib/
    x402-seller.ts                withX402 (real) or simulated 402 handshake
    x402-buyer.ts                 wrapFetchWithPayment + createSigner (real) or sim buyer
    agent.ts                      Orchestrator: plan → pay tools → draft → verify → submit
    payments.ts                   Escrow payout / refund + ledger
    chain.ts                      viem clients + USDC transfers
    wallet.tsx                    Privy/demo wallet abstraction (client)
    store.ts / events.ts          JSON-file store + SSE event bus
```

The strongest screen is the **agent execution timeline + USDC ledger** on the bounty detail page.

## Tech

Next.js 16 · React 19 · TypeScript · Tailwind v4 · Privy · x402 (`x402`, `x402-next`, `x402-fetch`) · viem · Vercel AI SDK · Base Sepolia.

## Safety

Task402 is positioned as *bounded* agent execution: every bounty has a budget, a max tool spend, an allowed-tools allowlist, a min verifier score, and an optional manual-approval gate before payout. Spend policy is enforced before every x402 payment.
