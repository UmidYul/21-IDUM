import express from 'express';
import db from '../database.js';

const router = express.Router();

// GET /api/announcements - from DB (sorted by date desc, optional limit)
router.get('/', async (req, res) => {
    try {
        const { limit } = req.query;
        await db.read();
        const list = Array.isArray(db.data.announcements) ? db.data.announcements : [];
        const sorted = list.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
        const limited = limit ? sorted.slice(0, Number(limit)) : sorted;
        res.json(limited);
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

export default router;
