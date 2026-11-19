import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Exercises the real route handlers against an in-memory database, so the
 * "persist across reloads" path (feed shrinks, matches stick) is covered
 * end to end without a running server.
 */
async function load() {
  vi.resetModules();
  process.env.DB_PATH = ":memory:";
  delete (globalThis as { __coyDb?: unknown }).__coyDb;
  const [feed, swipe, matches, reset] = await Promise.all([
    import("@/app/api/feed/route"),
    import("@/app/api/swipe/route"),
    import("@/app/api/matches/route"),
    import("@/app/api/reset/route"),
  ]);
  return { feed, swipe, matches, reset };
}

const post = (body: unknown, raw = false) =>
  new Request("http://x/api/swipe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });

let api: Awaited<ReturnType<typeof load>>;
beforeEach(async () => {
  api = await load();
});

describe("API routes", () => {
  it("GET /feed returns profiles with no like information, uncached", async () => {
    const res = await api.feed.GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const { profiles } = await res.json();
    expect(profiles.length).toBeGreaterThanOrEqual(30);
    expect(JSON.stringify(profiles)).not.toMatch(/like|crush/i);
  });

  it("POST /swipe like on a profile that already liked the user returns a match", async () => {
    const { profiles } = await (await api.feed.GET()).json();
    // Try profiles in feed order until one matches (some seeded profiles like the user).
    let matched = 0;
    for (const p of profiles) {
      const r = await (await api.swipe.POST(post({ targetId: p.id, direction: "like" }))).json();
      if (r.matched) {
        matched++;
        expect(r.match.profile.id).toBe(p.id);
      }
    }
    expect(matched).toBeGreaterThan(0);

    const { matches } = await (await api.matches.GET()).json();
    expect(matches).toHaveLength(matched);
  });

  it("swiped profiles disappear from the feed and stay gone", async () => {
    const before = (await (await api.feed.GET()).json()).profiles;
    await api.swipe.POST(post({ targetId: before[0].id, direction: "pass" }));
    const after = (await (await api.feed.GET()).json()).profiles;
    expect(after).toHaveLength(before.length - 1);
    expect(after.map((p: { id: string }) => p.id)).not.toContain(before[0].id);
  });

  it("POST /swipe validates input", async () => {
    expect((await api.swipe.POST(post("not json", true))).status).toBe(400);
    expect((await api.swipe.POST(post({ targetId: "p01", direction: "maybe" }))).status).toBe(400);
    expect((await api.swipe.POST(post({ targetId: "nope", direction: "like" }))).status).toBe(404);
    expect((await api.swipe.POST(post({ targetId: "me", direction: "like" }))).status).toBe(400);
  });

  it("ignores any attempt to swipe as someone else", async () => {
    // The body has no way to choose the swiper; an extra field must be ignored.
    const res = await api.swipe.POST(post({ targetId: "p02", direction: "like", swiperId: "p01" }));
    expect(res.status).toBe(200);
    const { matches } = await (await api.matches.GET()).json();
    expect(matches.map((m: { profile: { id: string } }) => m.profile.id)).toEqual(["p02"]);
  });

  it("POST /api/reset restores the demo state", async () => {
    await api.swipe.POST(post({ targetId: "p02", direction: "like" }));
    expect((await api.reset.POST()).status).toBe(200);
    const { matches } = await (await api.matches.GET()).json();
    expect(matches).toEqual([]);
  });
});
