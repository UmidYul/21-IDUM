import express from 'express';
import crypto from 'crypto';
import { requireAuth } from './auth-basic.js';
import db from '../database.js';
import { validate, reviewSchema } from '../middleware/validation.js';

const router = express.Router();

function requireAdmin(req, res, next) {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'editor')) {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
    }
    next();
}

// GET /api/reviews - Get all reviews
router.get('/', async (req, res) => {
    try {
        await db.read();
        const reviews = (db.data.reviews || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({ ok: true, reviews, count: reviews.length });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/reviews/:id - Get single review
router.get('/:id', async (req, res) => {
    try {
        await db.read();
        const review = (db.data.reviews || []).find(r => r.id === req.params.id);
        if (!review) return res.status(404).json({ ok: false, error: 'Review not found' });
        res.json({ ok: true, review });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/reviews - Create review (admin/editor only)
router.post('/', requireAuth, requireAdmin, validate(reviewSchema), async (req, res) => {
    try {
        const { author_ru, author_uz, role_ru, role_uz, text_ru, text_uz, rating } = req.body;

        await db.read();
        db.data.reviews ||= [];

        const review = {
            id: crypto.randomUUID(),
            author: author.trim(),
            text_ru: text_ru.trim(),
            text_uz: text_uz?.trim() || '',
            date: date || new Date().toISOString().split('T')[0],
            status: status || 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: req.user.id,
            updatedBy: req.user.id
        };

        db.data.reviews.push(review);
        await db.write();

        console.log(`✅ Создан отзыв: ${review.id} (${author}) пользователем: ${req.user.username}`);
        res.json({ ok: true, review });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// PATCH /api/reviews/:id - Update review
router.patch('/:id', requireAuth, requireAdmin, validate(reviewSchema.partial()), async (req, res) => {
    try {
        const { id } = req.params;
        await db.read();

        if (!db.data.reviews) return res.status(404).json({ ok: false, error: 'Reviews not found' });

        const idx = db.data.reviews.findIndex(r => r.id === id);
        if (idx === -1) return res.status(404).json({ ok: false, error: 'Review not found' });

        const review = db.data.reviews[idx];
        const fields = ['author', 'text_ru', 'text_uz', 'date', 'status'];

        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                review[field] = field === 'author' ? req.body[field].trim() :
                    field === 'text_ru' || field === 'text_uz' ? req.body[field].trim() :
                        req.body[field];
            }
        });

        review.updatedAt = new Date().toISOString();
        review.updatedBy = req.user.id;

        db.data.reviews[idx] = review;
        await db.write();

        console.log(`✅ Обновлен отзыв: ${id} пользователем: ${req.user.username}`);
        res.json({ ok: true, review });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// DELETE /api/reviews/:id - Delete review
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.read();

        if (!db.data.reviews) return res.status(404).json({ ok: false, error: 'Reviews not found' });

        const idx = db.data.reviews.findIndex(r => r.id === id);
        if (idx === -1) return res.status(404).json({ ok: false, error: 'Review not found' });

        db.data.reviews.splice(idx, 1);
        await db.write();

        console.log(`✅ Удален отзыв: ${id} пользователем: ${req.user.username}`);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

export default router;
