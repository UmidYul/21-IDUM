import express from 'express';
import db from '../database.js';

const router = express.Router();

// GET /api/schedule - Get bell schedule and events
router.get('/', async (req, res) => {
    try {
        await db.read();

        const bells = db.data.schedule?.bells || [];
        const events = db.data.schedule?.events || [];

        res.json({
            success: true,
            bells: bells.sort((a, b) => a.shift - b.shift),
            events: events.sort((a, b) => new Date(a.date) - new Date(b.date))
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

// GET /api/schedule/bells - Get bell timetable
router.get('/bells', async (req, res) => {
    try {
        await db.read();
        const bells = db.data.schedule?.bells || [];

        res.json({
            success: true,
            bells: bells.sort((a, b) => a.shift - b.shift)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

// GET /api/schedule/events - Get upcoming events
router.get('/events', async (req, res) => {
    try {
        console.log('📅 Получен запрос на /api/schedule/events');
        const limit = parseInt(req.query.limit) || 10;
        const upcoming = req.query.upcoming === 'true';
        console.log(`   Параметры: limit=${limit}, upcoming=${upcoming}`);

        await db.read();
        let events = db.data.schedule?.events || [];
        console.log(`📊 Найдено событий в БД: ${events.length}`);

        // Filter upcoming events if requested
        // Include events that are in the future or within the past 3 days
        if (upcoming) {
            const threshold = new Date();
            threshold.setDate(threshold.getDate() - 3);
            events = events.filter(e => new Date(e.date) >= threshold);
            console.log(`   После фильтрации upcoming: ${events.length} событий`);
        }

        // Sort by date
        if (upcoming) {
            // For upcoming list, show newest first (descending)
            events = events.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else {
            // Default: ascending
            events = events.sort((a, b) => new Date(a.date) - new Date(b.date));
        }

        // Limit results
        events = events.slice(0, limit);
        console.log(`✅ Отправляю ${events.length} событий`);

        res.json({
            success: true,
            events,
            count: events.length
        });
    } catch (error) {
        console.error('❌ Ошибка при получении событий:', error);
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

// POST /api/schedule/bells - Add bell schedule
router.post('/bells', async (req, res) => {
    try {
        const { shift, name_ru, name_uz, lessons } = req.body;

        if (!shift || !name_ru || !name_uz || !lessons || !Array.isArray(lessons)) {
            return res.status(400).json({
                success: false,
                error: 'All fields (shift, name_ru, name_uz, lessons[]) are required'
            });
        }

        await db.read();

        if (!db.data.schedule) {
            db.data.schedule = { bells: [], events: [] };
        }

        // Check if shift already exists
        const existingIndex = db.data.schedule.bells.findIndex(b => b.shift === shift);

        if (existingIndex >= 0) {
            // Update existing
            db.data.schedule.bells[existingIndex] = {
                shift,
                name_ru,
                name_uz,
                lessons,
                updated_at: new Date().toISOString()
            };
        } else {
            // Add new
            db.data.schedule.bells.push({
                shift,
                name_ru,
                name_uz,
                lessons,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }

        await db.write();

        res.json({
            success: true,
            message: 'Bell schedule saved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

// DELETE /api/schedule/bells/:shift - Delete bell schedule
router.delete('/bells/:shift', async (req, res) => {
    try {
        const shift = parseInt(req.params.shift);

        await db.read();

        if (!db.data.schedule?.bells) {
            return res.status(404).json({
                success: false,
                error: 'No bell schedules found'
            });
        }

        const index = db.data.schedule.bells.findIndex(b => b.shift === shift);

        if (index === -1) {
            return res.status(404).json({
                success: false,
                error: 'Bell schedule not found'
            });
        }

        db.data.schedule.bells.splice(index, 1);
        await db.write();

        res.json({
            success: true,
            message: 'Bell schedule deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

// POST /api/schedule/events - Add event
router.post('/events', async (req, res) => {
    try {
        const { title_ru, title_uz, date, time, location_ru, location_uz } = req.body;

        if (!title_ru || !title_uz || !date) {
            return res.status(400).json({
                success: false,
                error: 'Required fields: title_ru, title_uz, date'
            });
        }

        await db.read();

        if (!db.data.schedule) {
            db.data.schedule = { bells: [], events: [] };
        }

        const maxId = db.data.schedule.events.length > 0
            ? Math.max(...db.data.schedule.events.map(e => e.id))
            : 0;
        const newId = maxId + 1;

        const newEvent = {
            id: newId,
            title_ru,
            title_uz,
            date,
            time: time || null,
            location_ru: location_ru || null,
            location_uz: location_uz || null,
            created_at: new Date().toISOString()
        };

        db.data.schedule.events.push(newEvent);
        await db.write();

        res.json({
            success: true,
            id: newId,
            message: 'Event added successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

// PUT /api/schedule/events/:id - Update event
router.put('/events/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title_ru, title_uz, date, time, location_ru, location_uz } = req.body;

        if (!title_ru || !title_uz || !date) {
            return res.status(400).json({
                success: false,
                error: 'Required fields: title_ru, title_uz, date'
            });
        }

        await db.read();

        if (!db.data.schedule?.events) {
            return res.status(404).json({
                success: false,
                error: 'No events found'
            });
        }

        const index = db.data.schedule.events.findIndex(e => e.id === id);

        if (index === -1) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        db.data.schedule.events[index] = {
            ...db.data.schedule.events[index],
            title_ru,
            title_uz,
            date,
            time: time || null,
            location_ru: location_ru || null,
            location_uz: location_uz || null,
            updated_at: new Date().toISOString()
        };

        await db.write();

        res.json({
            success: true,
            message: 'Event updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

// DELETE /api/schedule/events/:id - Delete event
router.delete('/events/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        await db.read();

        if (!db.data.schedule?.events) {
            return res.status(404).json({
                success: false,
                error: 'No events found'
            });
        }

        const index = db.data.schedule.events.findIndex(e => e.id === id);

        if (index === -1) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        db.data.schedule.events.splice(index, 1);
        await db.write();

        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Database error: ' + error.message
        });
    }
});

export default router;
