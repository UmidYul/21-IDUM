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

        // Manually clear form fields instead of reset()
        const titleRu = document.getElementById('title_ru');
        const titleUz = document.getElementById('title_uz');
        const descRu = document.getElementById('description_ru');
        const descUz = document.getElementById('description_uz');
        const coverPhotoFile = document.getElementById('coverPhotoFile');
        const coverPhoto = document.getElementById('coverPhoto');
        const status = document.getElementById('status');
        const order = document.getElementById('order');

        if (titleRu) titleRu.value = '';
        if (titleUz) titleUz.value = '';
        if (descRu) descRu.value = '';
        if (descUz) descUz.value = '';
        if (coverPhotoFile) coverPhotoFile.value = '';
        if (coverPhoto) coverPhoto.value = '';
        if (status) status.value = 'draft';
        if (order) order.value = '0';

        hide(albumErrorBox);
        const coverPreview = document.getElementById('coverPreview');
        if (coverPreview) coverPreview.style.display = 'none';
        const nameEl = document.querySelector('[data-filedrop-name="coverPhotoFile"]');
        if (nameEl) nameEl.textContent = 'Файл не выбран';
        openModal(albumModal);
    });

    cancelAlbumBtn.addEventListener('click', () => {
        closeModal(albumModal);
    });

    // Cover photo upload handler
    const coverPhotoInput = document.getElementById('coverPhotoFile');
    if (coverPhotoInput) {
        coverPhotoInput.addEventListener('change', async (e) => {
            try {
                const file = e.target?.files?.[0];
                if (!file) return;

                const coverPreview = document.getElementById('coverPreview');
                const coverPreviewImg = document.getElementById('coverPreviewImg');
                const coverPhotoHidden = document.getElementById('coverPhoto');

                // Validate
                const maxSize = 5 * 1024 * 1024; // 5MB
                if (file.size > maxSize) {
                    show(albumErrorBox, 'Файл слишком большой (макс. 5MB)');
                    if (coverPhotoInput) coverPhotoInput.value = '';
                    return;
                }

                if (!file.type.startsWith('image/')) {
                    show(albumErrorBox, 'Файл должен быть изображением');
                    if (coverPhotoInput) coverPhotoInput.value = '';
                    return;
                }

                // Show preview
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if (coverPreviewImg) coverPreviewImg.src = ev.target.result;
                    if (coverPreview) coverPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);

                // Upload
                try {
                    const formData = new FormData();
                    formData.append('image', file);

                    const uploadRes = await fetch('/api/upload/album-cover', {
                        method: 'POST',
                        headers: getCSRFHeaders(),
                        body: formData,
                        credentials: 'same-origin'
                    });

                    const uploadData = await uploadRes.json();
                    if (!uploadRes.ok || !uploadData.ok) {
                        throw new Error(uploadData.error || 'Ошибка загрузки');
                    }

                    if (coverPhotoHidden) coverPhotoHidden.value = uploadData.url;
                    hide(albumErrorBox);
                } catch (err) {
                    show(albumErrorBox, 'Ошибка загрузки обложки: ' + err.message);
                    if (coverPhotoInput) coverPhotoInput.value = '';
                    if (coverPreview) coverPreview.style.display = 'none';
                }
            } catch (err) {
                show(albumErrorBox, 'Ошибка: ' + err.message);
            }
        });
    }

    // Remove cover button
    const removeCoverBtn = document.getElementById('removeCover');
    if (removeCoverBtn) {
        removeCoverBtn.addEventListener('click', () => {
            const coverPhotoInput = document.getElementById('coverPhotoFile');
            const coverPhotoHidden = document.getElementById('coverPhoto');
            const coverPreview = document.getElementById('coverPreview');
            const nameEl = document.querySelector('[data-filedrop-name="coverPhotoFile"]');

            if (coverPhotoInput) coverPhotoInput.value = '';
            if (coverPhotoHidden) coverPhotoHidden.value = '';
            if (coverPreview) coverPreview.style.display = 'none';
            if (nameEl) nameEl.textContent = 'Файл не выбран';
        });
    }

    albumForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hide(albumErrorBox);
        saveAlbumBtn.disabled = true;

        try {
            const titleRu = document.getElementById('title_ru');
            const titleUz = document.getElementById('title_uz');
            const descRu = document.getElementById('description_ru');
            const descUz = document.getElementById('description_uz');
            const coverPhotoEl = document.getElementById('coverPhoto');
            const statusEl = document.getElementById('status');
            const orderEl = document.getElementById('order');

            const payload = {
                title_ru: titleRu?.value?.trim() || '',
                title_uz: titleUz?.value?.trim() || '',
                description_ru: descRu?.value?.trim() || '',
                description_uz: descUz?.value?.trim() || '',
                coverPhoto: coverPhotoEl?.value?.trim() || '',
                status: statusEl?.value || 'draft',
                order: parseInt(orderEl?.value || '0') || 0
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

            const titleRu = document.getElementById('title_ru');
            const titleUz = document.getElementById('title_uz');
            const descRu = document.getElementById('description_ru');
            const descUz = document.getElementById('description_uz');
            const coverPhotoEl = document.getElementById('coverPhoto');
            const statusEl = document.getElementById('status');
            const orderEl = document.getElementById('order');

            if (titleRu) titleRu.value = album.title_ru || '';
            if (titleUz) titleUz.value = album.title_uz || '';
            if (descRu) descRu.value = album.description_ru || '';
            if (descUz) descUz.value = album.description_uz || '';
            if (coverPhotoEl) coverPhotoEl.value = album.coverPhoto || '';
            if (statusEl) statusEl.value = album.status || 'draft';
            if (orderEl) orderEl.value = album.order || 0;

            // Show existing cover if available
            const coverPreview = document.getElementById('coverPreview');
            const coverPreviewImg = document.getElementById('coverPreviewImg');
            if (album.coverPhoto && coverPreviewImg && coverPreview) {
                coverPreviewImg.src = album.coverPhoto;
                coverPreview.style.display = 'block';
            } else if (coverPreview) {
                coverPreview.style.display = 'none';
            }

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
        hide(photoErrorBox);

        // Manually clear form fields instead of reset() to avoid triggering change events
        if (photoFilesInput) {
            photoFilesInput.value = '';
        } else {
            }

        const captionRu = document.getElementById('caption_ru');
        const captionUz = document.getElementById('caption_uz');
        if (captionRu) captionRu.value = '';
        if (captionUz) captionUz.value = '';

        const previewsContainer = document.getElementById('photosPreviews');
        if (previewsContainer) {
            previewsContainer.innerHTML = '';
            previewsContainer.style.display = 'none';
        }
        const nameEl = document.querySelector('[data-filedrop-name="photoFiles"]');
        if (nameEl) nameEl.textContent = 'Файлы не выбраны';

        openModal(photoModal);
    });

    cancelPhotoBtn.addEventListener('click', () => {
        closeModal(photoModal);
    });

    // Photo file selection handler
    const photoFilesInput = document.getElementById('photoFiles');
    if (photoFilesInput) {
        photoFilesInput.addEventListener('change', function (e) {
            try {
                const files = this.files;
                const previewsContainer = document.getElementById('photosPreviews');
                const nameEl = document.querySelector('[data-filedrop-name="photoFiles"]');

                if (!files || files.length === 0) {
                    if (previewsContainer) {
                        previewsContainer.innerHTML = '';
                        previewsContainer.style.display = 'none';
                    }
                    if (nameEl) nameEl.textContent = 'Файлы не выбраны';
                    return;
                }

                // Update file count
                if (nameEl) {
                    nameEl.textContent = files.length === 1
                        ? files[0].name
                        : `Выбрано файлов: ${files.length}`;
                }

                // Show previews
                if (previewsContainer) {
                    previewsContainer.innerHTML = '';
                    previewsContainer.style.display = 'grid';

                    Array.from(files).forEach(file => {
                        if (file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = function (ev) {
                                const img = document.createElement('img');
                                img.src = ev.target.result;
                                img.style.width = '100%';
                                img.style.height = '100px';
                                img.style.objectFit = 'cover';
                                img.style.borderRadius = '8px';
                                img.style.border = '1px solid #e5e7eb';
                                previewsContainer.appendChild(img);
                            };
                            reader.readAsDataURL(file);
                        }
                    });
                }
                } catch (err) {
                }
        });
    } else {
        }

    photoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hide(photoErrorBox);
        savePhotoBtn.disabled = true;

        try {
            const photoInput = document.getElementById('photoFiles');
            if (!photoInput) {
                throw new Error('Элемент загрузки файлов не найден');
            }

            if (!photoInput.files || photoInput.files.length === 0) {
                throw new Error('Выберите хотя бы одно фото');
            }

            const files = photoInput.files;
            // Client-side validation
            const maxSize = 10 * 1024 * 1024; // 10MB
            for (let file of files) {
                if (!file.type.startsWith('image/')) {
                    throw new Error(`Файл ${file.name} не является изображением`);
                }
                if (file.size > maxSize) {
                    throw new Error(`Файл ${file.name} слишком большой (макс. 10MB)`);
                }
            }

            // Upload files
            const formData = new FormData();
            Array.from(files).forEach(file => {
                formData.append('images', file);
            });

            const uploadRes = await fetch('/api/upload/gallery-photos', {
                method: 'POST',
                headers: getCSRFHeaders(),
                body: formData,
                credentials: 'same-origin'
            });

            const uploadData = await uploadRes.json();
            if (!uploadRes.ok || !uploadData.ok) {
                throw new Error(uploadData.error || 'Ошибка загрузки файлов');
            }

            // Get captions
            const captionRuInput = document.getElementById('caption_ru');
            const captionUzInput = document.getElementById('caption_uz');

            const caption_ru = captionRuInput ? captionRuInput.value.trim() : '';
            const caption_uz = captionUzInput ? captionUzInput.value.trim() : '';

            // Add all photos sequentially
            for (const file of uploadData.files) {
                const photoData = {
                    url: file.url,
                    caption_ru,
                    caption_uz
                };

                const r = await fetch(`/api/admin/gallery/albums/${currentAlbumId}/photos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getCSRFHeaders()
                    },
                    body: JSON.stringify(photoData),
                    credentials: 'same-origin'
                });

                const data = await r.json();
                if (!r.ok || !data.ok) {
                    }
            }

            // Reload album to show all photos
            const albumRes = await fetch(`/api/admin/gallery/albums/${currentAlbumId}`, {
                credentials: 'same-origin'
            });

            if (albumRes.ok) {
                const albumData = await albumRes.json();
                renderPhotos(albumData.album?.photos || []);
            }

            closeModal(photoModal);
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

