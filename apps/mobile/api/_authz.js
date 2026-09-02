const DEMO_ADMIN_USER_ID = "00000000-0000-0000-0000-000000000104";

const ACTION_PERMISSIONS = {
  list_cases: "cases.read",
  read_case: "cases.read",
  create_case: "cases.create",
  update_case: "cases.update",
  close_case: "cases.close",
  upload_document: "documents.upload",
  read_legislation: "legislation.read",
  manage_legislation: "legislation.manage",
  read_risk: "risk.read",
  manage_risk: "risk.manage",
  read_reports: "reports.read",
  manage_users: "users.manage",
  read_audit: "audit.read"
};

function actorId(req) {
  if (req.authUserId) return req.authUserId;
  if (req.headers["x-user-id"]) return req.headers["x-user-id"];
  if (process.env.ALLOW_DEMO_AUTH === "true") return req.headers["x-demo-user-id"] || process.env.DEMO_USER_ID || DEMO_ADMIN_USER_ID;
  return null;
}

async function authorize(client, req, orgId, permission) {
  await hydrateAuthUser(client, req);
  const userId = actorId(req);
  if (!userId) {
    return {
      ok: false,
      userId: null,
      status: 401,
      error: "unauthorized",
      message: "Login obrigatorio."
    };
  }
  const result = await client.query(
    `
    select u.id, u.name, r.code as role, p.code as permission
    from organization_members om
    join users u on u.id = om.user_id
    join roles r on r.id = om.role_id
    join role_permissions rp on rp.role_id = r.id
    join permissions p on p.id = rp.permission_id
    where om.organization_id = $1
      and om.user_id = $2
      and p.code = $3
    limit 1
    `,
    [orgId, userId, permission]
  );

  if (result.rowCount === 0) {
    return {
      ok: false,
      userId,
      status: 403,
      error: "forbidden",
      message: `Permissao ${permission} requerida.`
    };
  }

  return {
    ok: true,
    userId,
    role: result.rows[0].role,
    permission
  };
}

async function hydrateAuthUser(client, req) {
  if (req.authUserId) return req.authUserId;
  const authorization = String(req.headers.authorization || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  try {
    const result = await client.query(
      `
      select user_id
      from user_sessions
      where token_hash = encode(digest($1, 'sha256'), 'hex')
        and expires_at > now()
      limit 1
      `,
      [token]
    );
    if (result.rowCount > 0) {
      req.authUserId = result.rows[0].user_id;
      return req.authUserId;
    }
  } catch {
    return null;
  }
  return null;
}

module.exports = { ACTION_PERMISSIONS, DEMO_ADMIN_USER_ID, actorId, authorize, hydrateAuthUser };
