const crypto = require("crypto");
const { organizationId, sendJson, withClient } = require("../_db");
const { hydrateAuthUser } = require("../_authz");

const iterations = 120000;
const keyLength = 32;
const digest = "sha256";

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method === "POST") return login(req, res);
  if (req.method === "GET") return me(req, res);
  if (req.method === "DELETE") return logout(req, res);
  return sendJson(res, 405, { error: "method_not_allowed" });
};

async function login(req, res) {
  const orgId = organizationId(req);
  const body = await readJson(req);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return sendJson(res, 400, { error: "validation_error", message: "E-mail e senha sao obrigatorios." });

  await withClient(res, async (client) => {
    await ensureAuthSchema(client);
    const result = await client.query(
      `
      select u.id, u.name, u.email, uc.password_hash, uc.password_salt, uc.status, r.code as role
      from users u
      join user_credentials uc on uc.user_id = u.id
      join organization_members om on om.user_id = u.id
      join roles r on r.id = om.role_id
      where u.email = $1 and om.organization_id = $2
      limit 1
      `,
      [email, orgId]
    );
    if (result.rowCount === 0 || result.rows[0].status !== "ACTIVE" || !verifyPassword(password, result.rows[0].password_salt, result.rows[0].password_hash)) {
      return sendJson(res, 401, { error: "invalid_credentials", message: "E-mail ou senha invalido." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    await client.query(
      "insert into user_sessions (user_id, token_hash, expires_at) values ($1, encode(digest($2, 'sha256'), 'hex'), now() + interval '12 hours')",
      [result.rows[0].id, token]
    );
    sendJson(res, 200, {
      token,
      user: { id: result.rows[0].id, name: result.rows[0].name, email: result.rows[0].email, role: result.rows[0].role }
    });
  });
}

async function me(req, res) {
  const orgId = organizationId(req);
  await withClient(res, async (client) => {
    await ensureAuthSchema(client);
    const userId = await hydrateAuthUser(client, req);
    if (!userId) return sendJson(res, 401, { error: "unauthorized", message: "Sessao invalida ou expirada." });
    const result = await client.query(
      `
      select u.id, u.name, u.email, r.code as role
      from organization_members om
      join users u on u.id = om.user_id
      join roles r on r.id = om.role_id
      where om.organization_id = $1 and u.id = $2
      limit 1
      `,
      [orgId, userId]
    );
    if (result.rowCount === 0) return sendJson(res, 401, { error: "unauthorized", message: "Usuario fora da organizacao." });
    sendJson(res, 200, { user: result.rows[0] });
  });
}

async function logout(req, res) {
  await withClient(res, async (client) => {
    await ensureAuthSchema(client);
    const authorization = String(req.headers.authorization || "");
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    if (token) await client.query("delete from user_sessions where token_hash = encode(digest($1, 'sha256'), 'hex')", [token]);
    sendJson(res, 200, { ok: true });
  });
}

async function ensureAuthSchema(client) {
  await client.query("create extension if not exists pgcrypto");
  await client.query(`
    create table if not exists user_credentials (
      user_id uuid primary key references users(id) on delete cascade,
      password_hash text not null,
      password_salt text not null,
      status text not null default 'ACTIVE',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await client.query(`
    create table if not exists user_sessions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      token_hash text not null unique,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    )
  `);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expectedHash, "hex"));
}

function readJson(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

module.exports.hashPassword = hashPassword;
module.exports.ensureAuthSchema = ensureAuthSchema;
