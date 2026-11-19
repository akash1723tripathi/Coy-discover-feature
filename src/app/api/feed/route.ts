import { getDb } from "@/lib/db";
import { getFeed } from "@/lib/service";
import { CURRENT_USER_ID } from "@/lib/seed-data";
import { handleError, json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /feed: profiles the (single, hardcoded) user has not swiped on yet. */
export async function GET() {
  try {
    return json({ profiles: getFeed(getDb(), CURRENT_USER_ID) });
  } catch (e) {
    return handleError(e);
  }
}
