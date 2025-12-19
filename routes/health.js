import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../database.js';
import client from 'prom-client';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Время запуска сервера
const startTime = Date.now();

// Регистрация дефолтных метрик (CPU, память и т.д.)
client.register.setDefaultLabels({
    app: '21-idum-school'
});
client.collectDefaultMetrics();

// GET /health - Health check эндпоинт
router.get('/health', async (req, res) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000); // в секундах
    const uptimeFormatted = formatUptime(uptime);

    let dbStatus = 'ok';
    let dbError = null;

    // Проверка доступности БД
    try {
        const dbPath = path.join(__dirname, '..', 'db.json');
        await fs.access(dbPath);
        await db.read();
    } catch (error) {
        dbStatus = 'error';
        dbError = error.message;
    }

    // Получение версии из package.json
    let version = 'unknown';
    try {
        const packagePath = path.join(__dirname, '..', 'package.json');
        const packageData = await fs.readFile(packagePath, 'utf-8');
        const packageJson = JSON.parse(packageData);
        version = packageJson.version;
    } catch (error) {
        // Игнорируем ошибки чтения версии
    }

    // Статистика памяти
    const memoryUsage = process.memoryUsage();
    const memory = {
        rss: formatBytes(memoryUsage.rss),
        heapTotal: formatBytes(memoryUsage.heapTotal),
        heapUsed: formatBytes(memoryUsage.heapUsed),
        external: formatBytes(memoryUsage.external)
    };

    const health = {
        status: dbStatus === 'ok' ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: uptimeFormatted,
        uptimeSeconds: uptime,
        version: version,
        environment: process.env.NODE_ENV || 'development',
        database: {
            status: dbStatus,
            error: dbError
        },
        memory: memory,
        node: process.version
    };

    const statusCode = dbStatus === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
});

// GET /metrics - Prometheus метрики
router.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', client.register.contentType);
        const metrics = await client.register.metrics();
        res.send(metrics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to collect metrics' });
    }
});

// Вспомогательные функции
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
}

function formatBytes(bytes) {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
}

export default router;
