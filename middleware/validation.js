import { z } from 'zod';

// Validation schemas
export const newsSchema = z.object({
    title_ru: z.string()
        .min(1, 'Заголовок на русском обязателен')
        .max(200, 'Заголовок не должен превышать 200 символов'),
    title_uz: z.string()
        .max(200, 'Заголовок не должен превышать 200 символов')
        .optional()
        .or(z.literal('')),
    body_ru: z.string()
        .min(1, 'Текст на русском обязателен')
        .max(50000, 'Текст не должен превышать 50000 символов'),
    body_uz: z.string()
        .max(50000, 'Текст не должен превышать 50000 символов')
        .optional()
        .or(z.literal('')),
    // Allow absolute URLs or relative paths under /uploads/
    coverUrl: z.union([
        z.string().url('Некорректный URL обложки'),
        z.string().regex(/^\/uploads\//, 'Некорректный путь обложки')
    ]).optional().or(z.literal('')),
    status: z.enum(['draft', 'published'], {
        errorMap: () => ({ message: 'Статус должен быть draft или published' })
    })
});

export const announcementSchema = z.object({
    title_ru: z.string()
        .min(1, 'Заголовок на русском обязателен')
        .max(200, 'Заголовок не должен превышать 200 символов'),
    title_uz: z.string()
        .min(1, 'Заголовок на узбекском обязателен')
        .max(200, 'Заголовок не должен превышать 200 символов'),
    description_ru: z.string()
        .min(1, 'Описание на русском обязателено')
        .max(2000, 'Описание не должно превышать 2000 символов'),
    description_uz: z.string()
        .min(1, 'Описание на узбекском обязателено')
        .max(2000, 'Описание не должно превышать 2000 символов'),
    type: z.enum(['info', 'important', 'event'], {
        errorMap: () => ({ message: 'Тип должен быть info, important или event' })
    }),
    date: z.string().optional().or(z.literal(''))
});

export const teacherSchema = z.object({
    name_ru: z.string()
        .min(1, 'Имя на русском обязательно')
        .max(100, 'Имя не должно превышать 100 символов'),
    name_uz: z.string()
        .min(1, 'Имя на узбекском обязательно')
        .max(100, 'Имя не должно превышать 100 символов'),
    position_ru: z.string()
        .min(1, 'Должность на русском обязательна')
        .max(200, 'Должность не должна превышать 200 символов'),
    position_uz: z.string()
        .min(1, 'Должность на узбекском обязательна')
        .max(200, 'Должность не должна превышать 200 символов'),
    email: z.string()
        .email('Некорректный email')
        .optional()
        .or(z.literal('')),
    phone: z.string()
        .regex(/^[\d\s\+\-\(\)]*$/, 'Некорректный формат телефона')
        .optional()
        .or(z.literal('')),
    photoUrl: z.string().url('Некорректный URL фото').optional().or(z.literal(''))
});

export const userSchema = z.object({
    username: z.string()
        .min(3, 'Логин должен содержать минимум 3 символа')
        .max(50, 'Логин не должен превышать 50 символов')
        .regex(/^[a-zA-Z0-9_]+$/, 'Логин должен содержать только буквы, цифры и _'),
    password: z.string()
        .min(8, 'Пароль должен содержать минимум 8 символов')
        .max(100, 'Пароль не должен превышать 100 символов')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Пароль должен содержать заглавную букву, строчную букву и цифру'),
    role: z.enum(['admin', 'editor'], {
        errorMap: () => ({ message: 'Роль должна быть admin или editor' })
    }),
    displayName: z.string()
        .min(1, 'Имя для отображения обязательно')
        .max(100, 'Имя не должно превышать 100 символов')
        .optional(),
    email: z.string()
        .email('Некорректный email')
        .optional()
        .or(z.literal('')),
    phone: z.string()
        .regex(/^[\d\s\+\-\(\)]*$/, 'Некорректный формат телефона')
        .optional()
        .or(z.literal(''))
});

// For user updates, password is optional
export const userUpdateSchema = userSchema.extend({
    password: z.string()
        .min(8, 'Пароль должен содержать минимум 8 символов')
        .max(100, 'Пароль не должен превышать 100 символов')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Пароль должен содержать заглавную букву, строчную букву и цифру')
        .optional()
        .or(z.literal(''))
});

export const faqSchema = z.object({
    question_ru: z.string()
        .min(1, 'Вопрос на русском обязателен')
        .max(500, 'Вопрос не должен превышать 500 символов'),
    question_uz: z.string()
        .min(1, 'Вопрос на узбекском обязателен')
        .max(500, 'Вопрос не должен превышать 500 символов'),
    answer_ru: z.string()
        .min(1, 'Ответ на русском обязателен')
        .max(5000, 'Ответ не должен превышать 5000 символов'),
    answer_uz: z.string()
        .min(1, 'Ответ на узбекском обязателен')
        .max(5000, 'Ответ не должен превышать 5000 символов'),
    category: z.string()
        .max(100, 'Категория не должна превышать 100 символов')
        .optional()
        .or(z.literal(''))
});

export const reviewSchema = z.object({
    author_ru: z.string()
        .min(1, 'Имя автора на русском обязательно')
        .max(100, 'Имя автора не должно превышать 100 символов'),
    author_uz: z.string()
        .min(1, 'Имя автора на узбекском обязательно')
        .max(100, 'Имя автора не должно превышать 100 символов'),
    role_ru: z.string()
        .max(200, 'Роль не должна превышать 200 символов')
        .optional()
        .or(z.literal('')),
    role_uz: z.string()
        .max(200, 'Роль не должна превышать 200 символов')
        .optional()
        .or(z.literal('')),
    text_ru: z.string()
        .min(1, 'Текст отзыва на русском обязателен')
        .max(2000, 'Текст отзыва не должен превышать 2000 символов'),
    text_uz: z.string()
        .min(1, 'Текст отзыва на узбекском обязателен')
        .max(2000, 'Текст отзыва не должен превышать 2000 символов'),
    rating: z.number()
        .int('Рейтинг должен быть целым числом')
        .min(1, 'Минимальный рейтинг 1')
        .max(5, 'Максимальный рейтинг 5')
        .optional()
});

export const scheduleEventSchema = z.object({
    title_ru: z.string()
        .min(1, 'Название на русском обязательно')
        .max(200, 'Название не должно превышать 200 символов'),
    title_uz: z.string()
        .max(200, 'Название не должно превышать 200 символов')
        .optional()
        .or(z.literal('')),
    date: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD'),
    time: z.string()
        .regex(/^\d{2}:\d{2}$/, 'Время должно быть в формате HH:MM')
        .optional()
        .or(z.literal('')),
    type: z.enum(['info', 'important', 'event'], {
        errorMap: () => ({ message: 'Тип должен быть info, important или event' })
    }).default('event').optional(),
    status: z.enum(['draft', 'published'], {
        errorMap: () => ({ message: 'Статус должен быть draft или published' })
    }).default('draft').optional(),
    description_ru: z.string()
        .max(1000, 'Описание не должно превышать 1000 символов')
        .optional()
        .or(z.literal('')),
    description_uz: z.string()
        .max(1000, 'Описание не должно превышать 1000 символов')
        .optional()
        .or(z.literal('')),
    location_ru: z.string()
        .max(200, 'Место проведения не должно превышать 200 символов')
        .optional()
        .or(z.literal('')),
    location_uz: z.string()
        .max(200, 'Место проведения не должно превышать 200 символов')
        .optional()
        .or(z.literal(''))
});

export const bellsSchema = z.object({
    shift: z.enum(['1', '2'], {
        errorMap: () => ({ message: 'Смена должна быть 1 или 2' })
    }),
    bells: z.array(z.object({
        number: z.number().int().min(1).max(10),
        start: z.string().regex(/^\d{2}:\d{2}$/, 'Время должно быть в формате HH:MM'),
        end: z.string().regex(/^\d{2}:\d{2}$/, 'Время должно быть в формате HH:MM')
    }))
});

// Validation middleware factory
export function validate(schema) {
    return (req, res, next) => {
        try {
            const validated = schema.parse(req.body);
            req.body = validated; // Replace with validated data
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                return res.status(400).json({
                    ok: false,
                    error: 'Ошибка валидации',
                    details: errors
                });
            }
            return res.status(400).json({
                ok: false,
                error: 'Некорректные данные'
            });
        }
    };
}

// Sanitization helpers
export function sanitizeHtml(text) {
    if (typeof text !== 'string') return text;

    // Basic HTML escaping
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function sanitizeObject(obj, fields) {
    const sanitized = { ...obj };
    for (const field of fields) {
        if (sanitized[field]) {
            sanitized[field] = sanitizeHtml(sanitized[field]);
        }
    }
    return sanitized;
}
