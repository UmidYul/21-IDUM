import express from 'express';
import crypto from 'crypto';
import { requireAuth } from './auth-basic.js';
import db from '../database.js';
import { validate, scheduleEventSchema, bellsSchema } from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// ============ BELLS MANAGEMENT ============

// GET /api/admin/schedule/bells - Get all bell schedules
router.get('/bells', async (req, res) => {
    try {
        await db.read();
        const bells = db.data.schedule?.bells || [];

        res.json({
            ok: true,
            bells: bells.sort((a, b) => a.shift - b.shift)
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки звонков:', error);
        res.status(500).json({ ok: false, error: 'Ошибка загрузки звонков' });
    }
});

// GET /api/admin/schedule/bells/:shift - Get bell schedule for specific shift
router.get('/bells/:shift', async (req, res) => {
    try {
        const shift = parseInt(req.params.shift);
        await db.read();

        const bell = (db.data.schedule?.bells || []).find(b => b.shift === shift);

        if (!bell) {
            return res.status(404).json({ ok: false, error: 'Расписание не найдено' });
        }

        res.json({ ok: true, bell });
    } catch (error) {
        console.error('❌ Ошибка загрузки звонков:', error);
        res.status(500).json({ ok: false, error: 'Ошибка загрузки звонков' });
    }
});

// POST /api/admin/schedule/bells - Create or update bell schedule
router.post('/bells', validate(bellsSchema), async (req, res) => {
    try {
        const { shift, name_ru, name_uz, lessons } = req.body;

        await db.read();

        if (!db.data.schedule) {
            db.data.schedule = { bells: [], events: [] };
        }

        // Check if shift already exists
        const existingIndex = db.data.schedule.bells.findIndex(b => b.shift === shift);

        const bellSchedule = {
            shift,
            name_ru: name_ru.trim(),
            name_uz: name_uz.trim(),
            lessons,
            updatedAt: new Date().toISOString(),
            updatedBy: req.user.id
        };

        if (existingIndex >= 0) {
            // Update existing
            db.data.schedule.bells[existingIndex] = bellSchedule;
            await db.write();
            console.log(`✅ Обновлено расписание звонков: смена ${shift} пользователем: ${req.user.username}`);
        } else {
            // Create new
            db.data.schedule.bells.push(bellSchedule);
            await db.write();
            console.log(`✅ Создано расписание звонков: смена ${shift} пользователем: ${req.user.username}`);
        }

        res.json({ ok: true, bell: bellSchedule });
    } catch (error) {
        console.error('❌ Ошибка сохранения звонков:', error);
        res.status(500).json({ ok: false, error: 'Ошибка сохранения звонков' });
    }
});

// DELETE /api/admin/schedule/bells/:shift - Delete bell schedule
router.delete('/bells/:shift', async (req, res) => {
    try {
        const shift = parseInt(req.params.shift);
        await db.read();

        if (!db.data.schedule?.bells) {
            return res.status(404).json({ ok: false, error: 'Расписание не найдено' });
        }

        const index = db.data.schedule.bells.findIndex(b => b.shift === shift);

        if (index === -1) {
            return res.status(404).json({ ok: false, error: 'Расписание не найдено' });
        }

        db.data.schedule.bells.splice(index, 1);
        await db.write();

        console.log(`✅ Удалено расписание звонков: смена ${shift} пользователем: ${req.user.username}`);

        res.json({ ok: true });
    } catch (error) {
        console.error('❌ Ошибка удаления звонков:', error);
        res.status(500).json({ ok: false, error: 'Ошибка удаления звонков' });
    }
});

// ============ EVENTS MANAGEMENT ============

// GET /api/admin/schedule/events - Get all events
router.get('/events', async (req, res) => {
    try {
        await db.read();
        const events = (db.data.schedule?.events || [])
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            ok: true,
            events,
            count: events.length
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки событий:', error);
        res.status(500).json({ ok: false, error: 'Ошибка загрузки событий' });
    }
});

// GET /api/admin/schedule/events/:id - Get single event
router.get('/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.read();

        const event = (db.data.schedule?.events || []).find(e => e.id === id);

        if (!event) {
            return res.status(404).json({ ok: false, error: 'Событие не найдено' });
        }

        res.json({ ok: true, event });
    } catch (error) {
        console.error('❌ Ошибка загрузки события:', error);
        res.status(500).json({ ok: false, error: 'Ошибка загрузки события' });
    }
});

// POST /api/admin/schedule/events - Create event
router.post('/events', validate(scheduleEventSchema), async (req, res) => {
    try {
        const { title_ru, title_uz, description_ru, description_uz, date, time, type, status, location_ru, location_uz } = req.body;

        await db.read();

        if (!db.data.schedule) {
            db.data.schedule = { bells: [], events: [] };
        }

        const newEvent = {
            id: crypto.randomUUID(),
            title_ru: title_ru.trim(),
            title_uz: title_uz?.trim() || '',
            description_ru: description_ru?.trim() || '',
            description_uz: description_uz?.trim() || '',
            date,
            time: time || '',
            location_ru: location_ru?.trim() || '',
            location_uz: location_uz?.trim() || '',
            type: type || 'event',
            status: status || 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: req.user.id
        };

        db.data.schedule.events.push(newEvent);
        await db.write();

        console.log(`✅ Создано событие: ${newEvent.id} (${title_ru}) пользователем: ${req.user.username}`);

        res.json({ ok: true, event: newEvent });
    } catch (error) {
        console.error('❌ Ошибка создания события:', error);
        res.status(500).json({ ok: false, error: 'Ошибка создания события' });
    }
});

// PATCH /api/admin/schedule/events/:id - Update event
router.patch('/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        await db.read();

        if (!db.data.schedule?.events) {
            return res.status(404).json({ ok: false, error: 'События не найдены' });
        }

        const eventIndex = db.data.schedule.events.findIndex(e => e.id === id);

        if (eventIndex === -1) {
            return res.status(404).json({ ok: false, error: 'Событие не найдено' });
        }

        const event = db.data.schedule.events[eventIndex];

        // Log incoming updates for debugging
        try {
            console.log('🛠️ Обновление события', { id, updates });
        } catch (_) { }

        // Update fields
        const allowedFields = ['title_ru', 'title_uz', 'description_ru', 'description_uz', 'date', 'time', 'location_ru', 'location_uz', 'type', 'status'];
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                const val = updates[field];
                event[field] = typeof val === 'string' ? val.trim() : val;
            }
        });

        event.updatedAt = new Date().toISOString();
        event.updatedBy = req.user.id;

        db.data.schedule.events[eventIndex] = event;
        await db.write();

        try {
            console.log(`✅ Обновлено событие: ${id} пользователем: ${req.user.username}`);
        } catch (_) { }

        res.json({ ok: true, event });
    } catch (error) {
        console.error('❌ Ошибка обновления события:', error);
        res.status(500).json({ ok: false, error: 'Ошибка обновления события' });
    }
});

// DELETE /api/admin/schedule/events/:id - Delete event
router.delete('/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.read();

        if (!db.data.schedule?.events) {
            return res.status(404).json({ ok: false, error: 'События не найдены' });
        }

        const eventIndex = db.data.schedule.events.findIndex(e => e.id === id);

        if (eventIndex === -1) {
            return res.status(404).json({ ok: false, error: 'Событие не найдено' });
        }

        db.data.schedule.events.splice(eventIndex, 1);
        await db.write();

        console.log(`✅ Удалено событие: ${id} пользователем: ${req.user.username}`);

        res.json({ ok: true });
    } catch (error) {
        console.error('❌ Ошибка удаления события:', error);
        res.status(500).json({ ok: false, error: 'Ошибка удаления события' });
    }
});

export default router;
