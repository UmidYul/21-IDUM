import express from 'express';
import db from '../database.js';

const router = express.Router();

// GET /api/gallery/albums - Get all published albums
router.get('/albums', async (req, res) => {
    try {
        await db.read();
        const albums = (db.data.gallery?.albums || [])
            .filter(a => a.status === 'published')
            .map(album => ({
                id: album.id,
                title_ru: album.title_ru,
                title_uz: album.title_uz,
                description_ru: album.description_ru || '',
                description_uz: album.description_uz || '',
                coverPhoto: album.coverPhoto || '',
                photoCount: album.photos?.length || 0,
                createdAt: album.createdAt
            }))
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        res.json({
            ok: true,
            albums,
            count: albums.length
        });
    } catch (error) {
        console.error('❌ Ошибка получения альбомов:', error);
        res.status(500).json({ ok: false, error: 'Ошибка загрузки альбомов' });
    }
});

// GET /api/gallery/albums/:id - Get single album with photos
router.get('/albums/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.read();

        const album = (db.data.gallery?.albums || []).find(a => a.id === id && a.status === 'published');

        if (!album) {
            return res.status(404).json({ ok: false, error: 'Альбом не найден' });
        }

        const photos = (album.photos || [])
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        res.json({
            ok: true,
            album: {
                id: album.id,
                title_ru: album.title_ru,
                title_uz: album.title_uz,
                description_ru: album.description_ru || '',
                description_uz: album.description_uz || '',
                photos
            }
        });
    } catch (error) {
        console.error('❌ Ошибка получения альбома:', error);
        res.status(500).json({ ok: false, error: 'Ошибка загрузки альбома' });
    }
});

export default router;
