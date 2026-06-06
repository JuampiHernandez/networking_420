/**
 * Registry of x402-paid tools the networking agent can "hire".
 *
 * Each tool is a real HTTP endpoint that returns 402 Payment Required until
 * the agent pays in USDC via x402. The contact search/enrichment tools are
 * "faked" data sources (a curated pool behind a real 402 handshake), while
 * send-email (Resend) and place-call (ElevenLabs) perform real actions when
 * keys are present.
 */

export type ToolDef = {
  name: string;
  endpoint: string;
  method: "GET" | "POST";
  price: string; // human USDC string, e.g. "0.05"
  priceLabel: string; // "$0.05"
  description: string;
  category: string;
};

export const TOOLS: Record<string, ToolDef> = {
  "search-contacts": {
    name: "search-contacts",
    endpoint: "/api/tools/search-contacts",
    method: "POST",
    price: "0.05",
    priceLabel: "$0.05",
    description: "Search a directory of people matching a networking goal.",
    category: "search",
  },
  "enrich-contact": {
    name: "enrich-contact",
    endpoint: "/api/tools/enrich-contact",
    method: "POST",
    price: "0.10",
    priceLabel: "$0.10",
    description: "Unlock contact details (email, phone) + a personalized angle.",
    category: "enrichment",
  },
  "send-email": {
    name: "send-email",
    endpoint: "/api/tools/send-email",
    method: "POST",
    price: "0.02",
    priceLabel: "$0.02",
    description: "Send a personalized outreach email to a contact.",
    category: "outreach",
  },
  "place-call": {
    name: "place-call",
    endpoint: "/api/tools/place-call",
    method: "POST",
    price: "0.25",
    priceLabel: "$0.25",
    description: "Place a live AI voice call to a contact via ElevenLabs.",
    category: "outreach",
  },
};

export const TOOL_LIST = Object.values(TOOLS);

// ---- Curated contact pool (the "resource" unlocked after payment) ----

export type RoleType = "founder" | "vc" | "builder" | "operator";

export type Contact = {
  id: string;
  name: string;
  role: string;
  company: string;
  topic: string;
  industry: string;
  roleType: RoleType;
  gender: "woman" | "man";
  location: string;
  tags: string[];
  publicProfile: string;
};

export type EnrichedContact = Contact & {
  email: string;
  phone: string;
  whyRelevant: string;
  suggestedAngle: string;
};

const CONTACT_POOL: Contact[] = [
  // ---- AI ----
  { id: "c-alex", name: "Alex Rivera", role: "Founder & CEO", company: "VoiceStack", topic: "AI voice infrastructure", industry: "ai", roleType: "founder", gender: "man", location: "New York, NY", tags: ["ai", "voice", "infra"], publicProfile: "https://example.com/alex-rivera" },
  { id: "c-maya", name: "Maya Chen", role: "Co-founder", company: "AgentOps Lab", topic: "AI agent tooling", industry: "ai", roleType: "founder", gender: "woman", location: "Brooklyn, NY", tags: ["ai", "agents", "devtools"], publicProfile: "https://example.com/maya-chen" },
  { id: "c-priya", name: "Priya Nair", role: "CTO", company: "Synthwave AI", topic: "synthetic data for ML", industry: "ai", roleType: "builder", gender: "woman", location: "San Francisco, CA", tags: ["ai", "data", "ml"], publicProfile: "https://example.com/priya-nair" },
  { id: "c-liam", name: "Liam Walsh", role: "Founder", company: "PromptForge", topic: "dev tools for LLMs", industry: "ai", roleType: "founder", gender: "man", location: "Austin, TX", tags: ["ai", "llm", "devtools"], publicProfile: "https://example.com/liam-walsh" },
  { id: "c-grace", name: "Grace Kim", role: "Partner", company: "Inflection Ventures", topic: "AI seed investing", industry: "ai", roleType: "vc", gender: "woman", location: "San Francisco, CA", tags: ["ai", "vc", "seed"], publicProfile: "https://example.com/grace-kim" },
  { id: "c-omar", name: "Omar Haddad", role: "ML Engineer", company: "Tensor Foundry", topic: "model fine-tuning infra", industry: "ai", roleType: "builder", gender: "man", location: "Remote", tags: ["ai", "ml", "infra"], publicProfile: "https://example.com/omar-haddad" },

  // ---- Crypto / Web3 ----
  { id: "c-daniel", name: "Daniel Osei", role: "Founder", company: "Ledgerly", topic: "onchain payments", industry: "crypto", roleType: "founder", gender: "man", location: "New York, NY", tags: ["crypto", "payments", "onchain"], publicProfile: "https://example.com/daniel-osei" },
  { id: "c-nadia", name: "Nadia Petrova", role: "Co-founder & CEO", company: "AutoLedger", topic: "agentic finance on Base", industry: "crypto", roleType: "founder", gender: "woman", location: "New York, NY", tags: ["crypto", "fintech", "agents"], publicProfile: "https://example.com/nadia-petrova" },
  { id: "c-marco", name: "Marco Bianchi", role: "General Partner", company: "Chainforth Capital", topic: "web3 infrastructure investing", industry: "crypto", roleType: "vc", gender: "man", location: "Miami, FL", tags: ["crypto", "vc", "web3"], publicProfile: "https://example.com/marco-bianchi" },
  { id: "c-yuki", name: "Yuki Tanaka", role: "Protocol Engineer", company: "Mesh Protocol", topic: "L2 rollup tooling", industry: "crypto", roleType: "builder", gender: "woman", location: "Remote", tags: ["crypto", "web3", "infra"], publicProfile: "https://example.com/yuki-tanaka" },
  { id: "c-tariq", name: "Tariq Aziz", role: "Founder", company: "StablePay", topic: "stablecoin rails", industry: "crypto", roleType: "founder", gender: "man", location: "London, UK", tags: ["crypto", "stablecoins", "payments"], publicProfile: "https://example.com/tariq-aziz" },

  // ---- Health tech ----
  { id: "c-elena", name: "Elena Sokolova", role: "Founder & CEO", company: "Cardia Health", topic: "AI cardiology diagnostics", industry: "health", roleType: "founder", gender: "woman", location: "Boston, MA", tags: ["health", "healthtech", "ai", "medical"], publicProfile: "https://example.com/elena-sokolova" },
  { id: "c-david", name: "David Mensah", role: "Co-founder", company: "Remedy Labs", topic: "telehealth platforms", industry: "health", roleType: "founder", gender: "man", location: "Atlanta, GA", tags: ["health", "healthtech", "telehealth"], publicProfile: "https://example.com/david-mensah" },
  { id: "c-hannah", name: "Hannah Goldberg", role: "Principal", company: "Vital Ventures", topic: "digital health investing", industry: "health", roleType: "vc", gender: "woman", location: "San Francisco, CA", tags: ["health", "vc", "healthtech"], publicProfile: "https://example.com/hannah-goldberg" },
  { id: "c-raj", name: "Raj Patel", role: "Head of Engineering", company: "BioStream", topic: "genomics data pipelines", industry: "health", roleType: "builder", gender: "man", location: "Boston, MA", tags: ["health", "bio", "data"], publicProfile: "https://example.com/raj-patel" },

  // ---- Fintech ----
  { id: "c-claire", name: "Claire Dubois", role: "Founder & CEO", company: "Nimbus Pay", topic: "SMB payments", industry: "fintech", roleType: "founder", gender: "woman", location: "New York, NY", tags: ["fintech", "payments"], publicProfile: "https://example.com/claire-dubois" },
  { id: "c-kofi", name: "Kofi Boateng", role: "Founder", company: "Lend Loop", topic: "embedded lending", industry: "fintech", roleType: "founder", gender: "man", location: "Toronto, CA", tags: ["fintech", "lending"], publicProfile: "https://example.com/kofi-boateng" },
  { id: "c-sara", name: "Sara Lindqvist", role: "Partner", company: "Northgate Capital", topic: "fintech growth investing", industry: "fintech", roleType: "vc", gender: "woman", location: "London, UK", tags: ["fintech", "vc", "growth"], publicProfile: "https://example.com/sara-lindqvist" },
  { id: "c-victor", name: "Victor Reyes", role: "Staff Engineer", company: "Settle", topic: "real-time payments infra", industry: "fintech", roleType: "builder", gender: "man", location: "Remote", tags: ["fintech", "payments", "infra"], publicProfile: "https://example.com/victor-reyes" },

  // ---- Climate ----
  { id: "c-ingrid", name: "Ingrid Larsson", role: "Founder & CEO", company: "GridFlux", topic: "grid-scale battery software", industry: "climate", roleType: "founder", gender: "woman", location: "Berlin, DE", tags: ["climate", "energy", "cleantech"], publicProfile: "https://example.com/ingrid-larsson" },
  { id: "c-mateo", name: "Mateo Fernández", role: "Co-founder", company: "Carbonless", topic: "carbon accounting", industry: "climate", roleType: "founder", gender: "man", location: "Austin, TX", tags: ["climate", "carbon", "cleantech"], publicProfile: "https://example.com/mateo-fernandez" },
  { id: "c-lena", name: "Lena Brandt", role: "Investor", company: "Terra Fund", topic: "climate hardware investing", industry: "climate", roleType: "vc", gender: "woman", location: "Berlin, DE", tags: ["climate", "vc", "hardware"], publicProfile: "https://example.com/lena-brandt" },

  // ---- Dev tools / infra ----
  { id: "c-jordan", name: "Jordan Blake", role: "Founder", company: "Retriever", topic: "RAG / search infrastructure", industry: "devtools", roleType: "founder", gender: "man", location: "Seattle, WA", tags: ["devtools", "ai", "search", "infra"], publicProfile: "https://example.com/jordan-blake" },
  { id: "c-aisha", name: "Aisha Rahman", role: "Founder & CTO", company: "DeployKit", topic: "developer CI/CD platform", industry: "devtools", roleType: "builder", gender: "woman", location: "San Francisco, CA", tags: ["devtools", "infra", "platform"], publicProfile: "https://example.com/aisha-rahman" },
  { id: "c-noah", name: "Noah Schwartz", role: "Founder", company: "Edgebase", topic: "edge database infra", industry: "devtools", roleType: "founder", gender: "man", location: "Remote", tags: ["devtools", "database", "infra"], publicProfile: "https://example.com/noah-schwartz" },

  // ---- Security ----
  { id: "c-fatima", name: "Fatima Khan", role: "Founder & CEO", company: "Sentinel AI", topic: "AI threat detection", industry: "security", roleType: "founder", gender: "woman", location: "Washington, DC", tags: ["security", "ai", "cyber"], publicProfile: "https://example.com/fatima-khan" },
  { id: "c-ben", name: "Ben Carter", role: "Security Engineer", company: "LockLayer", topic: "zero-trust networking", industry: "security", roleType: "builder", gender: "man", location: "Remote", tags: ["security", "cyber", "infra"], publicProfile: "https://example.com/ben-carter" },

  // ---- Robotics / hardware ----
  { id: "c-sofia", name: "Sofia Marin", role: "CEO", company: "Cortex Robotics", topic: "embodied AI / robotics", industry: "robotics", roleType: "founder", gender: "woman", location: "Pittsburgh, PA", tags: ["robotics", "ai", "hardware"], publicProfile: "https://example.com/sofia-marin" },
  { id: "c-hiro", name: "Hiroshi Sato", role: "Hardware Lead", company: "Motryx", topic: "actuator systems", industry: "robotics", roleType: "builder", gender: "man", location: "Los Angeles, CA", tags: ["robotics", "hardware"], publicProfile: "https://example.com/hiroshi-sato" },

  // ---- Consumer / social ----
  { id: "c-zoe", name: "Zoe Bennett", role: "Founder & CEO", company: "Circle Social", topic: "community apps", industry: "consumer", roleType: "founder", gender: "woman", location: "Los Angeles, CA", tags: ["consumer", "social", "mobile"], publicProfile: "https://example.com/zoe-bennett" },
  { id: "c-andre", name: "André Costa", role: "Founder", company: "Marketly", topic: "consumer marketplaces", industry: "consumer", roleType: "founder", gender: "man", location: "Miami, FL", tags: ["consumer", "marketplace"], publicProfile: "https://example.com/andre-costa" },
  { id: "c-julia", name: "Julia Moreno", role: "Partner", company: "Bright Seed Capital", topic: "consumer seed investing", industry: "consumer", roleType: "vc", gender: "woman", location: "New York, NY", tags: ["consumer", "vc", "seed"], publicProfile: "https://example.com/julia-moreno" },
];

/**
 * Maps query words to canonical tags/attributes present in the contact pool, so
 * natural-language queries ("AI founders", "crypto VC", "health tech",
 * "women founders in SF") rank the right people.
 */
const SYNONYMS: Record<string, string[]> = {
  // industries
  ai: ["ai"], ml: ["ai"], llm: ["ai"], genai: ["ai"], "a.i": ["ai"],
  crypto: ["crypto"], web3: ["crypto"], onchain: ["crypto"], blockchain: ["crypto"], defi: ["crypto"], stablecoin: ["crypto"], stablecoins: ["crypto"],
  health: ["health"], healthtech: ["health"], medical: ["health"], bio: ["health"], biotech: ["health"], telehealth: ["health"],
  fintech: ["fintech"], payments: ["fintech"], banking: ["fintech"], finance: ["fintech"], lending: ["fintech"],
  climate: ["climate"], cleantech: ["climate"], energy: ["climate"], carbon: ["climate"], sustainability: ["climate"],
  devtools: ["devtools"], infra: ["devtools"], infrastructure: ["devtools"], developer: ["devtools"], database: ["devtools"], platform: ["devtools"],
  security: ["security"], cyber: ["security"], cybersecurity: ["security"], infosec: ["security"],
  robotics: ["robotics"], robot: ["robotics"], robots: ["robotics"], hardware: ["robotics"],
  consumer: ["consumer"], social: ["consumer"], marketplace: ["consumer"], marketplaces: ["consumer"], mobile: ["consumer"],
  data: ["data"], analytics: ["data"], agents: ["agents"], agent: ["agents"], voice: ["voice"], search: ["search"],
  // role types
  founder: ["founder"], founders: ["founder"], ceo: ["founder"], cofounder: ["founder"], "co-founder": ["founder"], cto: ["builder"],
  vc: ["vc"], vcs: ["vc"], investor: ["vc"], investors: ["vc"], venture: ["vc"], capital: ["vc"], partner: ["vc"], angel: ["vc"], gp: ["vc"],
  builder: ["builder"], builders: ["builder"], engineer: ["builder"], engineers: ["builder"], engineering: ["builder"], technical: ["builder"], dev: ["builder"],
  operator: ["operator"], exec: ["operator"], executive: ["operator"], leader: ["operator"], head: ["operator"], vp: ["operator"], coo: ["operator"],
  // gender
  woman: ["woman"], women: ["woman"], female: ["woman"], she: ["woman"],
  man: ["man"], men: ["man"], male: ["man"], he: ["man"],
};

const STOPWORDS = new Set([
  "find", "search", "get", "me", "my", "a", "an", "the", "in", "of", "for", "and",
  "to", "with", "who", "that", "some", "please", "looking", "look", "reach", "out",
  "contact", "contacts", "people", "person", "profiles", "profile", "list", "want",
  "need", "based", "around", "about", "near", "from", "is", "are", "on", "at",
]);

function tokenize(q: string): string[] {
  return (q ?? "")
    .toLowerCase()
    .split(/[^a-z0-9.+-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

function expandToken(t: string): string[] {
  const out = new Set<string>([t]);
  for (const s of SYNONYMS[t] ?? []) out.add(s);
  // crude singular fallback (founders -> founder)
  if (t.endsWith("s") && t.length > 3) {
    const sing = t.slice(0, -1);
    out.add(sing);
    for (const s of SYNONYMS[sing] ?? []) out.add(s);
  }
  return [...out];
}

function haystack(c: Contact): string {
  return [
    c.name,
    c.role,
    c.company,
    c.topic,
    c.industry,
    c.roleType,
    c.gender,
    c.location,
    ...c.tags,
  ]
    .join(" ")
    .toLowerCase();
}

function scoreContact(c: Contact, tokens: string[]): number {
  if (!tokens.length) return 0;
  const hay = haystack(c);
  const tagSet = new Set([c.industry, c.roleType, c.gender, ...c.tags]);
  let score = 0;
  for (const raw of tokens) {
    let best = 0;
    for (const ex of expandToken(raw)) {
      if (tagSet.has(ex)) best = Math.max(best, 3);
      else if (hay.includes(ex)) best = Math.max(best, 1);
    }
    score += best;
  }
  return score;
}

export function searchContacts(query: string, limit = 5): { items: Contact[] } {
  const tokens = tokenize(query);
  const cap = Math.max(1, Math.min(limit, CONTACT_POOL.length));

  const scored = CONTACT_POOL.map((c) => ({ c, s: scoreContact(c, tokens) }));
  const anyMatch = scored.some((x) => x.s > 0);

  if (!anyMatch) {
    // Generic / unmatched query: return a stable, varied sample.
    return { items: CONTACT_POOL.slice(0, cap) };
  }

  scored.sort((a, b) => b.s - a.s);
  return { items: scored.filter((x) => x.s > 0).slice(0, cap).map((x) => x.c) };
}

function emailFor(name: string, company: string): string {
  const first = name.split(" ")[0]?.toLowerCase() ?? "hello";
  const domain = company.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com";
  return `${first}@${domain}`;
}

function phoneFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const part = (h % 9000000) + 1000000; // 7 digits
  return `+1 (212) ${String(part).slice(0, 3)}-${String(part).slice(3, 7)}`;
}

export function enrichContacts(items: Contact[]): { contacts: EnrichedContact[] } {
  return {
    contacts: (items ?? []).map((c) => ({
      ...c,
      email: emailFor(c.name, c.company),
      phone: phoneFor(c.id + c.name),
      whyRelevant: `${c.company} is working on ${c.topic}, a space where agentic payments and onchain settlement unlock new workflows.`,
      suggestedAngle: `Open with how x402 + USDC on Base lets ${c.company} monetize ${c.topic} per call.`,
    })),
  };
}
