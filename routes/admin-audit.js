import express from 'express';
import db from '../database.js';
import { requireAuth } from './auth-basic.js';

const router = express.Router();
const AUDIT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ ok: false, error: 'Forbidden: admin role required' });
    }
    next();
}

// GET /api/admin/audit/logins - Recent login events
router.get('/logins', requireAuth, requireAdmin, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        await db.read();
        db.data.auditLog ||= [];
        const cutoff = Date.now() - AUDIT_RETENTION_MS;
        const before = db.data.auditLog.length;
        db.data.auditLog = db.data.auditLog.filter(e => {
            const ts = new Date(e.at).getTime();
            return !Number.isNaN(ts) && ts >= cutoff;
        });
        if (db.data.auditLog.length !== before) {
            await db.write();
        }
        const log = (db.data.auditLog || []).filter(e => e.type === 'login')
            .sort((a, b) => new Date(b.at) - new Date(a.at))
            .slice(0, limit)
            .map(e => ({
                ...e,
                ip: e.ip === '::1' ? '127.0.0.1' : e.ip
            }));
        res.json({ ok: true, count: log.length, logins: log });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

export default router;
