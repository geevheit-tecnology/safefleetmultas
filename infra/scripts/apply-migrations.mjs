import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Client } from "pg";

async function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const rl = createInterface({ input, output });
  const url = await rl.question("DATABASE_URL: ");
  rl.close();
  return url.trim();
}

const databaseUrl = await readDatabaseUrl();

if (!databaseUrl) {
  console.error("DATABASE_URL nao configurada.");
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

try {
  for (const migration of ["database/migrations/001_initial_schema.sql", "database/migrations/002_demo_seed.sql"]) {
    console.log(`Aplicando ${migration}`);
    const sql = await readFile(migration, "utf8");
    await client.query(sql);
  }
  console.log("Migrations aplicadas com sucesso.");
} finally {
  await client.end();
}
