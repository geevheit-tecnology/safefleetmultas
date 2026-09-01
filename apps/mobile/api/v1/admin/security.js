const { organizationId, sendJson, withClient } = require("../../_db");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method !== "GET") return sendJson(res, 405, { error: "method_not_allowed" });

  const orgId = organizationId(req);
  await withClient(res, async (client) => {
    const [org, users, roles, permissions, audit] = await Promise.all([
      client.query("select id, name, coalesce(document, '') as document from organizations where id = $1", [orgId]),
      client.query(
        `
        select u.name, u.email, r.code as role
        from organization_members om
        join users u on u.id = om.user_id
        join roles r on r.id = om.role_id
        where om.organization_id = $1
        order by r.code, u.name
        `,
        [orgId]
      ),
      client.query(
        `
        select r.code, r.name, count(rp.permission_id)::int as "permissionCount"
        from roles r
        left join role_permissions rp on rp.role_id = r.id
        where r.organization_id = $1
        group by r.id, r.code, r.name
        order by r.code
        `,
        [orgId]
      ),
      client.query(
        `
        select r.code as role, p.code as permission, p.description
        from roles r
        join role_permissions rp on rp.role_id = r.id
        join permissions p on p.id = rp.permission_id
        where r.organization_id = $1
        order by r.code, p.code
        `,
        [orgId]
      ),
      client.query(
        `
        select action, entity, to_char(created_at, 'DD/MM HH24:MI') as "createdAt", coalesce(user_agent, '') as "userAgent"
        from audit_logs
        where organization_id = $1
        order by created_at desc
        limit 12
        `,
        [orgId]
      )
    ]);

    sendJson(res, 200, {
      organization: org.rows[0] || null,
      users: users.rows.map((user, index) => ({
        id: `user-${index + 1}`,
        name: user.name,
        email: maskEmail(user.email),
        role: user.role
      })),
      userCount: users.rowCount,
      roles: roles.rows,
      permissions: permissions.rows,
      audit: audit.rows.map((item) => ({
        action: item.action,
        entity: item.entity,
        createdAt: item.createdAt,
        userAgent: item.userAgent ? "registrado" : "nao informado"
      })),
      controls: {
        tenantIsolation: "X-Organization-Id + organization_members",
        mutationAudit: "audit_logs append-only + case_events/status history",
        deploymentProtection: "public preview authorized",
        productionAuth: "pending external identity provider"
      }
    });
  });
};

function maskEmail(email) {
  const [name, domain] = String(email || "").split("@");
  if (!name || !domain) return "nao informado";
  return `${name.slice(0, 2)}***@${domain}`;
}
