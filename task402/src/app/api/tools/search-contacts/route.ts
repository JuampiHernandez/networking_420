import { createPaidRoute, toolLandingResponse } from "@/lib/x402-seller";
import { TOOLS, searchContacts } from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createPaidRoute(TOOLS["search-contacts"], (body) => {
  const query = (body.query as string) ?? "";
  const limit = Number(body.limit ?? 5);
  return searchContacts(query, limit);
});

export async function GET() {
  return toolLandingResponse("search-contacts");
}
