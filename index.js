import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import https from 'https';

// Send message to Telegram without external deps (uses https)
function sendTelegram(botToken, payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${botToken}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve(json);
                } catch (e) {
                    reject(new Error('Invalid JSON from Telegram'));
                }
            });
        });
        req.on('error', (err) => reject(err));
        req.write(data);
        req.end();
    });
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Логирование всех запросов
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.url}`);
    next();
});

// Security headers (basic hardening)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    // CSP: Allow inline scripts for Chart.js and other functionality
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; frame-src https://www.google.com;");
    next();
});

// Import routes
import newsRoutes from './routes/news.js';
import announcementsRoutes from './routes/announcements.js';
import faqRoutes from './routes/faq.js';
import scheduleRoutes from './routes/schedule.js';
import teachersRoutes from './routes/teachers.js';
import reviewsRoutes from './routes/reviews.js';
import authRoutes, { requireAuthPage } from './routes/auth-basic.js';
import adminNewsRoutes from './routes/admin-news.js';
import adminAnnouncementsRoutes from './routes/admin-announcements.js';
import adminFaqRoutes from './routes/admin-faq.js';
import adminScheduleRoutes from './routes/admin-schedule.js';
import adminUsersRoutes from './routes/admin-users.js';
import adminAuditRoutes from './routes/admin-audit.js';
import uploadRoutes from './routes/upload.js';

// Use routes
app.use('/api/news', newsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin/news', adminNewsRoutes);
app.use('/api/admin/announcements', adminAnnouncementsRoutes);
app.use('/api/admin/faq', adminFaqRoutes);
app.use('/api/admin/schedule', adminScheduleRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/audit', adminAuditRoutes);
app.use('/api/upload', uploadRoutes);

// Contact form -> Telegram
// Simple rate-limit per IP for contact (5s between requests)
const contactLast = new Map();

app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) {
        console.warn('Contact form: Telegram env vars not set; mocking send.');
        return res.json({ ok: true, mocked: true });
    }

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    const last = contactLast.get(clientIp) || 0;
    if (Date.now() - last < 5000) {
        return res.status(429).json({ ok: false, error: 'Too many requests, try later' });
    }
    contactLast.set(clientIp, Date.now());
    const now = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const text = `📨 <b>НОВОЕ ОБРАЩЕНИЕ С САЙТА 21-IDUM</b>\n\n` +
        `👤 <b>Имя:</b> ${name}\n` +
        `📧 <b>Email:</b> ${email}\n` +
        `📝 <b>Сообщение:</b>\n${message}\n\n` +
        `⏰ <b>Дата и время:</b> ${now}\n` +
        `🌐 <b>IP адрес:</b> ${clientIp}`;

    try {
        const result = await sendTelegram(botToken, { chat_id: chatId, text, parse_mode: 'HTML' });
        if (!result?.ok) {
            console.error('Telegram error:', result?.description, 'code:', result?.error_code);
            return res.status(400).json({ ok: false, error: result?.description || 'Telegram send failed', code: result?.error_code });
        }
        res.json({ ok: true });
    } catch (error) {
        console.error('Telegram send error:', error.message);
        res.status(500).json({ ok: false, error: error.message || 'Failed to send message' });
    }
});

// Serve static files
app.get('/', (req, res) => {
    console.log('🏠 Отправляю главную страницу index.html');
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Public pages
app.get(['/about', '/about.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

app.get(['/schedule', '/schedule.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'schedule.html'));
});

app.get(['/news', '/news.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'news.html'));
});

app.get(['/faq', '/faq.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'faq.html'));
});

app.get(['/team', '/team.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'team.html'));
});

// Basic login page (MVP)
app.get(['/login', '/admin/login'], (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Admin dashboard (protected)
app.get(['/admin', '/admin/'], requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'index.html'));
});

// Admin news pages
app.get('/admin/news', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'news.html'));
});

app.get('/admin/news/create', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'news-form.html'));
});

app.get('/admin/news/edit/:id', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'news-form.html'));
});

// Admin Announcements pages
app.get('/admin/announcements', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'announcements.html'));
});

app.get('/admin/announcements/create', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'announcement-form.html'));
});

app.get('/admin/announcements/edit/:id', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'announcement-form.html'));
});

// Admin FAQ pages
app.get('/admin/faq', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'faq.html'));
});

app.get('/admin/faq/create', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'faq-form.html'));
});

app.get('/admin/faq/edit/:id', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'faq-form.html'));
});

// Admin Events page
app.get('/admin/events', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'events.html'));
});

// Admin Teachers pages
app.get('/admin/teachers', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'teachers.html'));
});

app.get('/admin/teachers/create', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'teacher-form.html'));
});

app.get('/admin/teachers/edit/:id', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'teacher-form.html'));
});

// Admin Reviews pages
app.get('/admin/reviews', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'reviews.html'));
});

app.get('/admin/reviews/create', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'review-form.html'));
});

app.get('/admin/reviews/edit/:id', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'review-form.html'));
});

// Admin Schedule page
app.get('/admin/schedule', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'schedule.html'));
});

app.get('/admin/schedule/events/create', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'schedule-event-form.html'));
});

app.get('/admin/schedule/events/edit/:id', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'schedule-event-form.html'));
});

app.get('/admin/schedule/bells/edit/:shift', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'schedule-bells-form.html'));
});

// Admin Users pages
app.get('/admin/users', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'users.html'));
});
app.get('/admin/users/create', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'user-form.html'));
});
app.get('/admin/users/edit/:id', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'user-form.html'));
});

// Admin Audit page (recent logins)
app.get('/admin/audit', requireAuthPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'audit.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
