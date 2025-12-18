import express from 'express';
import db from '../database.js';

const router = express.Router();

// GET /api/announcements - from DB (sorted by date desc, optional limit)
router.get('/', async (req, res) => {
    try {
        console.log('🔔 Получен запрос на /api/announcements');
        const { limit } = req.query;
        await db.read();
        const list = Array.isArray(db.data.announcements) ? db.data.announcements : [];
        console.log(`📊 Найдено объявлений в БД: ${list.length}`);
        const sorted = list.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
        const limited = limit ? sorted.slice(0, Number(limit)) : sorted;
        console.log(`✅ Отправляю ${limited.length} объявлений`);
        res.json(limited);
    } catch (err) {
        console.error('❌ Ошибка при получении объявлений:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

export default router;
