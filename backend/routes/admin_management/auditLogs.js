const express = require('express');
const db = require('../../config/db');
const verifyToken = require('../../middlewares/verify_token');
const authorizeRole = require('../../middlewares/authorizeRole');

const router = express.Router();

// Normalize role filter from UI to DB values
function normalizeRoleFilter(role) {
  if (!role) return null;
  const r = String(role).toLowerCase();
  if (r === 'superadmin' || r === 'super admin') return 'super admin';
  if (r === 'admin') return 'admin';
  if (r === 'system') return 'system';
  return role;
}

function buildWhereClause({ startDate, endDate, role, action, search }) {
  const where = [];
  const params = [];

  if (startDate) {
    where.push('DATE(created_at) >= ?');
    params.push(startDate);
  }
  if (endDate) {
    where.push('DATE(created_at) <= ?');
    params.push(endDate);
  }
  if (role && role !== 'All') {
    const norm = normalizeRoleFilter(role);
    where.push('user_role = ?');
    params.push(norm);
  }
  if (action && action !== 'All') {
    where.push('action = ?');
    params.push(action);
  }
  if (search) {
    const like = `%${search}%`;
    where.push('(' + [
      'user_name LIKE ?',
      'user_email LIKE ?',
      'user_role LIKE ?',
      'action LIKE ?',
      'resource_type LIKE ?',
      'CAST(resource_id AS CHAR) LIKE ?',
      'description LIKE ?',
      'ip_address LIKE ?'
    ].join(' OR ') + ')');
    params.push(like, like, like, like, like, like, like, like);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return { clause, params };
}

// GET / - list audit logs with filters and pagination
router.get('/', verifyToken, authorizeRole(['super admin']), async (req, res) => {
  try {
    const {
      startDate = '',
      endDate = '',
      role = '',
      action = '',
      search = '',
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const perPage = Math.max(1, Math.min(1000, Number(limit) || 10));
    const offset = (pageNum - 1) * perPage;

    const { clause, params } = buildWhereClause({ startDate, endDate, role, action, search });

    const selectSql = `
      SELECT id, user_id, user_name, user_email, user_role, action, resource_type, resource_id,
             description, ip_address, created_at
      FROM audit_logs
      ${clause}
      ORDER BY created_at DESC
      LIMIT ${perPage} OFFSET ${offset}`;

    const countSql = `SELECT COUNT(*) AS total FROM audit_logs ${clause}`;

    const [rows] = await db.execute(selectSql, params);
    const [countRows] = await db.execute(countSql, params);

    res.json({
      items: rows,
      total: countRows[0]?.total || 0,
      page: pageNum,
      limit: perPage,
    });
  } catch (err) {
    console.error('AuditLogs list error:', err);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
});

// GET /actions - distinct action list
router.get('/actions', verifyToken, authorizeRole(['super admin']), async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT DISTINCT action FROM audit_logs ORDER BY action ASC');
    const actions = rows.map(r => r.action).filter(Boolean);
    res.json({ actions });
  } catch (err) {
    console.error('AuditLogs actions error:', err);
    res.status(500).json({ message: 'Failed to fetch actions' });
  }
});

// GET /export/csv - export filtered logs as CSV
router.get('/export/csv', verifyToken, authorizeRole(['super admin']), async (req, res) => {
  try {
    const { startDate = '', endDate = '', role = '', action = '', search = '' } = req.query;
    const { clause, params } = buildWhereClause({ startDate, endDate, role, action, search });

    const selectSql = `
      SELECT id, user_id, user_name, user_email, user_role, action, resource_type, resource_id,
             description, ip_address, created_at
      FROM audit_logs
      ${clause}
      ORDER BY created_at DESC`;

    const [rows] = await db.execute(selectSql, params);

    const headers = [
      'id','user_id','user_name','user_email','user_role','action','resource_type','resource_id','description','ip_address','created_at'
    ];
    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };
    const csv = [headers.join(',')]
      .concat(rows.map(r => headers.map(h => escape(r[h])).join(',')))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${new Date().toISOString().slice(0,10)}.csv`);
    res.send(csv);
  } catch (err) {
    console.error('AuditLogs export error:', err);
    res.status(500).json({ message: 'Failed to export audit logs' });
  }
});

// GET /:id - single log
router.get('/:id', verifyToken, authorizeRole(['super admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(
      `SELECT id, user_id, user_name, user_email, user_role, action, resource_type, resource_id,
              description, ip_address, created_at
       FROM audit_logs WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Audit log not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('AuditLogs getById error:', err);
    res.status(500).json({ message: 'Failed to fetch audit log' });
  }
});

module.exports = router;
