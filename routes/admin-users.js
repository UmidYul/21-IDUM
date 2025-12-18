import express from 'express';
import crypto from 'crypto';
import db from '../database.js';
import { requireAuth } from './auth-basic.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Roles: 'admin' (Администратор — все права) and 'editor' (Редактор — базовые операции)
const ALLOWED_ROLES = ['admin', 'editor'];

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Forbidden: admin role required' });
    }
    next();
}

function sanitizeUser(u) {
    if (!u) return null;
    const { password, ...rest } = u;
    return rest;
}

// GET /api/admin/users
router.get('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        await db.read();
        const users = (db.data.users || []).map(sanitizeUser);
        res.json({ ok: true, users, count: users.length });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/admin/users/:id
router.get('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await db.read();
        const user = (db.data.users || []).find(u => u.id === req.params.id);
        if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
        res.json({ ok: true, user: sanitizeUser(user) });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/admin/users
router.post('/', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { username, password, role, displayName, email, phone } = req.body || {};
        if (!username || !password || !role) {
            return res.status(400).json({ ok: false, error: 'username, password, role are required' });
        }
        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({ ok: false, error: 'Invalid role' });
        }

        await db.read();
        db.data.users ||= [];
        if (db.data.users.find(u => u.username === username)) {
            return res.status(409).json({ ok: false, error: 'Username already exists' });
        }

        const user = {
            id: crypto.randomUUID(),
            username,
            password: bcrypt.hashSync(password, 10),
            role,
            displayName: displayName || username,
            email: email || '',
            phone: phone || '',
            createdAt: new Date().toISOString(),
            lastLoginAt: null
        };
        db.data.users.push(user);
        await db.write();
        res.status(201).json({ ok: true, user: sanitizeUser(user) });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// PATCH /api/admin/users/:id
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { username, password, role, displayName, email, phone } = req.body || {};

        await db.read();
        const idx = (db.data.users || []).findIndex(u => u.id === req.params.id);
        if (idx === -1) return res.status(404).json({ ok: false, error: 'User not found' });

        const user = db.data.users[idx];

        if (username) {
            const exists = db.data.users.find(u => u.username === username && u.id !== user.id);
            if (exists) return res.status(409).json({ ok: false, error: 'Username already exists' });
            user.username = username;
        }
        if (typeof password === 'string' && password.length > 0) {
            user.password = bcrypt.hashSync(password, 10);
        }
        if (role) {
            if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ ok: false, error: 'Invalid role' });
            user.role = role;
        }
        if (displayName) user.displayName = displayName;
        if (email !== undefined) user.email = email;
        if (phone !== undefined) user.phone = phone;

        user.updatedAt = new Date().toISOString();
        db.data.users[idx] = user;
        await db.write();

        res.json({ ok: true, user: sanitizeUser(user) });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// DELETE /api/admin/users/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        await db.read();
        const users = db.data.users || [];
        const user = users.find(u => u.id === req.params.id);
        if (!user) return res.status(404).json({ ok: false, error: 'User not found' });

        // Safety: prevent deleting yourself to avoid lockout
        if (req.user?.id === user.id || req.user?.username === user.username) {
            return res.status(400).json({ ok: false, error: 'Cannot delete your own account' });
        }

        db.data.users = users.filter(u => u.id !== req.params.id);
        await db.write();
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

export default router;
