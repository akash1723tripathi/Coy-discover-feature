import type { DB } from "./db";
import { ApiError } from "./errors";
import type { Direction, Match, PublicProfile, SwipeResult } from "./types";

interface UserRow {
  id: string;
  name: string;
  age: number;
  photo: string;
  bio: string;
  location: string;
  interests: string;
}

/** Whitelist mapper: the single place a DB row becomes something a client may see. */
function toPublic(row: UserRow): PublicProfile {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    photo: row.photo,
    bio: row.bio,
    location: row.location,
    interests: JSON.parse(row.interests) as string[],
  };
}

/** FNV-1a 32-bit. Small, deterministic, no dependencies. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Profiles the user has not swiped on yet.
 *
 * PRIVACY: ordering is a stable shuffle keyed only by (userId, profileId).
 * It deliberately ignores who has liked whom; otherwise a user could infer
 * likes from "who shows up first". The profile payload carries no like info.
 */
export function getFeed(db: DB, userId: string): PublicProfile[] {
  const rows = db
    .prepare(
      `SELECT u.* FROM users u
       WHERE u.id <> @userId
         AND NOT EXISTS (
           SELECT 1 FROM swipes s WHERE s.swiper_id = @userId AND s.target_id = u.id
         )`,
    )
    .all({ userId }) as UserRow[];

  return rows
    .map((r) => ({ r, k: hash(`${userId}:${r.id}`) }))
    .sort((a, b) => a.k - b.k || a.r.id.localeCompare(b.r.id))
    .map(({ r }) => toPublic(r));
}

function getUser(db: DB, id: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

function getMatchRow(db: DB, a: string, b: string): { created_at: number } | undefined {
  const [x, y] = a < b ? [a, b] : [b, a];
  return db.prepare("SELECT created_at FROM matches WHERE user_a = ? AND user_b = ?").get(x, y) as
    | { created_at: number }
    | undefined;
}

/**
 * Records a swipe and reports whether it created a match.
 *
 * - Runs in one IMMEDIATE transaction, so two concurrent swipes cannot both
 *   miss each other's like (no lost matches, no duplicate matches).
 * - Swipes are final: re-swiping the same target never changes the stored
 *   direction. A repeat just returns the current state.
 * - A match exists only if BOTH directions are 'like'.
 * - The response only ever describes the swiper's own action and, on a
 *   mutual like, the match. It is the same shape for "no reverse like" and
 *   "pass", so it leaks nothing about the other person's swipes.
 */
export function recordSwipe(
  db: DB,
  swiperId: string,
  targetId: string,
  direction: unknown,
): SwipeResult {
  if (direction !== "like" && direction !== "pass") {
    throw new ApiError(400, "direction must be 'like' or 'pass'");
  }
  if (typeof targetId !== "string" || targetId.length === 0) {
    throw new ApiError(400, "targetId is required");
  }
  if (swiperId === targetId) throw new ApiError(400, "You cannot swipe on yourself");

  const run = db.transaction((dir: Direction): SwipeResult => {
    const target = getUser(db, targetId);
    if (!target) throw new ApiError(404, "Profile not found");

    const existing = db
      .prepare("SELECT direction FROM swipes WHERE swiper_id = ? AND target_id = ?")
      .get(swiperId, targetId) as { direction: Direction } | undefined;

    if (existing) {
      const m = getMatchRow(db, swiperId, targetId);
      return {
        matched: !!m,
        match: m ? { profile: toPublic(target), matchedAt: m.created_at } : null,
        alreadySwiped: true,
      };
    }

    const now = Date.now();
    db.prepare(
      "INSERT INTO swipes (swiper_id, target_id, direction, created_at) VALUES (?, ?, ?, ?)",
    ).run(swiperId, targetId, dir, now);

    if (dir === "like") {
      const reverse = db
        .prepare(
          "SELECT 1 FROM swipes WHERE swiper_id = ? AND target_id = ? AND direction = 'like'",
        )
        .get(targetId, swiperId);
      if (reverse) {
        const [a, b] = swiperId < targetId ? [swiperId, targetId] : [targetId, swiperId];
        db.prepare(
          "INSERT OR IGNORE INTO matches (user_a, user_b, created_at) VALUES (?, ?, ?)",
        ).run(a, b, now);
        return {
          matched: true,
          match: { profile: toPublic(target), matchedAt: now },
          alreadySwiped: false,
        };
      }
    }
    return { matched: false, match: null, alreadySwiped: false };
  });

  return run.immediate(direction);
}

/** Mutual matches only, newest first. */
export function getMatches(db: DB, userId: string): Match[] {
  const rows = db
    .prepare(
      `SELECT u.*, m.created_at AS matched_at
       FROM matches m
       JOIN users u ON u.id = CASE WHEN m.user_a = @userId THEN m.user_b ELSE m.user_a END
       WHERE m.user_a = @userId OR m.user_b = @userId
       ORDER BY m.created_at DESC, u.id ASC`,
    )
    .all({ userId }) as (UserRow & { matched_at: number })[];

  return rows.map((r) => ({ profile: toPublic(r), matchedAt: r.matched_at }));
}
