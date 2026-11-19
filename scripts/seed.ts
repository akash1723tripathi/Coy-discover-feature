import path from "node:path";
import fs from "node:fs";
import { createDb, resetDb } from "../src/lib/db";

const file = process.env.DB_PATH ?? path.join(process.cwd(), "data", "coy.db");
fs.mkdirSync(path.dirname(file), { recursive: true });
const db = createDb(file);
resetDb(db);
const { n } = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
console.log(`Seeded ${n} users into ${file}`);
