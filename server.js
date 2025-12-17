import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const ensureFetch = async () => {
    if (globalThis.fetch) return globalThis.fetch;
    const { default: fetch } = await import('node-fetch');
    return fetch;
};

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

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set to true if using https
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Import routes
import newsRoutes from './routes/news.js';
import authRoutes from './routes/auth.js';

// Use routes
app.use('/api/news', newsRoutes);
app.use('/api/auth', authRoutes);

// Contact form -> Telegram
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) {
        return res.status(500).json({ ok: false, error: 'Telegram env vars are not set' });
    }

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    const now = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const text = `📨 <b>НОВОЕ ОБРАЩЕНИЕ С САЙТА 21-IDUM</b>\n\n` +
        `👤 <b>Имя:</b> ${name}\n` +
        `📧 <b>Email:</b> ${email}\n` +
        `📝 <b>Сообщение:</b>\n${message}\n\n` +
        `⏰ <b>Дата и время:</b> ${now}\n` +
        `🌐 <b>IP адрес:</b> ${clientIp}`;

    try {
        const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
        });
        const result = await tgResponse.json();
        if (!result.ok) throw new Error(result.description || 'Telegram send failed');
        res.json({ ok: true });
    } catch (error) {
        console.error('Telegram send error:', error.message);
        res.status(500).json({ ok: false, error: 'Failed to send message' });
    }
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'dashboard.html'));
});

app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'login.html'));
});

app.get('/admin/add-news', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'add-news.html'));
});

app.get('/admin/edit-news', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin', 'edit-news.html'));
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

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
