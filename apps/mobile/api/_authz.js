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
  return req.headers["x-user-id"] || req.headers["x-demo-user-id"] || process.env.DEMO_USER_ID || DEMO_ADMIN_USER_ID;
}

async function authorize(client, req, orgId, permission) {
  const userId = actorId(req);
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

module.exports = { ACTION_PERMISSIONS, DEMO_ADMIN_USER_ID, actorId, authorize };
