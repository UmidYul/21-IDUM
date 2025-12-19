import logger from '../utils/logger.js';
import client from 'prom-client';

// Prometheus метрики
const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status']
});

const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5]
});

const httpErrorsTotal = new client.Counter({
    name: 'http_errors_total',
    help: 'Total number of HTTP errors',
    labelNames: ['method', 'route', 'status']
});

// Middleware для логирования запросов и сбора метрик
export function requestLogger(req, res, next) {
    const startTime = Date.now();

    // Получаем оригинальные методы
    const originalSend = res.send;
    const originalJson = res.json;

    // Переопределяем res.send
    res.send = function (data) {
        res.send = originalSend;
        recordMetrics();
        return res.send(data);
    };

    // Переопределяем res.json
    res.json = function (data) {
        res.json = originalJson;
        recordMetrics();
        return res.json(data);
    };

    // Обработка завершения ответа
    res.on('finish', () => {
        recordMetrics();
    });

    function recordMetrics() {
        const duration = Date.now() - startTime;
        const route = getRoutePath(req);

        // Логирование в Winston
        logger.logRequest(req, res, duration);

        // Prometheus метрики
        const labels = {
            method: req.method,
            route: route,
            status: res.statusCode
        };

        httpRequestsTotal.inc(labels);
        httpRequestDuration.observe(labels, duration / 1000);

        if (res.statusCode >= 400) {
            httpErrorsTotal.inc(labels);
        }
    }

    next();
}

// Определение маршрута для метрик
function getRoutePath(req) {
    // Если есть роут из express
    if (req.route && req.route.path) {
        return req.route.path;
    }

    // Упрощенное определение маршрута
    const path = req.path || req.url;

    // Группировка похожих маршрутов
    if (path.startsWith('/api/news/')) return '/api/news/:id';
    if (path.startsWith('/api/announcements/')) return '/api/announcements/:id';
    if (path.startsWith('/api/teachers/')) return '/api/teachers/:id';
    if (path.startsWith('/api/faq/')) return '/api/faq/:id';
    if (path.startsWith('/api/gallery/')) return '/api/gallery/:id';
    if (path.startsWith('/api/schedule/')) return '/api/schedule/:id';
    if (path.startsWith('/api/users/')) return '/api/users/:id';
    if (path.startsWith('/api/reviews/')) return '/api/reviews/:id';

    return path;
}

export default requestLogger;
