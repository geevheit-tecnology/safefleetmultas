const { organizationId, sendJson, withClient } = require("../../_db");
const { ACTION_PERMISSIONS, actorId, authorize } = require("../../_authz");
const { recordAuditLog } = require("../../_auditLogger");
const { maskEmail, privacyNotice } = require("../../_privacy");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  if (req.method === "GET") return getSecurity(req, res);
  if (req.method === "POST") return saveUser(req, res);
  if (req.method === "DELETE") return deleteUser(req, res);
  return sendJson(res, 405, { error: "method_not_allowed" });
};

async function getSecurity(req, res) {
  const orgId = organizationId(req);
  await withClient(res, async (client) => {
    const authz = await authorize(client, req, orgId, ACTION_PERMISSIONS.manage_users);
    if (!authz.ok) return sendJson(res, authz.status, { error: authz.error, message: authz.message });
    const [org, users, roles, permissions, audit] = await Promise.all([
      client.query("select id, name, coalesce(document, '') as document from organizations where id = $1", [orgId]),
      client.query(
        `
        select u.id, u.name, u.email, r.code as role
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
        id: user.id || `user-${index + 1}`,
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
        productionAuth: "pending external identity provider",
        privacy: privacyNotice()
      }
    });
  });
}

async function saveUser(req, res) {
  const orgId = organizationId(req);
  const body = await readJson(req);
  const mode = String(body.mode || "create_user");
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const roleCode = String(body.role || (mode === "first_admin" ? "ADMIN" : "")).trim().toUpperCase();

  if (!name || !email || !isEmail(email)) {
    return sendJson(res, 400, { error: "validation_error", message: "Nome e e-mail valido sao obrigatorios." });
  }
  if (mode === "first_admin" && roleCode !== "ADMIN") {
    return sendJson(res, 400, { error: "validation_error", message: "Primeiro acesso sempre cria um administrador." });
  }

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      if (mode === "first_admin") {
        const hasMembers = await client.query("select 1 from organization_members where organization_id = $1 limit 1", [orgId]);
        if (hasMembers.rowCount > 0) {
          await client.query("rollback");
          return sendJson(res, 403, { error: "first_access_closed", message: "Primeiro acesso ja foi realizado. Somente admin pode criar usuarios." });
        }
        await ensureOrganization(client, orgId);
        await ensureRbac(client, orgId);
      } else {
        const authz = await authorize(client, req, orgId, ACTION_PERMISSIONS.manage_users);
        if (!authz.ok || authz.role !== "ADMIN") {
          await client.query("rollback");
          return sendJson(res, authz.status || 403, { error: "forbidden", message: "Somente ADMIN pode criar usuarios." });
        }
        await ensureRbac(client, orgId);
      }

      const role = await client.query("select id, code from roles where organization_id = $1 and code = $2 limit 1", [orgId, roleCode]);
      if (role.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 400, { error: "invalid_role", message: "Perfil de acesso invalido." });
      }

      const user = await client.query(
        `
        insert into users (email, name)
        values ($1, $2)
        on conflict (email) do update set name = excluded.name, updated_at = now()
        returning id, email, name
        `,
        [email, name]
      );

      await client.query(
        `
        insert into organization_members (organization_id, user_id, role_id)
        values ($1, $2, $3)
        on conflict (organization_id, user_id) do update set role_id = excluded.role_id
        `,
        [orgId, user.rows[0].id, role.rows[0].id]
      );

      await recordAuditLog(client, req, {
        organizationId: orgId,
        userId: mode === "first_admin" ? user.rows[0].id : null,
        action: mode === "first_admin" ? "FIRST_ADMIN_CREATED" : "USER_CREATED",
        entity: "users",
        entityId: user.rows[0].id,
        newValue: { email, name, role: roleCode }
      });

      await client.query("commit");
      sendJson(res, mode === "first_admin" ? 201 : 200, { ok: true, user: { id: user.rows[0].id, name, email: maskEmail(email), role: roleCode } });
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function deleteUser(req, res) {
  const orgId = organizationId(req);
  const userId = String(new URL(req.url, "http://local").searchParams.get("userId") || "").trim();
  if (!userId) return sendJson(res, 400, { error: "validation_error", message: "Usuario obrigatorio." });

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      const authz = await authorize(client, req, orgId, ACTION_PERMISSIONS.manage_users);
      if (!authz.ok || authz.role !== "ADMIN") {
        await client.query("rollback");
        return sendJson(res, authz.status || 403, { error: "forbidden", message: "Somente ADMIN pode excluir usuarios." });
      }
      if (userId === actorId(req)) {
        await client.query("rollback");
        return sendJson(res, 409, { error: "cannot_delete_self", message: "Admin nao pode excluir o proprio acesso." });
      }

      const current = await client.query(
        `
        select u.id, u.email, u.name, r.code as role
        from organization_members om
        join users u on u.id = om.user_id
        join roles r on r.id = om.role_id
        where om.organization_id = $1 and om.user_id = $2
        for update
        `,
        [orgId, userId]
      );
      if (current.rowCount === 0) {
        await client.query("rollback");
        return sendJson(res, 404, { error: "not_found" });
      }

      if (current.rows[0].role === "ADMIN") {
        const admins = await client.query(
          `
          select count(*)::int as total
          from organization_members om
          join roles r on r.id = om.role_id
          where om.organization_id = $1 and r.code = 'ADMIN'
          `,
          [orgId]
        );
        if (admins.rows[0].total <= 1) {
          await client.query("rollback");
          return sendJson(res, 409, { error: "last_admin", message: "Nao e permitido excluir o ultimo administrador." });
        }
      }

      await client.query("delete from organization_members where organization_id = $1 and user_id = $2", [orgId, userId]);
      await recordAuditLog(client, req, {
        organizationId: orgId,
        action: "USER_REMOVED",
        entity: "users",
        entityId: userId,
        oldValue: { email: current.rows[0].email, name: current.rows[0].name, role: current.rows[0].role }
      });
      await client.query("commit");
      sendJson(res, 200, { ok: true });
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function ensureOrganization(client, orgId) {
  await client.query(
    "insert into organizations (id, name, document) values ($1, 'SafeFleet', 'FIRST_ACCESS') on conflict (id) do nothing",
    [orgId]
  );
}

async function ensureRbac(client, orgId) {
  await client.query(
    `
    insert into permissions (code, description)
    values
      ('cases.read', 'Ler prontuarios'),
      ('cases.create', 'Criar prontuarios'),
      ('cases.update', 'Atualizar prontuarios'),
      ('cases.close', 'Encerrar prontuarios'),
      ('documents.read', 'Ler documentos'),
      ('documents.upload', 'Enviar documentos'),
      ('legislation.read', 'Ler legislacao'),
      ('legislation.manage', 'Gerenciar legislacao'),
      ('risk.read', 'Ler risco'),
      ('risk.manage', 'Gerenciar risco'),
      ('reports.read', 'Ler relatorios'),
      ('audit.read', 'Ler auditoria'),
      ('users.manage', 'Gerenciar usuarios')
    on conflict (code) do update set description = excluded.description
    `
  );
  await client.query(
    `
    insert into roles (organization_id, code, name)
    values
      ($1, 'ADMIN', 'Administrador'),
      ($1, 'MANAGER', 'Gestor'),
      ($1, 'OPERATOR', 'Operador'),
      ($1, 'LEGAL', 'Juridico'),
      ($1, 'VIEWER', 'Leitura')
    on conflict (organization_id, code) do update set name = excluded.name
    `,
    [orgId]
  );
  await client.query(
    `
    insert into role_permissions (role_id, permission_id)
    select r.id, p.id
    from roles r
    join permissions p on p.code = any (
      case r.code
        when 'ADMIN' then array['cases.read','cases.create','cases.update','cases.close','documents.read','documents.upload','legislation.read','legislation.manage','risk.read','risk.manage','reports.read','audit.read','users.manage']
        when 'MANAGER' then array['cases.read','cases.update','documents.read','legislation.read','risk.read','reports.read','audit.read']
        when 'OPERATOR' then array['cases.read','cases.create','cases.update','documents.read','documents.upload']
        when 'LEGAL' then array['cases.read','cases.update','cases.close','documents.read','documents.upload','legislation.read','risk.read','risk.manage']
        when 'VIEWER' then array['cases.read','documents.read','reports.read']
        else array[]::text[]
      end
    )
    where r.organization_id = $1
    on conflict do nothing
    `,
    [orgId]
  );
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

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
