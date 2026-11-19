import { beforeEach, describe, expect, it } from "vitest";
import { createDb, resetDb, seedDb, type DB } from "@/lib/db";
import { getFeed, getMatches, recordSwipe } from "@/lib/service";
import { CURRENT_USER_ID as ME, SEED_PROFILES } from "@/lib/seed-data";
import { ApiError } from "@/lib/errors";

const likers = SEED_PROFILES.filter((p) => p.likesMe).map((p) => p.id);
const nonLikers = SEED_PROFILES.filter((p) => !p.likesMe).map((p) => p.id);

let db: DB;
beforeEach(() => {
  db = createDb(":memory:");
  seedDb(db);
});

describe("seed data", () => {
  it("has at least 30 profiles, each with all required fields", () => {
    expect(SEED_PROFILES.length).toBeGreaterThanOrEqual(30);
    for (const p of getFeed(db, ME)) {
      expect(p.name).toBeTruthy();
      expect(p.age).toBeGreaterThanOrEqual(18);
      expect(p.photo).toMatch(/^\/photos\/p\d+\.jpg$/);
      expect(p.bio).toBeTruthy();
      expect(p.location).toBeTruthy();
      expect(p.interests.length).toBeGreaterThan(0);
    }
  });

  it("has some profiles that already like the user, and some that don't", () => {
    expect(likers.length).toBeGreaterThanOrEqual(5);
    expect(nonLikers.length).toBeGreaterThanOrEqual(5);
  });

  it("gives every profile its own photo path (public/photos/<id>.jpg)", () => {
    const feed = getFeed(db, ME);
    expect(new Set(feed.map((p) => p.photo)).size).toBe(feed.length);
    for (const p of feed) expect(p.photo).toBe(`/photos/${p.id}.jpg`);
  });

  it("refreshes stale photo URLs on an already-seeded database", () => {
    db.prepare("UPDATE users SET photo = 'https://picsum.photos/old' WHERE id <> 'me'").run();
    seedDb(db);
    expect(getFeed(db, ME).every((p) => p.photo.startsWith("/photos/"))).toBe(true);
  });

  it("is idempotent: seeding twice does not duplicate anything", () => {
    seedDb(db);
    expect(getFeed(db, ME)).toHaveLength(SEED_PROFILES.length);
  });
});

describe("getFeed", () => {
  it("returns every profile except the user, at first", () => {
    const feed = getFeed(db, ME);
    expect(feed).toHaveLength(SEED_PROFILES.length);
    expect(feed.find((p) => p.id === ME)).toBeUndefined();
  });

  it("never returns a profile that has been swiped on (like or pass)", () => {
    recordSwipe(db, ME, nonLikers[0], "like");
    recordSwipe(db, ME, nonLikers[1], "pass");
    recordSwipe(db, ME, likers[0], "like"); // becomes a match
    const ids = getFeed(db, ME).map((p) => p.id);
    expect(ids).not.toContain(nonLikers[0]);
    expect(ids).not.toContain(nonLikers[1]);
    expect(ids).not.toContain(likers[0]);
    expect(ids).toHaveLength(SEED_PROFILES.length - 3);
  });

  it("returns an empty feed once everything has been swiped", () => {
    for (const p of getFeed(db, ME)) recordSwipe(db, ME, p.id, "pass");
    expect(getFeed(db, ME)).toEqual([]);
  });

  it("is stable across calls (reload-safe) and keeps relative order after swipes", () => {
    const first = getFeed(db, ME).map((p) => p.id);
    expect(getFeed(db, ME).map((p) => p.id)).toEqual(first);
    recordSwipe(db, ME, first[0], "pass");
    expect(getFeed(db, ME).map((p) => p.id)).toEqual(first.slice(1));
  });
});

describe("privacy: nothing reveals who liked the user", () => {
  it("feed order is identical whether or not profiles like the user", () => {
    const other = createDb(":memory:");
    seedDb(other);
    // Make a completely different set of profiles "like" the user.
    other.prepare("DELETE FROM swipes").run();
    for (const id of nonLikers.slice(0, 12)) {
      other
        .prepare("INSERT INTO swipes (swiper_id, target_id, direction, created_at) VALUES (?, ?, 'like', 1)")
        .run(id, ME);
    }
    expect(getFeed(other, ME).map((p) => p.id)).toEqual(getFeed(db, ME).map((p) => p.id));
  });

  it("liked-me profiles are not clustered at the front of the feed", () => {
    // If order leaked likes, all likers would rank in the first N slots.
    const ids = getFeed(db, ME).map((p) => p.id);
    const firstN = ids.slice(0, likers.length);
    expect(firstN.every((id) => likers.includes(id))).toBe(false);
    const positions = likers.map((id) => ids.indexOf(id));
    expect(Math.max(...positions)).toBeGreaterThan(likers.length * 2);
  });

  it("profile payloads expose only whitelisted fields", () => {
    const allowed = ["age", "bio", "id", "interests", "location", "name", "photo"];
    for (const p of getFeed(db, ME)) expect(Object.keys(p).sort()).toEqual(allowed);
    expect(JSON.stringify(getFeed(db, ME))).not.toMatch(/like|crush|admir/i);
  });

  it("swipe responses look the same for 'they liked me' vs 'they did not' when passing", () => {
    const a = recordSwipe(db, ME, likers[0], "pass");
    const b = recordSwipe(db, ME, nonLikers[0], "pass");
    expect(a).toEqual(b);
    expect(a).toEqual({ matched: false, match: null, alreadySwiped: false });
  });

  it("a pass never matches, even if the other person liked the user", () => {
    recordSwipe(db, ME, likers[0], "pass");
    expect(getMatches(db, ME)).toEqual([]);
  });

  it("a pass is final: it cannot be flipped into a like to reveal a match", () => {
    recordSwipe(db, ME, likers[0], "pass");
    const retry = recordSwipe(db, ME, likers[0], "like");
    expect(retry.matched).toBe(false);
    expect(retry.alreadySwiped).toBe(true);
    expect(getMatches(db, ME)).toEqual([]);
  });

  it("matches list contains mutual matches only", () => {
    recordSwipe(db, ME, nonLikers[0], "like"); // one-sided
    expect(getMatches(db, ME)).toEqual([]);
    recordSwipe(db, ME, likers[0], "like"); // mutual
    expect(getMatches(db, ME).map((m) => m.profile.id)).toEqual([likers[0]]);
  });
});

describe("recordSwipe / matching", () => {
  it("creates a match when the other user has already liked", () => {
    const r = recordSwipe(db, ME, likers[0], "like");
    expect(r.matched).toBe(true);
    expect(r.match?.profile.id).toBe(likers[0]);
  });

  it("does not match on a one-sided like", () => {
    const r = recordSwipe(db, ME, nonLikers[0], "like");
    expect(r).toEqual({ matched: false, match: null, alreadySwiped: false });
  });

  it("matches when the other user likes second (either order works)", () => {
    expect(recordSwipe(db, ME, nonLikers[0], "like").matched).toBe(false);
    const later = recordSwipe(db, nonLikers[0], ME, "like");
    expect(later.matched).toBe(true);
    expect(getMatches(db, ME).map((m) => m.profile.id)).toEqual([nonLikers[0]]);
    expect(getMatches(db, nonLikers[0]).map((m) => m.profile.id)).toEqual([ME]);
  });

  it("is idempotent: repeating a swipe does not duplicate rows or matches", () => {
    recordSwipe(db, ME, likers[0], "like");
    const again = recordSwipe(db, ME, likers[0], "like");
    expect(again.alreadySwiped).toBe(true);
    expect(again.matched).toBe(true);
    expect(getMatches(db, ME)).toHaveLength(1);
    const { n } = db
      .prepare("SELECT COUNT(*) AS n FROM swipes WHERE swiper_id = ? AND target_id = ?")
      .get(ME, likers[0]) as { n: number };
    expect(n).toBe(1);
  });

  it("orders matches newest first", () => {
    const t = Date.now();
    db.prepare("INSERT INTO matches (user_a, user_b, created_at) VALUES (?, ?, ?)").run(ME, likers[0], t - 1000);
    db.prepare("INSERT INTO matches (user_a, user_b, created_at) VALUES (?, ?, ?)").run(ME, likers[1], t);
    expect(getMatches(db, ME).map((m) => m.profile.id)).toEqual([likers[1], likers[0]]);
  });

  it("rejects bad input with proper status codes", () => {
    const status = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return e instanceof ApiError ? e.status : -1;
      }
      return 0;
    };
    expect(status(() => recordSwipe(db, ME, likers[0], "super-like"))).toBe(400);
    expect(status(() => recordSwipe(db, ME, likers[0], undefined))).toBe(400);
    expect(status(() => recordSwipe(db, ME, "", "like"))).toBe(400);
    expect(status(() => recordSwipe(db, ME, ME, "like"))).toBe(400);
    expect(status(() => recordSwipe(db, ME, "nobody", "like"))).toBe(404);
  });

  it("does not persist anything when validation fails", () => {
    try {
      recordSwipe(db, ME, "nobody", "like");
    } catch {
      /* expected */
    }
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM swipes WHERE swiper_id = ?").get(ME) as { n: number };
    expect(n).toBe(0);
  });
});

describe("resetDb", () => {
  it("restores the initial demo state", () => {
    recordSwipe(db, ME, likers[0], "like");
    resetDb(db);
    expect(getMatches(db, ME)).toEqual([]);
    expect(getFeed(db, ME)).toHaveLength(SEED_PROFILES.length);
  });
});
