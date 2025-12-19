import express from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { requireAuth } from './auth-basic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Choose an uploads root that works both locally and on Vercel (read-only filesystem).
const uploadsRoot = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : (process.env.VERCEL ? path.join(os.tmpdir(), 'uploads') : path.join(__dirname, '..', 'public', 'uploads'));

function ensureUploadsDir(subdir) {
    const target = path.join(uploadsRoot, subdir);
    try {
        fs.mkdirSync(target, { recursive: true });
        return target;
    } catch (error) {
        // On read-only FS (e.g., Vercel /var/task) fall back to /tmp to avoid crashes
        const fallback = path.join(os.tmpdir(), 'uploads', subdir);
        try {
            fs.mkdirSync(fallback, { recursive: true });
            return fallback;
        } catch (fallbackError) {
            throw fallbackError;
        }
    }
}

const newsUploadsDir = ensureUploadsDir('news');
const teachersUploadsDir = ensureUploadsDir('teachers');
const galleryUploadsDir = ensureUploadsDir('gallery');
const albumCoversDir = ensureUploadsDir('album-covers');

// Helper function to delete old file
function deleteOldFile(filePath) {
    if (filePath && fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            } catch (error) {
            }
    }
}

// Configure multer for news covers
const newsStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, newsUploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'news-' + uniqueSuffix + ext);
    }
});

// Configure multer for teacher photos
const teacherStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, teachersUploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'teacher-' + uniqueSuffix + ext);
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

const newsUpload = multer({
    storage: newsStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const teacherUpload = multer({
    storage: teacherStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit for teacher photos
});

// Configure multer for gallery photos
const galleryStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, galleryUploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'gallery-' + uniqueSuffix + ext);
    }
});

const galleryUpload = multer({
    storage: galleryStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for gallery photos
});

// Configure multer for album covers
const albumCoverStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, albumCoversDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'album-cover-' + uniqueSuffix + ext);
    }
});

const albumCoverUpload = multer({
    storage: albumCoverStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for album covers
});

// POST /api/upload/news-cover - Upload news cover image (protected)
router.post('/news-cover', requireAuth, newsUpload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ ok: false, error: 'Файл не загружен' });
        }

        const fileUrl = '/uploads/news/' + req.file.filename;

        res.json({
            ok: true,
            url: fileUrl,
            filename: req.file.filename,
            size: req.file.size
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Ошибка загрузки файла' });
    }
});

// POST /api/upload/teacher-photo - Upload teacher photo (protected)
router.post('/teacher-photo', requireAuth, teacherUpload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ ok: false, error: 'Файл не загружен' });
        }

        const fileUrl = '/uploads/teachers/' + req.file.filename;

        res.json({
            ok: true,
            url: fileUrl,
            filename: req.file.filename,
            size: req.file.size
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Ошибка загрузки файла' });
    }
});

// POST /api/upload/gallery-photos - Upload gallery photos (multiple, protected)
router.post('/gallery-photos', requireAuth, galleryUpload.array('images', 20), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ ok: false, error: 'Файлы не загружены' });
        }

        const uploadedFiles = req.files.map(file => ({
            url: '/uploads/gallery/' + file.filename,
            filename: file.filename,
            size: file.size
        }));

        res.json({
            ok: true,
            files: uploadedFiles,
            count: uploadedFiles.length
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Ошибка загрузки файлов' });
    }
});

// POST /api/upload/album-cover - Upload album cover (protected)
router.post('/album-cover', requireAuth, albumCoverUpload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ ok: false, error: 'Файл не загружен' });
        }

        const fileUrl = '/uploads/album-covers/' + req.file.filename;

        res.json({
            ok: true,
            url: fileUrl,
            filename: req.file.filename,
            size: req.file.size
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: 'Ошибка загрузки файла' });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ ok: false, error: 'Файл слишком большой (макс. 10MB для галереи, 5MB для новостей, 2MB для учителей)' });
        }
        return res.status(400).json({ ok: false, error: error.message });
    }
    if (error) {
        return res.status(400).json({ ok: false, error: error.message });
    }
    next(error);
});

export default router;

