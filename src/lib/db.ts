import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { CURRENT_USER_ID, ME, PHOTO_EXTENSIONS, SEED_PROFILES } from "./seed-data";

export type DB = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  age        INTEGER NOT NULL,
  photo      TEXT NOT NULL,
  bio        TEXT NOT NULL,
  location   TEXT NOT NULL,
  interests  TEXT NOT NULL            -- JSON array of strings
);

-- One row per (swiper, target). The primary key makes swipes FINAL: a pass
-- cannot be flipped into a like (or vice versa), so nobody can "probe" for
-- reciprocal interest by re-swiping.
CREATE TABLE IF NOT EXISTS swipes (
  swiper_id  TEXT NOT NULL REFERENCES users(id),
  target_id  TEXT NOT NULL REFERENCES users(id),
  direction  TEXT NOT NULL CHECK (direction IN ('like', 'pass')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (swiper_id, target_id),
  CHECK (swiper_id <> target_id)
);
CREATE INDEX IF NOT EXISTS idx_swipes_target ON swipes(target_id, direction);

-- Canonical unordered pair (user_a < user_b) so a match can only exist once.
CREATE TABLE IF NOT EXISTS matches (
  user_a     TEXT NOT NULL REFERENCES users(id),
  user_b     TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);
`;

export function createDb(file: string = ":memory:"): DB {
  const db = new Database(file);
  if (file !== ":memory:") db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

/**
 * Photo URL for a profile: the file public/photos/<id>.(jpg|jpeg|png|webp).
 * If no file exists we still point at <id>.jpg; the UI then shows a
 * pastel-initial fallback instead of a broken image.
 */
export function resolvePhoto(id: string): string {
  for (const ext of PHOTO_EXTENSIONS) {
    if (fs.existsSync(path.join(process.cwd(), "public", "photos", `${id}.${ext}`))) {
      return `/photos/${id}.${ext}`;
    }
  }
  return `/photos/${id}.jpg`;
}

/** Keeps photos current for databases that were seeded by an older version. */
function syncPhotos(db: DB): void {
  const update = db.prepare("UPDATE users SET photo = ? WHERE id = ?");
  db.transaction(() => {
    for (const p of SEED_PROFILES) update.run(resolvePhoto(p.id), p.id);
  })();
}

/** Inserts demo data if the database is empty; otherwise just refreshes photos. */
export function seedDb(db: DB): void {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (n > 0) {
    syncPhotos(db);
    return;
  }

  const insertUser = db.prepare(
    "INSERT INTO users (id, name, age, photo, bio, location, interests) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const insertSwipe = db.prepare(
    "INSERT INTO swipes (swiper_id, target_id, direction, created_at) VALUES (?, ?, 'like', ?)",
  );

  db.transaction(() => {
    insertUser.run(ME.id, ME.name, ME.age, "", ME.bio, ME.location, JSON.stringify(ME.interests));
    const now = Date.now();
    for (const p of SEED_PROFILES) {
      insertUser.run(p.id, p.name, p.age, resolvePhoto(p.id), p.bio, p.location, JSON.stringify(p.interests));
      // These rows are the "secret crushes". They are never exposed by any API.
      if (p.likesMe) insertSwipe.run(p.id, CURRENT_USER_ID, now);
    }
  })();
}

/** Wipes everything and re-seeds (used by `npm run seed` and the demo reset). */
export function resetDb(db: DB): void {
  db.transaction(() => {
    db.exec("DELETE FROM matches; DELETE FROM swipes; DELETE FROM users;");
  })();
  seedDb(db);
}

const globalForDb = globalThis as unknown as { __coyDb?: DB };

/** Lazily-created singleton (survives Next.js dev hot reloads). */
export function getDb(): DB {
  if (!globalForDb.__coyDb) {
    const file = process.env.DB_PATH ?? path.join(process.cwd(), "data", "coy.db");
    if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = createDb(file);
    seedDb(db);
    globalForDb.__coyDb = db;
  }
  return globalForDb.__coyDb;
}
