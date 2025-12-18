(function () {
    const logoutBtn = document.getElementById('logoutBtn');
    const userLabel = document.getElementById('userLabel');

    const albumsTable = document.getElementById('albumsTable');
    const photosView = document.getElementById('photosView');
    const photosGrid = document.getElementById('photosGrid');

    const createAlbumBtn = document.getElementById('createAlbumBtn');
    const backToAlbumsBtn = document.getElementById('backToAlbumsBtn');
    const addPhotoBtn = document.getElementById('addPhotoBtn');

    const albumModal = document.getElementById('albumModal');
    const albumForm = document.getElementById('albumForm');
    const albumModalTitle = document.getElementById('albumModalTitle');
    const albumErrorBox = document.getElementById('albumErrorBox');
    const saveAlbumBtn = document.getElementById('saveAlbumBtn');
    const cancelAlbumBtn = document.getElementById('cancelAlbumBtn');

    const photoModal = document.getElementById('photoModal');
    const photoForm = document.getElementById('photoForm');
    const photoErrorBox = document.getElementById('photoErrorBox');
    const savePhotoBtn = document.getElementById('savePhotoBtn');
    const cancelPhotoBtn = document.getElementById('cancelPhotoBtn');

    let currentAlbumId = null;
    let isEditMode = false;

    // Tab switching
    document.querySelectorAll('.form-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const lang = tab.getAttribute('data-lang');
            const modal = tab.closest('.modal-content');
            modal.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
            modal.querySelectorAll('.lang-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            modal.querySelector(`.lang-content[data-lang="${lang}"]`).classList.add('active');
        });
    });

    function show(el, text) {
        if (!el) return;
        el.textContent = text || '';
        el.style.display = 'block';
    }

    function hide(el) {
        if (!el) return;
        el.style.display = 'none';
        el.textContent = '';
    }

    async function me() {
        try {
            const r = await fetch('/api/auth/me', { credentials: 'same-origin' });
            if (!r.ok) return null;
            const j = await r.json();
            return j.user;
        } catch (e) {
            return null;
        }
    }

    // Load albums
    async function loadAlbums() {
        try {
            const r = await fetch('/api/admin/gallery/albums', { credentials: 'same-origin' });
            if (!r.ok) throw new Error('Failed to load');
            const data = await r.json();
            renderAlbums(data.albums || []);
        } catch (err) {
            albumsTable.innerHTML = '<div class="empty">Ошибка загрузки альбомов</div>';
        }
    }

    function renderAlbums(albums) {
        if (albums.length === 0) {
            albumsTable.innerHTML = '<div class="empty">Альбомов пока нет. Создайте первый!</div>';
            return;
        }

        const rows = albums.map(album => {
            const statusBadge = album.status === 'published'
                ? '<span class="badge badge-success">Опубликовано</span>'
                : '<span class="badge badge-secondary">Черновик</span>';

            return `
                <tr>
                    <td>
                        ${album.coverPhoto ? `<img src="${album.coverPhoto}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; margin-right: 12px; vertical-align: middle;">` : ''}
                        <strong>${album.title_ru}</strong><br>
                        <span class="muted">${album.title_uz || ''}</span>
                    </td>
                    <td>${album.photoCount} фото</td>
                    <td>${statusBadge}</td>
                    <td>${album.order}</td>
                    <td>
                        <button class="btn btn-sm" onclick="viewAlbumPhotos('${album.id}')">Фото</button>
                        <button class="btn btn-sm" onclick="editAlbum('${album.id}')">Редактировать</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteAlbum('${album.id}')">Удалить</button>
                    </td>
                </tr>
            `;
        }).join('');

        albumsTable.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Альбом</th>
                        <th>Фото</th>
                        <th>Статус</th>
                        <th>Порядок</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    function openModal(modal) {
        if (!modal) return;
        modal.style.display = 'flex';
        modal.scrollTop = 0;
        const content = modal.querySelector('.modal-content');
        if (content) content.scrollTop = 0;
        window.scrollTo(0, 0);
        document.body.classList.add('modal-open');
        document.documentElement.classList.add('modal-open');
    }

    function closeModal(modal) {
        if (!modal) return;
        modal.style.display = 'none';
        const content = modal.querySelector('.modal-content');
        if (content) content.scrollTop = 0;
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
    }

    // Create album
    createAlbumBtn.addEventListener('click', () => {
        isEditMode = false;
        currentAlbumId = null;
        albumModalTitle.textContent = 'Создать альбом';
        albumForm.reset();
        hide(albumErrorBox);
        openModal(albumModal);
    });

    cancelAlbumBtn.addEventListener('click', () => {
        closeModal(albumModal);
    });

    albumForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hide(albumErrorBox);
        saveAlbumBtn.disabled = true;

        try {
            const payload = {
                title_ru: document.getElementById('title_ru').value.trim(),
                title_uz: document.getElementById('title_uz').value.trim(),
                description_ru: document.getElementById('description_ru').value.trim(),
                description_uz: document.getElementById('description_uz').value.trim(),
                coverPhoto: document.getElementById('coverPhoto').value.trim(),
                status: document.getElementById('status').value,
                order: parseInt(document.getElementById('order').value) || 0
            };

            const url = isEditMode ? `/api/admin/gallery/albums/${currentAlbumId}` : '/api/admin/gallery/albums';
            const method = isEditMode ? 'PATCH' : 'POST';

            const r = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...getCSRFHeaders()
                },
                body: JSON.stringify(payload),
                credentials: 'same-origin'
            });

            const data = await r.json();
            if (!r.ok || !data.ok) {
                throw new Error(data.error || 'Ошибка сохранения');
            }

            closeModal(albumModal);
            loadAlbums();
        } catch (err) {
            show(albumErrorBox, err.message || 'Ошибка сохранения');
        } finally {
            saveAlbumBtn.disabled = false;
        }
    });

    // Edit album
    window.editAlbum = async function (id) {
        try {
            const r = await fetch(`/api/admin/gallery/albums/${id}`, { credentials: 'same-origin' });
            if (!r.ok) throw new Error('Failed to load');
            const data = await r.json();
            const album = data.album;

            isEditMode = true;
            currentAlbumId = id;
            albumModalTitle.textContent = 'Редактировать альбом';

            document.getElementById('title_ru').value = album.title_ru || '';
            document.getElementById('title_uz').value = album.title_uz || '';
            document.getElementById('description_ru').value = album.description_ru || '';
            document.getElementById('description_uz').value = album.description_uz || '';
            document.getElementById('coverPhoto').value = album.coverPhoto || '';
            document.getElementById('status').value = album.status || 'draft';
            document.getElementById('order').value = album.order || 0;

            hide(albumErrorBox);
            openModal(albumModal);
        } catch (err) {
            alert('Ошибка загрузки альбома');
        }
    };

    // Delete album
    window.deleteAlbum = async function (id) {
        if (!confirm('Удалить этот альбом и все фотографии в нем?')) return;

        try {
            const r = await fetch(`/api/admin/gallery/albums/${id}`, {
                method: 'DELETE',
                headers: getCSRFHeaders(),
                credentials: 'same-origin'
            });

            if (!r.ok) throw new Error();
            loadAlbums();
        } catch (err) {
            alert('Ошибка удаления');
        }
    };

    // View album photos
    window.viewAlbumPhotos = async function (id) {
        try {
            const r = await fetch(`/api/admin/gallery/albums/${id}`, { credentials: 'same-origin' });
            if (!r.ok) throw new Error('Failed to load');
            const data = await r.json();
            const album = data.album;

            currentAlbumId = id;

            document.getElementById('currentAlbumTitle').textContent = album.title_ru;
            document.getElementById('currentAlbumDesc').textContent = album.description_ru || '';

            renderPhotos(album.photos || []);

            albumsTable.style.display = 'none';
            createAlbumBtn.style.display = 'none';
            photosView.style.display = 'block';
        } catch (err) {
            alert('Ошибка загрузки альбома');
        }
    };

    function renderPhotos(photos) {
        if (photos.length === 0) {
            photosGrid.innerHTML = '<div class="empty">В альбоме пока нет фотографий. Добавьте первое!</div>';
            return;
        }

        const cards = photos.map(photo => `
            <div class="photo-card">
                <img src="${photo.url}" alt="${photo.caption_ru || ''}">
                <div class="photo-actions">
                    <button class="btn-danger" onclick="deletePhoto('${photo.id}')" title="Удалить">🗑️</button>
                </div>
            </div>
        `).join('');

        photosGrid.innerHTML = cards;
    }

    backToAlbumsBtn.addEventListener('click', () => {
        currentAlbumId = null;
        albumsTable.style.display = 'block';
        createAlbumBtn.style.display = 'block';
        photosView.style.display = 'none';
        loadAlbums();
    });

    // Add photo
    addPhotoBtn.addEventListener('click', () => {
        photoForm.reset();
        hide(photoErrorBox);
        openModal(photoModal);
    });

    cancelPhotoBtn.addEventListener('click', () => {
        closeModal(photoModal);
    });

    photoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hide(photoErrorBox);
        savePhotoBtn.disabled = true;

        try {
            const payload = {
                url: document.getElementById('photoUrl').value.trim(),
                caption_ru: document.getElementById('caption_ru').value.trim(),
                caption_uz: document.getElementById('caption_uz').value.trim()
            };

            const r = await fetch(`/api/admin/gallery/albums/${currentAlbumId}/photos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getCSRFHeaders()
                },
                body: JSON.stringify(payload),
                credentials: 'same-origin'
            });

            const data = await r.json();
            if (!r.ok || !data.ok) {
                throw new Error(data.error || 'Ошибка добавления фото');
            }

            closeModal(photoModal);
            renderPhotos(data.album.photos || []);
        } catch (err) {
            show(photoErrorBox, err.message || 'Ошибка добавления');
        } finally {
            savePhotoBtn.disabled = false;
        }
    });

    // Delete photo
    window.deletePhoto = async function (photoId) {
        if (!confirm('Удалить это фото?')) return;

        try {
            const r = await fetch(`/api/admin/gallery/albums/${currentAlbumId}/photos/${photoId}`, {
                method: 'DELETE',
                headers: getCSRFHeaders(),
                credentials: 'same-origin'
            });

            if (!r.ok) throw new Error();

            const data = await r.json();
            renderPhotos(data.album?.photos || []);
        } catch (err) {
            alert('Ошибка удаления');
        }
    };

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
            } catch (e) { }
            window.location.href = '/admin/login';
        });
    }

    // Initialize
    (async () => {
        const user = await me();
        if (!user) {
            window.location.href = '/admin/login';
            return;
        }
        if (user.role !== 'admin' && user.role !== 'editor') {
            window.location.href = '/admin';
            return;
        }
        if (userLabel) userLabel.textContent = user.username;
        loadAlbums();
    })();
})();
