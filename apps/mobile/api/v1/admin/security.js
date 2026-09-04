const crypto = require("crypto");
const { organizationId, sendJson, withClient } = require("../../_db");
const { ACTION_PERMISSIONS, actorId, authorize, hydrateAuthUser } = require("../../_authz");
const { recordAuditLog } = require("../../_auditLogger");
const { maskEmail, privacyNotice } = require("../../_privacy");

const iterations = 120000;
const keyLength = 32;
const digest = "sha256";

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  const url = new URL(req.url, "http://local");
  if (req.method === "GET" && url.searchParams.get("auth") === "me") return me(req, res);
  if (req.method === "POST" && url.searchParams.get("auth") === "login") return login(req, res);
  if (req.method === "DELETE" && url.searchParams.get("auth") === "logout") return logout(req, res);
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

async function saveUser(req, res) {
  const orgId = organizationId(req);
  const body = await readJson(req);
  const mode = String(body.mode || "create_user");
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const roleCode = String(body.role || (mode === "first_admin" ? "ADMIN" : "")).trim().toUpperCase();

  if (!name || !email || !isEmail(email)) {
    return sendJson(res, 400, { error: "validation_error", message: "Nome e e-mail valido sao obrigatorios." });
  }
  if (!isStrongPassword(password)) {
    return sendJson(res, 400, { error: "weak_password", message: "Senha deve ter pelo menos 8 caracteres, letra e numero." });
  }
  if (mode === "first_admin" && roleCode !== "ADMIN") {
    return sendJson(res, 400, { error: "validation_error", message: "Primeiro acesso sempre cria um administrador." });
  }

  await withClient(res, async (client) => {
    await client.query("begin");
    try {
      await ensureAuthSchema(client);
      if (mode === "first_admin") {
        const hasCredentials = await client.query(
          `
          select 1
          from organization_members om
          join user_credentials uc on uc.user_id = om.user_id
          where om.organization_id = $1 and uc.status = 'ACTIVE'
          limit 1
          `,
          [orgId]
        );
        if (hasCredentials.rowCount > 0) {
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
      const credential = hashPassword(password);
      await client.query(
        `
        insert into user_credentials (user_id, password_hash, password_salt, status)
        values ($1, $2, $3, 'ACTIVE')
        on conflict (user_id) do update
        set password_hash = excluded.password_hash,
            password_salt = excluded.password_salt,
            status = 'ACTIVE',
            updated_at = now()
        `,
        [user.rows[0].id, credential.hash, credential.salt]
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

async function ensureAuthSchema(client) {
  await client.query(`create extension if not exists "pgcrypto"`);
  await client.query(
    `
    create table if not exists user_credentials (
      user_id uuid primary key references users(id) on delete cascade,
      password_hash text not null,
      password_salt text not null,
      status text not null default 'ACTIVE',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
    `
  );
  await client.query(
    `
    create table if not exists user_sessions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      token_hash text not null unique,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    )
    `
  );
  await client.query("create index if not exists idx_user_sessions_user on user_sessions(user_id)");
  await client.query("create index if not exists idx_user_sessions_expires on user_sessions(expires_at)");
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

function isStrongPassword(value) {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expectedHash, "hex"));
}
