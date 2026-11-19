import { getDb } from "@/lib/db";
import { getMatches } from "@/lib/service";
import { CURRENT_USER_ID } from "@/lib/seed-data";
import { handleError, json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /matches: mutual matches only. */
export async function GET() {
  try {
    return json({ matches: getMatches(getDb(), CURRENT_USER_ID) });
  } catch (e) {
    return handleError(e);
  }
}
