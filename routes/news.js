import express from 'express';
import db from '../database.js';

const router = express.Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.adminLoggedIn) {
        next();
    } else {
        res.status(401).json({ success: false, error: 'Unauthorized' });
    }
};

// GET /api/news - Get all news
router.get('/', async (req, res) => {
    try {
        const lang = req.query.lang || 'ru';
        const limit = parseInt(req.query.limit) || 10;

        // Validate language
        const validLang = ['ru', 'uz'].includes(lang) ? lang : 'ru';

        // Read data
        await db.read();

        // Get news and format based on language
        const allNews = db.data.news || [];
        const news = allNews
            .sort((a, b) => new Date(b.publish_date) - new Date(a.publish_date))
            .slice(0, limit)
            .map(item => {
                const publishDate = new Date(item.publish_date);
                const formattedDate = publishDate.toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });

                // Get content based on language
                const title = validLang === 'uz' ? item.title_uz : item.title_ru;
                const content = validLang === 'uz' ? item.content_uz : item.content_ru;

                // Create excerpt (first 100 chars without HTML tags)
                const plainContent = content.replace(/<[^>]*>/g, '');
                const excerpt = plainContent.substring(0, 100) + '...';

                return {
                    id: item.id,
                    title: title,
                    content: content,
                    publish_date: formattedDate,
                    excerpt: excerpt,
                    created_at: item.created_at
                };
            });

        res.json({
            success: true,
            news: news,
            count: news.length,
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

// GET /api/news/:id - Get single news item
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const lang = req.query.lang || 'ru';
        const validLang = ['ru', 'uz'].includes(lang) ? lang : 'ru';

        await db.read();
        const newsItem = db.data.news.find(n => n.id === id);

        if (!newsItem) {
            return res.status(404).json({
                success: false,
                error: 'News not found'
            });
        }

        const title = validLang === 'uz' ? newsItem.title_uz : newsItem.title_ru;
        const content = validLang === 'uz' ? newsItem.content_uz : newsItem.content_ru;

        res.json({
            success: true,
            news: {
                id: newsItem.id,
                title: title,
                content: content,
                publish_date: newsItem.publish_date,
                created_at: newsItem.created_at
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

// POST /api/news - Add new news (requires authentication)
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const { title_ru, content_ru, title_uz, content_uz, publish_date } = req.body;

        // Validate required fields
        if (!title_ru || !content_ru || !title_uz || !content_uz) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        await db.read();

        // Generate new ID
        const maxId = db.data.news.length > 0
            ? Math.max(...db.data.news.map(n => n.id))
            : 0;
        const newId = maxId + 1;

        const publishDateValue = publish_date || new Date().toISOString().split('T')[0];

        // Create new news item
        const newNews = {
            id: newId,
            title_ru,
            content_ru,
            title_uz,
            content_uz,
            publish_date: publishDateValue,
            created_at: new Date().toISOString()
        };

        db.data.news.push(newNews);
        await db.write();

        res.json({
            success: true,
            id: newId,
            message: 'News added successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

// PUT /api/news/:id - Update news (requires authentication)
router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title_ru, content_ru, title_uz, content_uz, publish_date } = req.body;

        if (!title_ru || !content_ru || !title_uz || !content_uz) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        await db.read();
        const newsIndex = db.data.news.findIndex(n => n.id === id);

        if (newsIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'News not found'
            });
        }

        // Update news item
        db.data.news[newsIndex] = {
            ...db.data.news[newsIndex],
            title_ru,
            content_ru,
            title_uz,
            content_uz,
            publish_date
        };

        await db.write();

        res.json({
            success: true,
            message: 'News updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

// DELETE /api/news/:id - Delete news (requires authentication)
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        await db.read();
        const newsIndex = db.data.news.findIndex(n => n.id === id);

        if (newsIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'News not found'
            });
        }

        db.data.news.splice(newsIndex, 1);
        await db.write();

        res.json({
            success: true,
            message: 'News deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

// GET /api/news/admin/all - Get all news with all languages (for admin)
router.get('/admin/all', isAuthenticated, async (req, res) => {
    try {
        await db.read();
        const allNews = db.data.news || [];

        const sortedNews = allNews.sort((a, b) =>
            new Date(b.publish_date) - new Date(a.publish_date)
        );

        res.json({
            success: true,
            news: sortedNews
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

export default router;
