const { actorId } = require("./_authz");

function getRequestIp(req) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "");
  return forwardedFor.split(",")[0].trim() || null;
}

function sanitizeAuditValue(value) {
  if (!value || typeof value !== "object") return value ?? null;
  const blockedKeys = new Set(["password", "token", "secret", "databaseUrl", "DATABASE_URL", "authorization", "sha256", "storageKey"]);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !blockedKeys.has(key))
      .map(([key, item]) => [key, typeof item === "string" && item.length > 160 ? `${item.slice(0, 160)}...` : item])
  );
}

async function recordAuditLog(client, req, { organizationId, userId = null, action, entity, entityId = null, oldValue = null, newValue = null }) {
  const effectiveUserId = userId || actorId(req);
  await client.query(
    `
    insert into audit_logs (organization_id, user_id, action, entity, entity_id, old_value, new_value, ip, user_agent)
    values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, nullif($8, '')::inet, $9)
    `,
    [
      organizationId,
      effectiveUserId,
      action,
      entity,
      entityId,
      JSON.stringify(sanitizeAuditValue(oldValue)),
      JSON.stringify(sanitizeAuditValue(newValue)),
      getRequestIp(req) || "",
      String(req.headers["user-agent"] || "").slice(0, 240)
    ]
  );
}

module.exports = { recordAuditLog, sanitizeAuditValue };
