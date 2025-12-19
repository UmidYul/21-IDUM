import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { requireAuth } from './auth-basic.js';
import db from '../database.js';
import { validate, teacherSchema } from '../middleware/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

function requireAdmin(req, res, next) {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'editor')) {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
    }
    next();
}

// GET /api/teachers - Get all teachers
router.get('/', async (req, res) => {
    try {
        await db.read();
        const teachers = (db.data.teachers || []).sort((a, b) => (a.order || 0) - (b.order || 0));
        res.json({ ok: true, teachers, count: teachers.length });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/teachers/:id - Get single teacher
router.get('/:id', async (req, res) => {
    try {
        await db.read();
        const teacher = (db.data.teachers || []).find(t => t.id === req.params.id);
        if (!teacher) return res.status(404).json({ ok: false, error: 'Teacher not found' });
        res.json({ ok: true, teacher });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/teachers - Create teacher (admin/editor only)
router.post('/', requireAuth, requireAdmin, validate(teacherSchema), async (req, res) => {
    try {
        const { name_ru, name_uz, position_ru, position_uz, email, phone, photoUrl } = req.body;

        await db.read();
        db.data.teachers ||= [];

        const teacher = {
            id: crypto.randomUUID(),
            name_ru: name_ru.trim(),
            name_uz: name_uz?.trim() || '',
            position_ru: position_ru.trim(),
            position_uz: position_uz?.trim() || '',
            bio_ru: bio_ru?.trim() || '',
            bio_uz: bio_uz?.trim() || '',
            photo: photo?.trim() || '',
            instagram: instagram?.trim() || '',
            telegram: telegram?.trim() || '',
            phone: phone?.trim() || '',
            status: status || 'draft',
            order: parseInt(order) || db.data.teachers.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: req.user.id,
            updatedBy: req.user.id
        };

        db.data.teachers.push(teacher);
        await db.write();

        console.log(`✅ Создан учитель: ${teacher.id} (${name_ru}) пользователем: ${req.user.username}`);
        res.json({ ok: true, teacher });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// PATCH /api/teachers/:id - Update teacher
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.read();

        if (!db.data.teachers) return res.status(404).json({ ok: false, error: 'Teachers not found' });

        const idx = db.data.teachers.findIndex(t => t.id === id);
        if (idx === -1) return res.status(404).json({ ok: false, error: 'Teacher not found' });

        const teacher = db.data.teachers[idx];
        const fields = ['name_ru', 'name_uz', 'position_ru', 'position_uz', 'bio_ru', 'bio_uz', 'photo', 'instagram', 'telegram', 'phone', 'status', 'order'];

        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'order') {
                    teacher[field] = parseInt(req.body[field]);
                } else {
                    teacher[field] = req.body[field]?.trim?.() || req.body[field];
                }
            }
        });

        teacher.updatedAt = new Date().toISOString();
        teacher.updatedBy = req.user.id;

        db.data.teachers[idx] = teacher;
        await db.write();

        console.log(`✅ Обновлен учитель: ${id} пользователем: ${req.user.username}`);
        res.json({ ok: true, teacher });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// DELETE /api/teachers/:id - Delete teacher
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.read();

        if (!db.data.teachers) return res.status(404).json({ ok: false, error: 'Teachers not found' });

        const idx = db.data.teachers.findIndex(t => t.id === id);
        if (idx === -1) return res.status(404).json({ ok: false, error: 'Teacher not found' });

        const teacher = db.data.teachers[idx];

        // Delete associated photo file if it exists
        if (teacher.photo && teacher.photo.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, '..', 'public', teacher.photo);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ Удалено фото учителя: ${filePath}`);
                } catch (error) {
                    console.error('Ошибка при удалении файла:', error);
                }
            }
        }

        db.data.teachers.splice(idx, 1);
        await db.write();

        console.log(`✅ Удален учитель: ${id} пользователем: ${req.user.username}`);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

export default router;
