import { db } from "./store";
import { buildLedger } from "./payments";
import { getChainMode, getLlmMode, getEmailMode, getCallMode } from "./config";
import { llmLabel } from "./llm";
import { TOOL_LIST } from "./tools";

export function modeInfo() {
  return {
    chainMode: getChainMode(),
    llmMode: getLlmMode(),
    llmLabel: llmLabel(),
    emailMode: getEmailMode(),
    callMode: getCallMode(),
    network: "Base Sepolia",
  };
}

export function bountyView(id: string) {
  const bounty = db.getBounty(id);
  if (!bounty) return undefined;
  const run = db.getRunByBounty(id);
  const toolCalls = run ? db.listToolCalls(run.id) : [];
  const submission = db.getSubmissionByBounty(id);
  const events = run ? db.eventsForRun(run.id) : [];
  const ledger = buildLedger(bounty);
  return {
    bounty,
    run,
    toolCalls,
    submission,
    events,
    ledger,
    tools: TOOL_LIST,
    modes: modeInfo(),
  };
}
