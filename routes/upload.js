import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { requireAuth } from './auth-basic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'news');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'news-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Только изображения разрешены!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// POST /api/upload/news-cover - Upload news cover image (protected)
router.post('/news-cover', requireAuth, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ ok: false, error: 'Файл не загружен' });
        }

        const fileUrl = '/uploads/news/' + req.file.filename;

        console.log(`✅ Загружено изображение: ${req.file.filename} пользователем: ${req.user.username}`);

        res.json({
            ok: true,
            url: fileUrl,
            filename: req.file.filename,
            size: req.file.size
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ ok: false, error: 'Ошибка загрузки файла' });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ ok: false, error: 'Файл слишком большой (макс. 5MB)' });
        }
        return res.status(400).json({ ok: false, error: error.message });
    }
    next(error);
});

export default router;
