const { Client } = require("pg");

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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Organization-Id");
  res.status(status).send(JSON.stringify(body));
}

async function withClient(res, handler) {
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

module.exports = { organizationId, sendJson, withClient };
