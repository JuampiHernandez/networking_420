import { createPaidRoute, toolLandingResponse } from "@/lib/x402-seller";
import { TOOLS } from "@/lib/tools";
import { sendOutreachEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createPaidRoute(TOOLS["send-email"], async (body) => {
  const to = (body.to as string) ?? "";
  const subject = (body.subject as string) ?? "Quick intro";
  const text = (body.body as string) ?? "";
  return sendOutreachEmail({ to, subject, body: text });
});

export async function GET() {
  return toolLandingResponse("send-email");
}
