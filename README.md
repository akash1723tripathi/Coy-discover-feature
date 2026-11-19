# Coy · Discover tab

A swipe-based **Discover** tab with **double-blind matching**, built as a standalone Next.js app for the Coy SDE intern assignment. The tab bar has a blank **Home** tab and the **Discover** tab, which holds all the functionality.

> Core promise of Coy: *if they don't like you back, nobody ever knows.* Everything below is designed around never revealing who liked the user unless it is mutual.

## Run it

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:3000  (open in a phone-sized window or device mode)
npm test           # unit + API tests
npm run build && npm start
```

The SQLite database (`data/coy.db`) is created and seeded automatically on first request. Run `npm run seed` or use **Reset demo data** on the empty state to start over. If the seed profiles change in code, the demo database rebuilds itself on the next start (it stores a seed version), so an old `data/coy.db` can't show stale names.

## What's in it

- **30 seeded profiles** (name, age, photo, bio, city/college, interests): 18 men (`p01`-`p18`) and 12 women (`p19`-`p30`). **8 of them already like the logged-in user**, so matches happen quickly in a demo. Photos are local files in `public/photos/<id>.jpg`; if one is missing the card shows a pastel initial instead of a broken image.
- **Swipe card stack:** one card at a time. Drag on touch/mouse (like/nope stamps fade in with the drag, springs back if released early, flies off if past the threshold or flicked), plus ✕ / ♥ buttons and ← / → keys on desktop. `prefers-reduced-motion` is respected.
- **"It's a match!" overlay** when a like is mutual, and a **Matches** view (newest first, badge count).
- **Empty state** when no profiles are left.
- **Persistence:** swipes and matches live in SQLite, so reloads and server restarts keep them. A swiped profile never comes back.

## Theme

The UI mirrors getcoy.com's design language: **Bricolage Grotesque** (self-hosted via `@fontsource-variable/bricolage-grotesque`, weight 800 with tight tracking for headings), 2px ink outlines (`#15121D`), hard offset shadows with no blur, pill buttons that press down, hot pink `#FF3D81` on white, pastel fills (lilac, mint, sky, peach, yellow) and slightly tilted "stickers". The match screen reuses the site's pink match card. Copy follows Coy's tone, e.g. "If it's mutual, they show up here. If not, nobody ever knows."

## API

Handlers live under `/api/*`; `next.config.mjs` also rewrites `/feed`, `/swipe`, `/matches` to match the spec literally.

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/feed` | – | `{ profiles: PublicProfile[] }` not yet swiped, stable order |
| POST | `/swipe` | `{ targetId, direction: "like" \| "pass" }` | `{ matched, match, alreadySwiped }` |
| GET | `/matches` | – | `{ matches: { profile, matchedAt }[] }` mutual only |
| POST | `/api/reset` | – | demo reset (disable with `DISABLE_RESET=1`) |

There is no auth: the logged-in user is a server-side constant (`CURRENT_USER_ID`). The swiper is **never** read from the request body.

## Privacy design (the important part)

| Risk | How it's handled |
| --- | --- |
| API leaks "this person liked you" | Profiles go through a single whitelist mapper (`toPublic`). No like-related field exists in any response. Tested. |
| Feed order leaks likes (liked-you profiles shown first) | Feed is a stable shuffle keyed only by `(userId, profileId)`. It ignores swipe data. Tested: the order is identical with a completely different set of likers. |
| Probing by re-swiping | Swipes are final (`PRIMARY KEY (swiper_id, target_id)`). A repeat swipe returns current state and never flips pass to like. |
| Pass reveals something | Responses for "pass", and for "like with no reverse like", are identical. A pass never creates a match. |
| UI hints at the other side | The toast says "You liked X" for every like, matched or not. Only a real mutual like triggers the match overlay. No "likes you" counts anywhere. |
| Race conditions | `recordSwipe` runs in one `IMMEDIATE` transaction, so two concurrent swipes can't miss each other or create duplicate matches (`matches` has a canonical `user_a < user_b` key). |
| Spoofing the swiper | Server-side constant only. Tested that an extra `swiperId` field is ignored. |

## Known trade-offs

- **Instant match on a seeded like.** In the demo, liking a profile that already liked you matches immediately. That's by design (the reveal is mutual), but a real user could in principle infer a like from an instant match. Coy's real model has the same property.
- **Final passes** mean a mis-swipe can't be undone. This is deliberate (it blocks probing) and matches Coy's "adding is final" rule.
- **The whole feed is sent at once** (fine for ~30 profiles). With real data it should be paginated with a cursor.
- **No rate limiting / abuse controls**, and no auth (out of scope per the brief).
- **Timing side channels** are not hardened. The response shape is identical, but the DB does one extra lookup on likes.

## Project layout

```
src/lib/service.ts      core logic: getFeed, recordSwipe, getMatches
src/lib/db.ts           SQLite schema, seeding, reset
src/lib/seed-data.ts    30 mock profiles (+ which of them like the user)
src/app/api/*           route handlers
src/components/*        AppShell (tabs), Discover, SwipeCard, MatchOverlay, MatchesList
tests/                  Vitest: service logic + route handlers
```

## Deploy

This needs a Node host with a writable disk (SQLite is a file), so use Render, Railway or Fly. Vercel's filesystem is read-only, so it is not a fit for this setup.

**Render:** push the repo to GitHub, then Dashboard -> New -> Blueprint -> select the repo (`render.yaml` is included). Build: `npm ci && npm run build`, start: `npm start`.

Notes for a public demo:
- On free tiers the disk is ephemeral: swipes reset when the service restarts or sleeps. Attach a persistent disk and set `DB_PATH=/var/data/coy.db` to keep them.
- The assignment assumes a single logged-in user, so everyone who opens the demo shares the same swipes. Use **Reset demo data** to start over.

## Tests

`npm test` runs 30 tests covering: seed requirements; feed exclusion of swiped profiles; reload-stable order; no like leakage (payload, order, response equality); pass finality; mutual-only matching in either order; idempotent swipes; input validation; and the real route handlers end to end.
