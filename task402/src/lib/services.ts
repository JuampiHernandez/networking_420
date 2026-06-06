import { TOOLS } from "./tools";

/** Branded x402 API products shown on public landing pages. */
export type ServicePage = {
  slug: string;
  toolId: keyof typeof TOOLS;
  brand: string;
  tagline: string;
  description: string;
  category: string;
  price: string;
  priceLabel: string;
  endpoint: string;
  method: string;
  accent: string;
  features: string[];
  useCases: string[];
  requestExample: string;
  responseExample: string;
  poweredBy: string;
};

export const SERVICES: ServicePage[] = [
  {
    slug: "contactgraph",
    toolId: "search-contacts",
    brand: "ContactGraph",
    tagline: "People search for agents",
    description:
      "Query a curated professional graph by topic, role, or company. Returns ranked contacts ready for enrichment. Built for autonomous agents that need to discover who to reach — not humans clicking through LinkedIn.",
    category: "Search",
    price: "0.05",
    priceLabel: "$0.05",
    endpoint: "/api/tools/search-contacts",
    method: "POST",
    accent: "#3b82f6",
    features: [
      "Semantic ranking by goal + keywords",
      "Public profile links per result",
      "Batch limits (1–8 contacts per call)",
      "HTTP 402 — pay per query, no API keys",
    ],
    useCases: [
      "Find AI founders in a city",
      "Discover partnership targets by vertical",
      "Build a shortlist before outreach",
    ],
    requestExample: `POST /api/tools/search-contacts
Content-Type: application/json

{
  "query": "AI infrastructure NYC",
  "limit": 5
}`,
    responseExample: `HTTP 402 Payment Required
→ Agent pays 0.05 USDC via x402
→ HTTP 200

{
  "items": [
    {
      "id": "c-maya",
      "name": "Maya Chen",
      "role": "Co-founder",
      "company": "AgentOps Lab",
      "topic": "AI agent tooling",
      "location": "Brooklyn, NY",
      "publicProfile": "https://example.com/maya-chen"
    }
  ]
}`,
    poweredBy: "Curated professional graph (demo dataset)",
  },
  {
    slug: "signalreach",
    toolId: "enrich-contact",
    brand: "SignalReach",
    tagline: "Unlock email, phone & angle",
    description:
      "Turn a public profile into actionable outreach: verified-style email, phone, relevance notes, and a suggested opening angle. One paid call per batch — the resource agents actually need before they can email or call.",
    category: "Enrichment",
    price: "0.10",
    priceLabel: "$0.10",
    endpoint: "/api/tools/enrich-contact",
    method: "POST",
    accent: "#22d3ee",
    features: [
      "Email + phone per contact",
      "Why-relevant summary for the agent",
      "Suggested outreach angle",
      "Batch enrich from search results",
    ],
    useCases: [
      "Prep contacts before cold email",
      "Give voice agents a number to dial",
      "Personalize at scale without manual research",
    ],
    requestExample: `POST /api/tools/enrich-contact
Content-Type: application/json

{
  "contacts": [
    { "id": "c-maya", "name": "Maya Chen", "company": "AgentOps Lab", ... }
  ]
}`,
    responseExample: `HTTP 402 → pay 0.10 USDC → HTTP 200

{
  "contacts": [
    {
      "name": "Maya Chen",
      "email": "maya@agentopslab.com",
      "phone": "+1 (212) 555-0142",
      "whyRelevant": "AgentOps Lab is working on AI agent tooling...",
      "suggestedAngle": "Open with how x402 + USDC on Base..."
    }
  ]
}`,
    poweredBy: "Contact intelligence layer (demo enrichment)",
  },
  {
    slug: "mailrail",
    toolId: "send-email",
    brand: "MailRail",
    tagline: "Outreach email, per send",
    description:
      "Send a single personalized outreach email. No Mailchimp seat, no monthly plan — agents pay per message over HTTP 402. Settles in USDC on Base Sepolia. When Resend is configured, emails are delivered for real.",
    category: "Outreach",
    price: "0.02",
    priceLabel: "$0.02",
    endpoint: "/api/tools/send-email",
    method: "POST",
    accent: "#a78bfa",
    features: [
      "One email per paid call",
      "Plain-text + HTML body",
      "Real delivery via Resend (when keyed)",
      "Demo mode logs send without domain setup",
    ],
    useCases: [
      "Agent sends intro after enrichment",
      "Partnership / recruiting outreach",
      "Follow-up sequences (one call = one email)",
    ],
    requestExample: `POST /api/tools/send-email
Content-Type: application/json

{
  "to": "maya@agentopslab.com",
  "subject": "Maya, quick note about AgentOps Lab",
  "body": "Hi Maya,\\n\\nI came across AgentOps Lab..."
}`,
    responseExample: `HTTP 402 → pay 0.02 USDC → HTTP 200

{
  "ok": true,
  "id": "re_abc123",
  "to": "maya@agentopslab.com",
  "simulated": false
}`,
    poweredBy: "Resend",
  },
  {
    slug: "voicebridge",
    toolId: "place-call",
    brand: "VoiceBridge",
    tagline: "AI voice calls, per minute",
    description:
      "Place an outbound AI voice call with a custom first message and objective. ElevenLabs Conversational AI + Twilio telephony. Agents pay per call attempt — the wow moment in the demo.",
    category: "Outreach",
    price: "0.25",
    priceLabel: "$0.25",
    endpoint: "/api/tools/place-call",
    method: "POST",
    accent: "#34d399",
    features: [
      "ElevenLabs voice agent on the line",
      "Dynamic variables: name, objective",
      "Custom first spoken message",
      "Twilio outbound from your number",
    ],
    useCases: [
      "Warm intro call to a founder",
      "Schedule a follow-up meeting by voice",
      "High-touch outreach when email isn't enough",
    ],
    requestExample: `POST /api/tools/place-call
Content-Type: application/json

{
  "to": "+5493415079340",
  "name": "Maya Chen",
  "objective": "partnership around agentic payments",
  "firstMessage": "Hi Maya, I'm an AI assistant..."
}`,
    responseExample: `HTTP 402 → pay 0.25 USDC → HTTP 200

{
  "ok": true,
  "conversationId": "conv_xyz",
  "to": "+5493415079340",
  "simulated": false,
  "transcriptPreview": "Hi Maya, I'm an AI assistant..."
}`,
    poweredBy: "ElevenLabs Conversational AI + Twilio",
  },
];

export function getService(slug: string): ServicePage | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export function getServiceByToolId(toolId: string): ServicePage | undefined {
  return SERVICES.find((s) => s.toolId === toolId);
}
