import fs from "node:fs";
import path from "node:path";
import type {
  AgentRun,
  Bounty,
  RunEvent,
  Submission,
  ToolCall,
} from "./types";

type DB = {
  bounties: Record<string, Bounty>;
  runs: Record<string, AgentRun>;
  toolCalls: Record<string, ToolCall>;
  submissions: Record<string, Submission>;
  events: RunEvent[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function emptyDb(): DB {
  return {
    bounties: {},
    runs: {},
    toolCalls: {},
    submissions: {},
    events: [],
  };
}

// Persist across Next.js dev hot-reloads via globalThis.
const g = globalThis as unknown as { __task402db?: DB };

function load(): DB {
  if (g.__task402db) return g.__task402db;
  let db = emptyDb();
  try {
    if (fs.existsSync(DB_PATH)) {
      db = { ...emptyDb(), ...JSON.parse(fs.readFileSync(DB_PATH, "utf8")) };
    }
  } catch {
    db = emptyDb();
  }
  g.__task402db = db;
  return db;
}

function persist() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(g.__task402db, null, 2));
  } catch {
    // best-effort; in-memory still works for the demo
  }
}

export const db = {
  reset() {
    g.__task402db = emptyDb();
    persist();
  },

  // Bounties
  listBounties(): Bounty[] {
    return Object.values(load().bounties).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  },
  getBounty(id: string): Bounty | undefined {
    return load().bounties[id];
  },
  saveBounty(b: Bounty): Bounty {
    load().bounties[b.id] = b;
    persist();
    return b;
  },

  // Runs
  getRun(id: string): AgentRun | undefined {
    return load().runs[id];
  },
  getRunByBounty(bountyId: string): AgentRun | undefined {
    return Object.values(load().runs)
      .filter((r) => r.bountyId === bountyId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  },
  saveRun(r: AgentRun): AgentRun {
    load().runs[r.id] = r;
    persist();
    return r;
  },

  // Tool calls
  listToolCalls(runId: string): ToolCall[] {
    return Object.values(load().toolCalls)
      .filter((t) => t.agentRunId === runId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  saveToolCall(t: ToolCall): ToolCall {
    load().toolCalls[t.id] = t;
    persist();
    return t;
  },

  // Submissions
  getSubmissionByBounty(bountyId: string): Submission | undefined {
    return Object.values(load().submissions)
      .filter((s) => s.bountyId === bountyId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  },
  saveSubmission(s: Submission): Submission {
    load().submissions[s.id] = s;
    persist();
    return s;
  },

  // Events (append-only log used for SSE)
  appendEvent(e: RunEvent) {
    load().events.push(e);
    persist();
  },
  eventsForRun(runId: string): RunEvent[] {
    return load().events.filter((e) => e.runId === runId);
  },
};
