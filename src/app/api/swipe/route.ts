import { getDb } from "@/lib/db";
import { recordSwipe } from "@/lib/service";
import { CURRENT_USER_ID } from "@/lib/seed-data";
import { ApiError } from "@/lib/errors";
import { handleError, json } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * POST /swipe  { targetId, direction: "like" | "pass" }
 * The swiper is ALWAYS the server-side current user, never taken from the body.
 */
export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Body must be valid JSON");
    }
    const { targetId, direction } = (body ?? {}) as { targetId?: string; direction?: unknown };
    const result = recordSwipe(getDb(), CURRENT_USER_ID, targetId as string, direction);
    return json(result);
  } catch (e) {
    return handleError(e);
  }
}
