import express from 'express';
import ical from 'ical-generator';
import db from '../database.js';

const router = express.Router();

// GET /api/calendar/events - Get all published events for calendar
router.get('/events', async (req, res) => {
    try {
        await db.read();
        const events = (db.data.schedule?.events || [])
            .filter(e => e.status === 'published' || !e.status) // Show published events
            .map(event => ({
                id: event.id,
                title_ru: event.title_ru,
                title_uz: event.title_uz,
                description_ru: event.description_ru || '',
                description_uz: event.description_uz || '',
                date: event.date,
                time: event.time || '',
                type: event.type || 'event',
                location_ru: event.location_ru || '',
                location_uz: event.location_uz || ''
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json({
            ok: true,
            events,
            count: events.length
        });
    } catch (error) {
        console.error('❌ Ошибка получения событий календаря:', error);
        res.status(500).json({ ok: false, error: 'Ошибка загрузки событий' });
    }
});

// GET /api/calendar/export.ics - Export events to iCal format
router.get('/export.ics', async (req, res) => {
    try {
        await db.read();
        const events = (db.data.schedule?.events || [])
            .filter(e => e.status === 'published' || !e.status);

        const calendar = ical({
            name: 'Календарь школы 21-IDUM',
            description: 'Расписание мероприятий и важных событий',
            timezone: 'Asia/Tashkent',
            url: 'https://school-21.uz/calendar',
            prodId: {
                company: '21-IDUM School',
                product: 'School Calendar'
            }
        });

        events.forEach(event => {
            const startDate = new Date(event.date);

            // If time is specified, add it to the date
            if (event.time) {
                const [hours, minutes] = event.time.split(':');
                startDate.setHours(parseInt(hours), parseInt(minutes));
            } else {
                startDate.setHours(9, 0); // Default to 9:00 AM
            }

            // Event duration: 1 hour by default
            const endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 1);

            calendar.createEvent({
                start: startDate,
                end: endDate,
                summary: event.title_ru,
                description: event.description_ru || event.title_ru,
                location: event.location_ru || 'Школа 21-IDUM',
                url: `https://school-21.uz/calendar#event-${event.id}`,
                uid: `event-${event.id}@school-21.uz`,
                organizer: {
                    name: 'Школа 21-IDUM',
                    email: 'info@school-21.uz'
                }
            });
        });

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="school-21-calendar.ics"');
        res.send(calendar.toString());

        console.log(`📅 Экспорт календаря: ${events.length} событий`);
    } catch (error) {
        console.error('❌ Ошибка экспорта календаря:', error);
        res.status(500).json({ ok: false, error: 'Ошибка экспорта календаря' });
    }
});

export default router;
