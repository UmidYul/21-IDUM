import express from 'express';
import crypto from 'crypto';
import db from '../database.js';
import bcrypt from 'bcryptjs';

const router = express.Router();
const AUDIT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

// Helpers для работы с сессиями в БД
async function createSession(token, user) {
    await db.read();
    if (!db.data.sessions) db.data.sessions = [];
    db.data.sessions.push({
        token,
        userId: user.id,
        username: user.username,
        role: user.role,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 дней
    });
    await db.write();
}

async function getSession(token) {
    await db.read();
    if (!db.data.sessions) db.data.sessions = [];
    const session = db.data.sessions.find(s => s.token === token);
    if (!session) return null;

    // Проверка срока действия
    if (new Date(session.expiresAt) < new Date()) {
        // Сессия истекла, удаляем
        await deleteSession(token);
        return null;
    }

    return { id: session.userId, username: session.username, role: session.role };
}

async function deleteSession(token) {
    await db.read();
    if (!db.data.sessions) db.data.sessions = [];
    db.data.sessions = db.data.sessions.filter(s => s.token !== token);
    await db.write();
}

// Helpers
function parseCookies(cookieHeader = '') {
    const out = {};
    cookieHeader.split(';').forEach(pair => {
        const idx = pair.indexOf('=');
        if (idx > -1) {
            const k = pair.slice(0, idx).trim();
            const v = pair.slice(idx + 1).trim();
            out[k] = decodeURIComponent(v);
        }
    });
    return out;
}

function setAuthCookie(res, token) {
    // 7 days
    const maxAge = 7 * 24 * 60 * 60;
    const flags = [
        `Path=/`,
        `HttpOnly`,
        `SameSite=Strict`,
        `Max-Age=${maxAge}`,
    ];
    // Add Secure flag in production (requires HTTPS)
    if (process.env.NODE_ENV === 'production') {
        flags.push('Secure');
    }
    res.setHeader('Set-Cookie', `auth_token=${encodeURIComponent(token)}; ${flags.join('; ')}`);
}

function clearAuthCookie(res) {
    res.setHeader('Set-Cookie', 'auth_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
}

function getToken(req) {
    // Header has priority for API clients
    const header = req.headers['x-auth-token'] || req.headers['authorization'];
    if (header) {
        const v = Array.isArray(header) ? header[0] : header;
        const m = /^Bearer\s+(.+)$/i.exec(v);
        return m ? m[1] : v;
    }
    const cookieHeader = req.headers.cookie || '';
    const cookies = parseCookies(cookieHeader);
    const token = cookies['auth_token'];
    return token;
}

export async function requireAuth(req, res, next) {
    const token = getToken(req);
    const user = await getSession(token);
    if (!user) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
    req.user = user;
    next();
}

// For HTML pages: redirect to /admin/login if not authorized
export async function requireAuthPage(req, res, next) {
    const token = getToken(req);
    const user = await getSession(token);
    if (!user) {
        return res.redirect('/admin/login');
    }
    req.user = user;
    next();
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ ok: false, error: 'username and password required' });
    }

    // Проверка по БД
    await db.read();
    const user = db.data.users.find(u => u.username === username);

    if (!user) {
        return res.status(401).json({ ok: false, error: 'invalid credentials' });
    }

    let ok = false;
    const stored = user.password || '';
    if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
        ok = bcrypt.compareSync(password, stored);
    } else {
        ok = stored === password;
        if (ok) {
            user.password = bcrypt.hashSync(password, 10);
        }
    }
    if (!ok) {
        return res.status(401).json({ ok: false, error: 'invalid credentials' });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const sessionUser = { id: user.id, username: user.username, role: user.role };

    // Сохранить сессию в БД
    await createSession(token, sessionUser);

    // Обновить lastLoginAt
    user.lastLoginAt = new Date().toISOString();
    // Логирование входа в аудит
    try {
        await db.read();
        db.data.auditLog ||= [];
        const cutoff = Date.now() - AUDIT_RETENTION_MS;
        db.data.auditLog = db.data.auditLog.filter(e => {
            const ts = new Date(e.at).getTime();
            return !Number.isNaN(ts) && ts >= cutoff;
        });
        const forwarded = req.headers['x-forwarded-for']?.split(',')[0]?.trim();
        const realIp = req.headers['x-real-ip'];
        const connIp = req.connection?.remoteAddress;
        const rawIp = forwarded || realIp || connIp || req.ip || 'unknown';
        const clientIp = (rawIp === '::1') ? '127.0.0.1' : rawIp;
        const ua = req.headers['user-agent'] || '';
        db.data.auditLog.push({
            id: crypto.randomUUID(),
            type: 'login',
            userId: sessionUser.id,
            username: sessionUser.username,
            role: sessionUser.role,
            ip: clientIp,
            userAgent: ua,
            at: new Date().toISOString()
        });
        // Ограничим размер лога до 1000 записей
        if (db.data.auditLog.length > 1000) {
            db.data.auditLog = db.data.auditLog.slice(-1000);
        }
    } catch (e) { /* ignore audit errors */ }
    await db.write();

    setAuthCookie(res, token);
    res.json({ ok: true, token, user: sessionUser });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    const token = getToken(req);
    if (token) await deleteSession(token);
    clearAuthCookie(res);
    res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
    const token = getToken(req);
    const user = await getSession(token);
    if (!user) {
        return res.status(401).json({ ok: false });
    }
    res.json({ ok: true, user });
});

export default router;

