import express from 'express';
import db from '../database.js';
import crypto from 'crypto';
import { validate, announcementSchema } from '../middleware/validation.js';

const router = express.Router();

// Middleware для проверки авторизации (упрощенный вариант)
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
    // В реальном проекте здесь проверка токена
    next();
}

// GET all announcements (admin view with unpublished)
router.get('/', requireAuth, async (req, res) => {
    try {
        await db.read();
        const list = Array.isArray(db.data.announcements) ? db.data.announcements : [];
        const sorted = list.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(sorted);
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST create announcement
router.post('/', requireAuth, validate(announcementSchema), async (req, res) => {
    try {
        const { title_ru, title_uz, description_ru, description_uz, type, date } = req.body;

        await db.read();

        const newAnnouncement = {
            id: crypto.randomUUID(),
            title_ru: title_ru.trim(),
            title_uz: title_uz.trim(),
            description_ru: description_ru.trim(),
            description_uz: description_uz.trim(),
            type,
            date: date || '',
            location: location?.trim() || '',
            link: link?.trim() || '',
            status: status || 'published',
            publishAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'admin', // В реальном проекте - ID из токена
            updatedBy: 'admin'
        };

        db.data.announcements = db.data.announcements || [];
        db.data.announcements.push(newAnnouncement);
        await db.write();

        res.json({ ok: true, announcement: newAnnouncement });
    } catch (err) {
        console.error('Error creating announcement:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// PUT update announcement
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, text, type, date, location, link, status } = req.body;

        await db.read();

        const index = db.data.announcements.findIndex(item => item.id === id);
        if (index === -1) {
            return res.status(404).json({ ok: false, error: 'Announcement not found' });
        }

        const existing = db.data.announcements[index];

        db.data.announcements[index] = {
            ...existing,
            title: title?.trim() || existing.title,
            text: text?.trim() || existing.text,
            type: type || existing.type,
            date: date || existing.date,
            location: location?.trim() || existing.location || '',
            link: link?.trim() || existing.link || '',
            status: status || existing.status,
            updatedAt: new Date().toISOString(),
            updatedBy: 'admin'
        };

        await db.write();

        res.json({ ok: true, announcement: db.data.announcements[index] });
    } catch (err) {
        console.error('Error updating announcement:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// DELETE announcement
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await db.read();

        const index = db.data.announcements.findIndex(item => item.id === id);
        if (index === -1) {
            return res.status(404).json({ ok: false, error: 'Announcement not found' });
        }

        db.data.announcements.splice(index, 1);
        await db.write();

        res.json({ ok: true });
    } catch (err) {
        console.error('Error deleting announcement:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

export default router;
