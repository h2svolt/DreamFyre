// Drops every table in the configured Turso/libSQL database so the app
// recreates and reseeds the schema fresh on its next request.
//
// Usage:
//   node --env-file=.env.local scripts/reset-turso-db.mjs
//
// Reads TURSO_DATABASE_URL and TURSO_AUTH_TOKEN from the environment.
// This is destructive and irreversible — it wipes all data in the target database.

import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in environment.");
  process.exit(1);
}

const client = createClient({ url, authToken });

console.log(`Target database: ${url}`);

const result = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_litestream_seq' AND name != '_litestream_lock'"
);

const tables = result.rows.map((r) => r.name);
console.log(`Found ${tables.length} table(s):`, tables);

if (tables.length === 0) {
  console.log("Nothing to drop.");
  process.exit(0);
}

for (const table of tables) {
  await client.execute(`DROP TABLE IF EXISTS "${table}"`);
  console.log(`Dropped table: ${table}`);
}

const verify = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
);
console.log(`Remaining tables: ${verify.rows.length}`);
