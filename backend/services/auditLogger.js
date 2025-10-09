const db = require('../config/db');

function getClientIP(req) {
  const xf = req.headers['x-forwarded-for'];
  if (xf) return String(xf).split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

async function enrichUserFromDB(user) {
  // If we have id but missing name/email/role, fetch from DB
  if (!user?.id) return user || {};
  const needsName = !user.name;
  const needsEmail = !user.email;
  const needsRole = !user.role;
  if (!needsName && !needsEmail && !needsRole) return user;

  try {
    const [rows] = await db.execute(
      `SELECT u.name, u.email, r.name AS role_name
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = ?
       LIMIT 1`,
      [user.id]
    );
    if (rows && rows[0]) {
      return {
        ...user,
        name: user.name || rows[0].name || null,
        email: user.email || rows[0].email || null,
        role: user.role || rows[0].role_name || null,
      };
    }
  } catch (e) {
    // Swallow enrichment errors silently to not break the flow
  }
  return user;
}

async function logAction(req, {
  action,
  resourceType = null,
  resourceId = null,
  description = ''
}) {
  try {
    const ip = getClientIP(req);
    let user = req.user || {};
    // Enrich missing name/email/role if needed
    user = await enrichUserFromDB(user);

    await db.execute(
      `INSERT INTO audit_logs
       (user_id, user_name, user_email, user_role, action, resource_type, resource_id, description, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        user.id || null,
        user.name || null,
        user.email || null,
        user.role || null,
        action,
        resourceType,
        resourceId,
        description,
        ip
      ]
    );
  } catch (e) {
    console.warn('Audit log failed:', e?.message || e);
  }
}

module.exports = { logAction };
