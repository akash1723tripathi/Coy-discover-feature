import { getDb, resetDb } from "@/lib/db";
import { ApiError } from "@/lib/errors";
import { handleError, json } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/reset: wipes swipes/matches and re-seeds. Demo convenience only;
 * set DISABLE_RESET=1 to turn it off.
 */
export async function POST() {
  try {
    if (process.env.DISABLE_RESET === "1") throw new ApiError(403, "Reset is disabled");
    resetDb(getDb());
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
