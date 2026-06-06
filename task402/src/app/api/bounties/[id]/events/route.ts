import { db } from "@/lib/store";
import { subscribe } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const encoder = new TextEncoder();
  const sent = new Set<string>();
  let unsub: () => void = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: { id: string }) => {
        if (sent.has(e.id)) return;
        sent.add(e.id);
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          // controller closed
        }
      };

      // Wait briefly for the agent run to be created.
      let run = db.getRunByBounty(id);
      for (let i = 0; i < 60 && !run; i++) {
        await sleep(100);
        run = db.getRunByBounty(id);
      }

      if (run) {
        for (const e of db.eventsForRun(run.id)) send(e);
        unsub = subscribe(run.id, (e) => send(e));
      }

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          // ignore
        }
      }, 15000);
    },
    cancel() {
      unsub();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
