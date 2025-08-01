const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../../config/db');

const router = express.Router();

// Helper to map DB rows to response objects
const mapUserRow = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone_number: row.phone_number,
  role: row.role,
  is_active: !!row.is_active,
  created_at: row.created_at,
  gender: row.gender || ''
});

// GET /api/superadmin  -> list admins with optional filters
router.get('/', async (req, res) => {
  const { status, search = '', page = 1, limit = 10 } = req.query;
  const off = (page - 1) * limit;

  let where = 'ur.role_id IN (SELECT id FROM roles WHERE name IN (?, ?))';
  const params = ['admin', 'super admin'];

  if (status === 'active' || status === 'inactive') {
    where += ' AND u.is_active = ?';
    params.push(status === 'active' ? 1 : 0);
  }

  if (search) {
    where += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone_number LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  try {
    const [rows] = await db.execute(
      `SELECT u.*, r.name AS role FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE ${where}
       ORDER BY u.created_at DESC
       LIMIT ${Number(limit)} OFFSET ${Number(off)}`,
      params
    );


    const [countRows] = await db.execute(
      `SELECT COUNT(*) total FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE ${where}`,
      params
    );

    res.json({
      total: countRows[0].total,
      page: Number(page),
      limit: Number(limit),
      admins: rows.map(mapUserRow),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/superadmin/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.execute(
      `SELECT u.*, r.name AS role FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE u.id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Admin not found' });
    res.json(mapUserRow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/superadmin  -> create a new admin
router.post('/', async (req, res) => {
  const { name, email, phone, is_active = 1, role, gender } = req.body;
  console.log(req.body);
  if (!name || !email) {
    return res.status(400).json({ message: 'name, email required' });
  }
  const defaultPassword = 'User@123';
  try {
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [userResult] = await conn.execute(
        'INSERT INTO users (name, email, password, phone_number, is_active, gender, created_at) VALUES (?,?,?,?,?,?,NOW())',
        [name, email, hashedPassword, phone, is_active, gender]
      );
      const userId = userResult.insertId;
      // find admin role id
      const [roleRows] = await conn.execute('SELECT id FROM roles WHERE name = ? LIMIT 1', [role]);
      const roleId = roleRows.length ? roleRows[0].id : 3; // fallback 3
      await conn.execute('INSERT INTO user_roles (user_id, role_id) VALUES (?,?)', [userId, roleId]);
      await conn.commit();
      res.status(201).json({ id: userId });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/superadmin/:id  -> update admin
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, password, role, status, gender } = req.body;
  console.log("put body",req.body);
  const is_active = status === 'Active' ? 1 : 0;
  if (!name && !email && !phone && !password && !role && !status) {
    return res.status(400).json({ message: 'Nothing to update' });
  }
  try {
    const fields = [];
    const params = [];
    if (name) { fields.push('name = ?'); params.push(name); }
    if (email) { fields.push('email = ?'); params.push(email); }
    if (phone  ) { fields.push('phone_number = ?'); params.push(phone); }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      fields.push('password = ?');
      params.push(hashed);
    }
    if (status) { fields.push('is_active = ?'); params.push(is_active); }
    if (gender) { fields.push('gender = ?'); params.push(gender); }
    params.push(id);
    console.log("params",params);   
    // update user basic fields if provided
    if (fields.length) {
      await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    // update role if provided
    if (role) {
      const [roleRows] = await db.execute('SELECT id FROM roles WHERE name = ? LIMIT 1', [role]);
      if (roleRows.length) {
        const roleId = roleRows[0].id;
        await db.execute('UPDATE user_roles SET role_id = ? WHERE user_id = ?', [roleId, id]);
      }
    }

    res.json({ message: 'Updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/superadmin/:id  -> delete admin
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('DELETE FROM user_roles WHERE user_id = ?', [id]);
      await conn.execute('DELETE FROM users WHERE id = ?', [id]);
      await conn.commit();
      res.json({ message: 'Deleted' });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/superadmin/:id/status  -> activate/deactivate
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // expected boolean or 0/1
  try {
    await db.execute('UPDATE users SET is_active = ? WHERE id = ?', [status ? 1 : 0, id]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
