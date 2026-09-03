import { readFile } from "node:fs/promises";
import { Client } from "pg";

function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator);
    let value = line.slice(separator + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const envFile = process.argv[2] || "apps/mobile/.env.local";
const env = { ...parseEnv(await readFile(envFile, "utf8")), ...process.env };

if (!env.DATABASE_URL) {
  console.error("DATABASE_URL nao encontrada.");
  process.exit(1);
}

const client = new Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

async function hasTable(tableName) {
  const result = await client.query("select to_regclass($1) as name", [`public.${tableName}`]);
  return Boolean(result.rows[0]?.name);
}

async function deleteIfTableExists(tableName, sql) {
  if (!(await hasTable(tableName))) return;
  await client.query(sql);
}

try {
  await client.query("begin");
  await deleteIfTableExists(
    "outbox_events",
    `
    delete from outbox_events
    where organization_id = '00000000-0000-0000-0000-000000000001'
       or aggregate_id in (
         select id::text
         from regulatory_cases
         where source = 'DEMO'
            or infraction_number ilike '%DEMO%'
            or case_number between 'AC-2026-001' and 'AC-2026-010'
       )
    `
  );
  await deleteIfTableExists("audit_logs", "delete from audit_logs where organization_id = '00000000-0000-0000-0000-000000000001'");
  await deleteIfTableExists(
    "regulatory_cases",
    `
    delete from regulatory_cases
    where source = 'DEMO'
       or infraction_number ilike '%DEMO%'
       or case_number between 'AC-2026-001' and 'AC-2026-010'
    `
  );
  await deleteIfTableExists(
    "regulatory_changes",
    `
    delete from regulatory_changes
    where legal_document_id in (
      select id from legal_documents where source_hash in ('demo-ciot-source', 'demo-piso-source', 'demo-processo-source')
    )
    `
  );
  await deleteIfTableExists("legal_sources", "delete from legal_sources where source_hash in ('demo-ciot-source', 'demo-piso-source', 'demo-processo-source')");
  await deleteIfTableExists(
    "legal_versions",
    "delete from legal_versions where source_hash in ('demo-ciot-source', 'demo-piso-source', 'demo-processo-source') or version_label = 'demo-v1'"
  );
  await deleteIfTableExists(
    "legal_documents",
    "delete from legal_documents where source_hash in ('demo-ciot-source', 'demo-piso-source', 'demo-processo-source') or number in ('CIOT-DEMO', 'PISO-DEMO', 'PROCESSO-DEMO')"
  );
  await deleteIfTableExists(
    "organization_members",
    `
    delete from organization_members
    where organization_id = '00000000-0000-0000-0000-000000000001'
       or user_id in (
         '00000000-0000-0000-0000-000000000101',
         '00000000-0000-0000-0000-000000000102',
         '00000000-0000-0000-0000-000000000103',
         '00000000-0000-0000-0000-000000000104',
         '00000000-0000-0000-0000-000000000105'
       )
    `
  );
  await deleteIfTableExists(
    "role_permissions",
    "delete from role_permissions where role_id in (select id from roles where organization_id = '00000000-0000-0000-0000-000000000001')"
  );
  await deleteIfTableExists("roles", "delete from roles where organization_id = '00000000-0000-0000-0000-000000000001'");
  await deleteIfTableExists(
    "user_sessions",
    `
    delete from user_sessions
    where user_id in (
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000102',
      '00000000-0000-0000-0000-000000000103',
      '00000000-0000-0000-0000-000000000104',
      '00000000-0000-0000-0000-000000000105'
    )
    `
  );
  await deleteIfTableExists(
    "user_credentials",
    `
    delete from user_credentials
    where user_id in (
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000102',
      '00000000-0000-0000-0000-000000000103',
      '00000000-0000-0000-0000-000000000104',
      '00000000-0000-0000-0000-000000000105'
    )
    `
  );
  await deleteIfTableExists(
    "users",
    `
    delete from users
    where id in (
      '00000000-0000-0000-0000-000000000101',
      '00000000-0000-0000-0000-000000000102',
      '00000000-0000-0000-0000-000000000103',
      '00000000-0000-0000-0000-000000000104',
      '00000000-0000-0000-0000-000000000105'
    )
    or email ilike '%@demo.local'
    `
  );
  await deleteIfTableExists("organizations", "delete from organizations where id = '00000000-0000-0000-0000-000000000001' and document = 'DEMO'");
  await client.query("commit");

  const hasCases = await hasTable("regulatory_cases");
  const hasLegal = await hasTable("legal_documents");
  const demoCases = await client.query(
    hasCases ? `
    select count(*)::int as count
    from regulatory_cases
    where source = 'DEMO'
       or infraction_number ilike '%DEMO%'
       or case_number between 'AC-2026-001' and 'AC-2026-010'
    ` : "select 0::int as count"
  );
  const demoLegal = await client.query(
    hasLegal ? `
    select count(*)::int as count
    from legal_documents
    where source_hash in ('demo-ciot-source', 'demo-piso-source', 'demo-processo-source')
       or number in ('CIOT-DEMO', 'PISO-DEMO', 'PROCESSO-DEMO')
    ` : "select 0::int as count"
  );
  console.log(JSON.stringify({ demoCases: demoCases.rows[0].count, demoLegal: demoLegal.rows[0].count }));
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  await client.end();
}
