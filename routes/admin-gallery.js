import express from 'express';
import crypto from 'crypto';
import { requireAuth } from './auth-basic.js';
import db from '../database.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// ============ ALBUMS MANAGEMENT ============

// GET /api/admin/gallery/albums - Get all albums
router.get('/albums', async (req, res) => {
    try {
        await db.read();
        const albums = (db.data.gallery?.albums || [])
            .map(album => ({
                ...album,
                photoCount: album.photos?.length || 0
            }))
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        res.json({
            ok: true,
            albums,
            count: albums.length
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки альбомов:', error);
        res.status(500).json({ ok: false, error: 'Ошибка загрузки альбомов' });
    }
});

// GET /api/admin/gallery/albums/:id - Get single album
router.get('/albums/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.read();

        const album = (db.data.gallery?.albums || []).find(a => a.id === id);

        if (!album) {
            return res.status(404).json({ ok: false, error: 'Альбом не найден' });
        }

        res.json({ ok: true, album });
    } catch (error) {
        console.error('❌ Ошибка загрузки альбома:', error);
        res.status(500).json({ ok: false, error: 'Ошибка загрузки альбома' });
    }
});

// POST /api/admin/gallery/albums - Create album
router.post('/albums', async (req, res) => {
    try {
        const { title_ru, title_uz, description_ru, description_uz, coverPhoto, status, order } = req.body;

        if (!title_ru?.trim()) {
            return res.status(400).json({ ok: false, error: 'Название на русском обязательно' });
        }

        await db.read();

        if (!db.data.gallery) {
            db.data.gallery = { albums: [], photos: [] };
        }

        const newAlbum = {
            id: crypto.randomUUID(),
            title_ru: title_ru.trim(),
            title_uz: title_uz?.trim() || '',
            description_ru: description_ru?.trim() || '',
            description_uz: description_uz?.trim() || '',
            coverPhoto: coverPhoto || '',
            status: status || 'draft',
            order: order || 0,
            photos: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: req.user.id
        };

        db.data.gallery.albums.push(newAlbum);
        await db.write();

        console.log(`✅ Создан альбом: ${newAlbum.id} (${title_ru}) пользователем: ${req.user.username}`);

        res.json({ ok: true, album: newAlbum });
    } catch (error) {
        console.error('❌ Ошибка создания альбома:', error);
        res.status(500).json({ ok: false, error: 'Ошибка создания альбома' });
    }
});

// PATCH /api/admin/gallery/albums/:id - Update album
router.patch('/albums/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        await db.read();

        if (!db.data.gallery?.albums) {
            return res.status(404).json({ ok: false, error: 'Альбомы не найдены' });
        }

        const albumIndex = db.data.gallery.albums.findIndex(a => a.id === id);

        if (albumIndex === -1) {
            return res.status(404).json({ ok: false, error: 'Альбом не найден' });
        }

        const album = db.data.gallery.albums[albumIndex];

        // Update fields
        const allowedFields = ['title_ru', 'title_uz', 'description_ru', 'description_uz', 'coverPhoto', 'status', 'order'];
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                const val = updates[field];
                album[field] = typeof val === 'string' ? val.trim() : val;
            }
        });

        album.updatedAt = new Date().toISOString();
        album.updatedBy = req.user.id;

        db.data.gallery.albums[albumIndex] = album;
        await db.write();

        console.log(`✅ Обновлен альбом: ${id} пользователем: ${req.user.username}`);

        res.json({ ok: true, album });
    } catch (error) {
        console.error('❌ Ошибка обновления альбома:', error);
        res.status(500).json({ ok: false, error: 'Ошибка обновления альбома' });
    }
});

// DELETE /api/admin/gallery/albums/:id - Delete album
router.delete('/albums/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.read();

        if (!db.data.gallery?.albums) {
            return res.status(404).json({ ok: false, error: 'Альбомы не найдены' });
        }

        const albumIndex = db.data.gallery.albums.findIndex(a => a.id === id);

        if (albumIndex === -1) {
            return res.status(404).json({ ok: false, error: 'Альбом не найден' });
        }

        db.data.gallery.albums.splice(albumIndex, 1);
        await db.write();

        console.log(`✅ Удален альбом: ${id} пользователем: ${req.user.username}`);

        res.json({ ok: true });
    } catch (error) {
        console.error('❌ Ошибка удаления альбома:', error);
        res.status(500).json({ ok: false, error: 'Ошибка удаления альбома' });
    }
});

// ============ PHOTOS MANAGEMENT ============

// POST /api/admin/gallery/albums/:albumId/photos - Add photo to album
router.post('/albums/:albumId/photos', async (req, res) => {
    try {
        const { albumId } = req.params;
        const { url, caption_ru, caption_uz, order } = req.body;

        if (!url?.trim()) {
            return res.status(400).json({ ok: false, error: 'URL фото обязателен' });
        }

        await db.read();

        const album = (db.data.gallery?.albums || []).find(a => a.id === albumId);

        if (!album) {
            return res.status(404).json({ ok: false, error: 'Альбом не найден' });
        }

        if (!album.photos) {
            album.photos = [];
        }

        const newPhoto = {
            id: crypto.randomUUID(),
            url: url.trim(),
            caption_ru: caption_ru?.trim() || '',
            caption_uz: caption_uz?.trim() || '',
            order: order || album.photos.length,
            addedAt: new Date().toISOString()
        };

        album.photos.push(newPhoto);
        album.updatedAt = new Date().toISOString();
        album.updatedBy = req.user.id;

        // Update cover photo if first photo
        if (album.photos.length === 1 && !album.coverPhoto) {
            album.coverPhoto = newPhoto.url;
        }

        await db.write();

        console.log(`✅ Добавлено фото в альбом ${albumId} пользователем: ${req.user.username}`);

        res.json({ ok: true, photo: newPhoto, album });
    } catch (error) {
        console.error('❌ Ошибка добавления фото:', error);
        res.status(500).json({ ok: false, error: 'Ошибка добавления фото' });
    }
});

// PATCH /api/admin/gallery/albums/:albumId/photos/:photoId - Update photo
router.patch('/albums/:albumId/photos/:photoId', async (req, res) => {
    try {
        const { albumId, photoId } = req.params;
        const updates = req.body;

        await db.read();

        const album = (db.data.gallery?.albums || []).find(a => a.id === albumId);

        if (!album) {
            return res.status(404).json({ ok: false, error: 'Альбом не найден' });
        }

        const photoIndex = (album.photos || []).findIndex(p => p.id === photoId);

        if (photoIndex === -1) {
            return res.status(404).json({ ok: false, error: 'Фото не найдено' });
        }

        const photo = album.photos[photoIndex];

        // Update fields
        const allowedFields = ['url', 'caption_ru', 'caption_uz', 'order'];
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                const val = updates[field];
                photo[field] = typeof val === 'string' ? val.trim() : val;
            }
        });

        album.photos[photoIndex] = photo;
        album.updatedAt = new Date().toISOString();
        album.updatedBy = req.user.id;

        await db.write();

        console.log(`✅ Обновлено фото ${photoId} в альбоме ${albumId} пользователем: ${req.user.username}`);

        res.json({ ok: true, photo, album });
    } catch (error) {
        console.error('❌ Ошибка обновления фото:', error);
        res.status(500).json({ ok: false, error: 'Ошибка обновления фото' });
    }
});

// DELETE /api/admin/gallery/albums/:albumId/photos/:photoId - Delete photo
router.delete('/albums/:albumId/photos/:photoId', async (req, res) => {
    try {
        const { albumId, photoId } = req.params;
        await db.read();

        const album = (db.data.gallery?.albums || []).find(a => a.id === albumId);

        if (!album) {
            return res.status(404).json({ ok: false, error: 'Альбом не найден' });
        }

        const photoIndex = (album.photos || []).findIndex(p => p.id === photoId);

        if (photoIndex === -1) {
            return res.status(404).json({ ok: false, error: 'Фото не найдено' });
        }

        album.photos.splice(photoIndex, 1);
        album.updatedAt = new Date().toISOString();
        album.updatedBy = req.user.id;

        await db.write();

        console.log(`✅ Удалено фото ${photoId} из альбома ${albumId} пользователем: ${req.user.username}`);

        res.json({ ok: true });
    } catch (error) {
        console.error('❌ Ошибка удаления фото:', error);
        res.status(500).json({ ok: false, error: 'Ошибка удаления фото' });
    }
});

export default router;
