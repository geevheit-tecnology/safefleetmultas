const { Client } = require("pg");

const rateBuckets = new Map();
const MAX_REQUESTS_PER_MINUTE = Number(process.env.API_RATE_LIMIT_PER_MINUTE || 120);
const MAX_BODY_BYTES = Number(process.env.API_MAX_BODY_BYTES || 2_000_000);

function getClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL nao configurada");
  }
  return new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

function organizationId(req) {
  return req.headers["x-organization-id"] || process.env.DEMO_ORGANIZATION_ID || "00000000-0000-0000-0000-000000000001";
}

function sendJson(res, status, body) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Organization-Id, X-User-Id, X-Demo-User-Id");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Request-Id", res.getHeader("X-Request-Id") || cryptoRandomId());
  res.status(status).send(JSON.stringify(body));
}

async function withClient(res, handler) {
  if (!enforceRequestGuards(res.req || { headers: {}, socket: {} }, res)) return;
  const client = getClient();
  await client.connect();
  try {
    return await handler(client);
  } catch (error) {
    sendJson(res, 500, { error: "internal_error", message: error.message });
  } finally {
    await client.end();
  }
}

function enforceRequestGuards(req, res) {
  const length = Number(req.headers["content-length"] || 0);
  if (length > MAX_BODY_BYTES) {
    sendJson(res, 413, { error: "payload_too_large", message: "Limite de tamanho excedido." });
    return false;
  }

  const key = `${req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "local"}:${Math.floor(Date.now() / 60000)}`;
  const current = (rateBuckets.get(key) || 0) + 1;
  rateBuckets.set(key, current);
  if (current > MAX_REQUESTS_PER_MINUTE) {
    sendJson(res, 429, { error: "rate_limited", message: "Limite temporario de requisicoes excedido." });
    return false;
  }
  return true;
}

function cryptoRandomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

module.exports = { organizationId, sendJson, withClient };
