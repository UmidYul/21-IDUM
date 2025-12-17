import express from 'express';
import db from '../database.js';

const router = express.Router();

// GET /api/faq - Get all FAQ items (public)
router.get('/', async (req, res) => {
    try {
        const lang = req.query.lang || 'ru';
        const visible = req.query.visible !== 'false'; // default to showing only visible

        const validLang = ['ru', 'uz'].includes(lang) ? lang : 'ru';

        await db.read();

        let faqItems = db.data.faq || [];

        // Filter by visibility if requested
        if (visible) {
            faqItems = faqItems.filter(item => item.visible !== false);
        }

        // Sort by order
        faqItems = faqItems.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Map to localized format
        const localizedFaq = faqItems.map(item => {
            const question = validLang === 'uz' ? item.question_uz : item.question_ru;
            const answer = validLang === 'uz' ? item.answer_uz : item.answer_ru;

            return {
                id: item.id,
                question,
                answer,
                category: item.category,
                order: item.order,
                visible: item.visible,
                created_at: item.created_at
            };
        });

        res.json({
            success: true,
            faq: localizedFaq,
            count: localizedFaq.length,
            language: validLang
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

// GET /api/faq/all - Get all FAQ items with all languages (for editing)
router.get('/all', async (req, res) => {
    try {
        await db.read();
        const allFaq = db.data.faq || [];

        const sortedFaq = allFaq.sort((a, b) => (a.order || 0) - (b.order || 0));

        res.json({
            success: true,
            faq: sortedFaq
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

// GET /api/faq/:id - Get single FAQ item
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const lang = req.query.lang || 'ru';
        const validLang = ['ru', 'uz'].includes(lang) ? lang : 'ru';

        await db.read();
        const faqItem = db.data.faq.find(f => f.id === id);

        if (!faqItem) {
            return res.status(404).json({
                success: false,
                error: 'FAQ item not found'
            });
        }

        const question = validLang === 'uz' ? faqItem.question_uz : faqItem.question_ru;
        const answer = validLang === 'uz' ? faqItem.answer_uz : faqItem.answer_ru;

        res.json({
            success: true,
            faq: {
                id: faqItem.id,
                question,
                answer,
                category: faqItem.category,
                order: faqItem.order,
                visible: faqItem.visible,
                created_at: faqItem.created_at
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

// POST /api/faq - Add new FAQ item
router.post('/', async (req, res) => {
    try {
        const { question_ru, answer_ru, question_uz, answer_uz, category, order, visible } = req.body;

        // Validate required fields
        if (!question_ru || !answer_ru || !question_uz || !answer_uz) {
            return res.status(400).json({
                success: false,
                error: 'All fields (question_ru, answer_ru, question_uz, answer_uz) are required'
            });
        }

        await db.read();

        // Generate new ID
        const maxId = db.data.faq.length > 0
            ? Math.max(...db.data.faq.map(f => f.id))
            : 0;
        const newId = maxId + 1;

        // Create new FAQ item
        const newFaq = {
            id: newId,
            question_ru,
            answer_ru,
            question_uz,
            answer_uz,
            category: category || 'general',
            order: order !== undefined ? order : 0,
            visible: visible !== undefined ? visible : true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        db.data.faq.push(newFaq);
        await db.write();

        res.json({
            success: true,
            id: newId,
            message: 'FAQ item added successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

// PUT /api/faq/:id - Update FAQ item
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { question_ru, answer_ru, question_uz, answer_uz, category, order, visible } = req.body;

        if (!question_ru || !answer_ru || !question_uz || !answer_uz) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        await db.read();
        const faqIndex = db.data.faq.findIndex(f => f.id === id);

        if (faqIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'FAQ item not found'
            });
        }

        // Update FAQ item
        db.data.faq[faqIndex] = {
            ...db.data.faq[faqIndex],
            question_ru,
            answer_ru,
            question_uz,
            answer_uz,
            category: category || db.data.faq[faqIndex].category,
            order: order !== undefined ? order : db.data.faq[faqIndex].order,
            visible: visible !== undefined ? visible : db.data.faq[faqIndex].visible,
            updated_at: new Date().toISOString()
        };

        await db.write();

        res.json({
            success: true,
            message: 'FAQ item updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

// DELETE /api/faq/:id - Delete FAQ item
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        await db.read();
        const faqIndex = db.data.faq.findIndex(f => f.id === id);

        if (faqIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'FAQ item not found'
            });
        }

        db.data.faq.splice(faqIndex, 1);
        await db.write();

        res.json({
            success: true,
            message: 'FAQ item deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

export default router;
