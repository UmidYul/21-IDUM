import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Проверка на Vercel или serverless окружение
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const isServerless = isVercel || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Формат логов
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        if (stack) {
            return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
        }
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
);

// Консольный транспорт
const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, stack }) => {
            if (stack) {
                return `${timestamp} ${level}: ${message}\n${stack}`;
            }
            return `${timestamp} ${level}: ${message}`;
        })
    )
});

// Создание транспортов в зависимости от окружения
const transports = [consoleTransport];

// Файловые транспорты только для локального окружения
if (!isServerless) {
    try {
        const DailyRotateFile = (await import('winston-daily-rotate-file')).default;

        // Транспорт для ошибок
        const errorTransport = new DailyRotateFile({
            filename: path.join(__dirname, '..', 'logs', 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '30d',
            format: logFormat
        });

        // Транспорт для всех логов
        const combinedTransport = new DailyRotateFile({
            filename: path.join(__dirname, '..', 'logs', 'combined-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: logFormat
        });

        transports.push(errorTransport, combinedTransport);
    } catch (err) {
        // Если не удалось загрузить DailyRotateFile, просто используем консоль
        console.warn('File logging disabled:', err.message);
    }
}

// Создание логгера
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: transports
});

// Вспомогательные методы
logger.logRequest = (req, res, duration) => {
    const logData = {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent']
    };

    const message = `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`;

    if (res.statusCode >= 500) {
        logger.error(message, logData);
    } else if (res.statusCode >= 400) {
        logger.warn(message, logData);
    } else {
        logger.info(message, logData);
    }
};

export default logger;
