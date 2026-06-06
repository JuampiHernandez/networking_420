import { nanoid } from "nanoid";
import { db } from "./store";
import type { RunEvent, RunEventType } from "./types";

type Listener = (e: RunEvent) => void;

const g = globalThis as unknown as {
  __task402bus?: Map<string, Set<Listener>>;
};

function bus(): Map<string, Set<Listener>> {
  if (!g.__task402bus) g.__task402bus = new Map();
  return g.__task402bus;
}

export function subscribe(runId: string, listener: Listener): () => void {
  const b = bus();
  if (!b.has(runId)) b.set(runId, new Set());
  b.get(runId)!.add(listener);
  return () => {
    b.get(runId)?.delete(listener);
  };
}

export function emitEvent(
  runId: string,
  bountyId: string,
  type: RunEventType,
  message: string,
  data?: Record<string, unknown>,
): RunEvent {
  const event: RunEvent = {
    id: nanoid(),
    runId,
    bountyId,
    type,
    message,
    data,
    ts: new Date().toISOString(),
  };
  db.appendEvent(event);
  const listeners = bus().get(runId);
  if (listeners) {
    for (const l of listeners) {
      try {
        l(event);
      } catch {
        // ignore listener errors
      }
    }
  }
  return event;
}
