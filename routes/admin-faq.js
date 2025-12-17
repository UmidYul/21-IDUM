import express from 'express';
import { requireAuth } from './auth-basic.js';
import db from '../database.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/admin/faq - Get all FAQ items (including hidden)
router.get('/', async (req, res) => {
    try {
        await db.read();
        const faqItems = (db.data.faq || [])
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        res.json({
            ok: true,
            faq: faqItems,
            count: faqItems.length
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки FAQ:', error);
        res.status(500).json({ ok: false, error: 'Ошибка загрузки FAQ' });
    }
});

// GET /api/admin/faq/:id - Get single FAQ item
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.read();

        const faqItem = (db.data.faq || []).find(item => item.id === id);

        if (!faqItem) {
            return res.status(404).json({ ok: false, error: 'FAQ не найден' });
        }

        res.json({ ok: true, faq: faqItem });
    } catch (error) {
        console.error('❌ Ошибка загрузки FAQ:', error);
        res.status(500).json({ ok: false, error: 'Ошибка загрузки FAQ' });
    }
});

// POST /api/admin/faq - Create new FAQ item
router.post('/', async (req, res) => {
    try {
        const { question_ru, question_uz, answer_ru, answer_uz, category, order, visible } = req.body;

        // Validation
        if (!question_ru || !answer_ru) {
            return res.status(400).json({
                ok: false,
                error: 'Обязательные поля: question_ru, answer_ru'
            });
        }

        await db.read();

        const newFaq = {
            id: crypto.randomUUID(),
            question_ru: question_ru.trim(),
            question_uz: question_uz?.trim() || '',
            answer_ru: answer_ru.trim(),
            answer_uz: answer_uz?.trim() || '',
            category: category?.trim() || 'general',
            order: parseInt(order) || 0,
            visible: visible !== false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: req.user.id
        };

        if (!db.data.faq) {
            db.data.faq = [];
        }

        db.data.faq.push(newFaq);
        await db.write();

        console.log(`✅ Создан FAQ: ${newFaq.id} пользователем: ${req.user.username}`);

        res.json({ ok: true, faq: newFaq });
    } catch (error) {
        console.error('❌ Ошибка создания FAQ:', error);
        res.status(500).json({ ok: false, error: 'Ошибка создания FAQ' });
    }
});

// PATCH /api/admin/faq/:id - Update FAQ item
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        await db.read();

        const faqIndex = (db.data.faq || []).findIndex(item => item.id === id);

        if (faqIndex === -1) {
            return res.status(404).json({ ok: false, error: 'FAQ не найден' });
        }

        const faqItem = db.data.faq[faqIndex];

        // Update fields
        const allowedFields = ['question_ru', 'question_uz', 'answer_ru', 'answer_uz', 'category', 'order', 'visible'];
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                if (field === 'order') {
                    faqItem[field] = parseInt(updates[field]);
                } else if (field === 'visible') {
                    faqItem[field] = updates[field] !== false;
                } else {
                    faqItem[field] = updates[field];
                }
            }
        });

        faqItem.updatedAt = new Date().toISOString();
        faqItem.updatedBy = req.user.id;

        db.data.faq[faqIndex] = faqItem;
        await db.write();

        console.log(`✅ Обновлён FAQ: ${id} пользователем: ${req.user.username}`);

        res.json({ ok: true, faq: faqItem });
    } catch (error) {
        console.error('❌ Ошибка обновления FAQ:', error);
        res.status(500).json({ ok: false, error: 'Ошибка обновления FAQ' });
    }
});

// DELETE /api/admin/faq/:id - Delete FAQ item
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        await db.read();

        const faqIndex = (db.data.faq || []).findIndex(item => item.id === id);

        if (faqIndex === -1) {
            return res.status(404).json({ ok: false, error: 'FAQ не найден' });
        }

        db.data.faq.splice(faqIndex, 1);
        await db.write();

        console.log(`✅ Удалён FAQ: ${id} пользователем: ${req.user.username}`);

        res.json({ ok: true });
    } catch (error) {
        console.error('❌ Ошибка удаления FAQ:', error);
        res.status(500).json({ ok: false, error: 'Ошибка удаления FAQ' });
    }
});

export default router;
