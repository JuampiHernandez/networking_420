import { createPaidRoute, toolLandingResponse } from "@/lib/x402-seller";
import { TOOLS, enrichContacts, type Contact } from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createPaidRoute(TOOLS["enrich-contact"], (body) => {
  const contacts = (body.contacts as Contact[]) ?? [];
  return enrichContacts(contacts);
});

export async function GET() {
  return toolLandingResponse("enrich-contact");
}
