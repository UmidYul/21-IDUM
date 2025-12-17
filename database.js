import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Database file path
const dbFile = join(__dirname, 'db.json');

// Configure lowdb to use JSON file for storage
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, {});

// Initialize database
await db.read();

// Helper для создания дефолтного юзера
function createDefaultUser() {
    // Простой пароль без bcrypt для MVP, позже добавим хеширование
    return {
        id: crypto.randomUUID(),
        username: 'admin',
        password: 'admin123', // В продакшене будет bcrypt
        role: 'admin',
        createdAt: new Date().toISOString(),
        lastLoginAt: null
    };
}

// Схема БД
db.data ||= {
    // Публичный контент
    news: [],
    faq: [],
    announcements: [],
    teachers: [],
    reviews: [],
    schedule: { bells: [], events: [] },

    // Админские сущности
    users: [],
    sessions: [], // Добавлено: хранение активных сессий
    media: [],
    settings: {
        siteName: '21-IDUM',
        contacts: {
            phone: '+998 (77) 453-55-50',
            email: 'info@21idum.uz',
            address: 'г. Фаргона, ул. Кокандская, 56'
        },
        social: {
            telegram: 'https://t.me/school21idum',
            instagram: 'https://instagram.com/21idum',
            facebook: 'https://facebook.com/21idum'
        }
    },
    auditLog: [],
    contactSubmissions: []
};

// Создать дефолтного админа если users пустой
if (!db.data.users || db.data.users.length === 0) {
    db.data.users = [createDefaultUser()];
    await db.write();
    console.log('✅ Создан дефолтный пользователь: admin / admin123');
}

export default db;
