import express from 'express';
import crypto from 'crypto';
import db from '../database.js';
import { requireAuth } from './auth-basic.js';
import { validate, newsSchema } from '../middleware/validation.js';

const router = express.Router();

// Все роуты защищены requireAuth
router.use(requireAuth);

// GET /api/admin/news - Список всех новостей (включая черновики)
router.get('/', async (req, res) => {
    try {
        await db.read();
        const news = db.data.news || [];

        // Сортировка по дате создания (новые первые)
        const sorted = [...news].sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.json({ ok: true, news: sorted });
    } catch (error) {
        console.error('Ошибка получения новостей:', error);
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});

// GET /api/admin/news/:id - Получить одну новость
router.get('/:id', async (req, res) => {
    try {
        await db.read();
        const newsItem = db.data.news.find(n => n.id === req.params.id);

        if (!newsItem) {
            return res.status(404).json({ ok: false, error: 'News not found' });
        }

        res.json({ ok: true, news: newsItem });
    } catch (error) {
        console.error('Ошибка получения новости:', error);
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});

// POST /api/admin/news - Создать новость
router.post('/', validate(newsSchema), async (req, res) => {
    try {
        const { title_ru, title_uz, body_ru, body_uz, coverUrl, status } = req.body;

        await db.read();

        // Генерация slug из заголовка
        const slug = title_ru
            .toLowerCase()
            .replace(/[^\u0400-\u04FFa-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .substring(0, 100) + '-' + Date.now();

        const newsItem = {
            id: crypto.randomUUID(),
            title_ru: title_ru.trim(),
            title_uz: title_uz?.trim() || title_ru.trim(),
            body_ru: body_ru.trim(),
            body_uz: body_uz?.trim() || body_ru.trim(),
            coverUrl: coverUrl || null,
            slug,
            status: status === 'published' ? 'published' : 'draft',
            publishAt: status === 'published' ? new Date().toISOString() : null,
            createdBy: req.user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        db.data.news.push(newsItem);
        await db.write();

        console.log('✅ Создана новость:', newsItem.id, 'пользователем:', req.user.username);
        res.status(201).json({ ok: true, news: newsItem });
    } catch (error) {
        console.error('Ошибка создания новости:', error);
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});

// PATCH /api/admin/news/:id - Обновить новость
router.patch('/:id', validate(newsSchema.partial()), async (req, res) => {
    try {
        await db.read();
        const newsItem = db.data.news.find(n => n.id === req.params.id);

        if (!newsItem) {
            return res.status(404).json({ ok: false, error: 'News not found' });
        }

        const { title_ru, title_uz, body_ru, body_uz, coverUrl, status } = req.body;

        // Обновляем только переданные поля
        if (title_ru !== undefined) newsItem.title_ru = title_ru.trim();
        if (title_uz !== undefined) newsItem.title_uz = title_uz.trim();
        if (body_ru !== undefined) newsItem.body_ru = body_ru.trim();
        if (body_uz !== undefined) newsItem.body_uz = body_uz.trim();
        if (coverUrl !== undefined) newsItem.coverUrl = coverUrl || null;

        // Обновление статуса
        if (status !== undefined && ['draft', 'published'].includes(status)) {
            const wasPublished = newsItem.status === 'published';
            newsItem.status = status;

            // Установить publishAt при первой публикации
            if (status === 'published' && !wasPublished) {
                newsItem.publishAt = new Date().toISOString();
            }
        }

        newsItem.updatedAt = new Date().toISOString();

        await db.write();

        console.log('✅ Обновлена новость:', newsItem.id, 'пользователем:', req.user.username);
        res.json({ ok: true, news: newsItem });
    } catch (error) {
        console.error('Ошибка обновления новости:', error);
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});

// DELETE /api/admin/news/:id - Удалить новость
router.delete('/:id', async (req, res) => {
    try {
        await db.read();
        const index = db.data.news.findIndex(n => n.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ ok: false, error: 'News not found' });
        }

        const deleted = db.data.news.splice(index, 1)[0];
        await db.write();

        console.log('✅ Удалена новость:', deleted.id, 'пользователем:', req.user.username);
        res.json({ ok: true, deleted });
    } catch (error) {
        console.error('Ошибка удаления новости:', error);
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});

export default router;
