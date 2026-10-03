import fs from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const sql = neon(url);
const root = process.cwd();
const files = (await fs.readdir(path.join(root, "db")))
  .filter(name => /^\d+_.*\.sql$/.test(name))
  .sort();

await sql`create table if not exists forge_schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
)`;

for (const file of files) {
  const version = file.split("_")[0];
  const exists = await sql`select 1 from forge_schema_migrations where version = ${version} limit 1`;
  if (exists.length) continue;
  const source = await fs.readFile(path.join(root, "db", file), "utf8");
  await sql.transaction(async tx => {
    // Migration files are trusted repository SQL, never request-generated SQL.
    await tx(source);
    await tx`insert into forge_schema_migrations (version) values (${version})`;
  });
  console.log(`Applied ${file}`);
}
