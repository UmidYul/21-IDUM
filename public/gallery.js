(function () {
    let currentAlbum = null;
    let currentPhotos = [];
    let currentPhotoIndex = 0;
    const lang = localStorage.getItem('lang') || 'ru';

    const albumsView = document.getElementById('albumsView');
    const albumView = document.getElementById('albumView');
    const albumsGrid = document.getElementById('albumsGrid');
    const photosGrid = document.getElementById('photosGrid');
    const backBtn = document.getElementById('backBtn');
    const albumTitle = document.getElementById('albumTitle');
    const albumDescription = document.getElementById('albumDescription');

    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');

    // Initialize
    init();

    async function init() {
        await loadAlbums();
        setupEventListeners();
        setupLazyLoading();
    }

    function setupEventListeners() {
        backBtn.addEventListener('click', showAlbumsView);
        lightboxClose.addEventListener('click', closeLightbox);
        lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
        lightboxNext.addEventListener('click', () => navigateLightbox(1));

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;

            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') navigateLightbox(-1);
            if (e.key === 'ArrowRight') navigateLightbox(1);
        });

        // Click outside to close
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    async function loadAlbums() {
        try {
            const r = await fetch('/api/gallery/albums');
            if (!r.ok) throw new Error('Failed to load albums');
            const data = await r.json();
            renderAlbums(data.albums || []);
        } catch (err) {
            albumsGrid.innerHTML = '<div class="empty-state"><p>Не удалось загрузить альбомы</p></div>';
        }
    }

    function renderAlbums(albums) {
        if (albums.length === 0) {
            albumsGrid.innerHTML = `
                <div class="empty-state">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <h3>Альбомов пока нет</h3>
                    <p>Фотографии появятся здесь позже</p>
                </div>
            `;
            return;
        }

        const cards = albums.map(album => {
            const title = lang === 'uz' && album.title_uz ? album.title_uz : album.title_ru;
            const desc = lang === 'uz' && album.description_uz ? album.description_uz : album.description_ru;
            const coverSrc = album.coverPhoto || '/images/placeholder.jpg';

            return `
                <div class="album-card" data-album-id="${album.id}">
                    <img src="${coverSrc}" alt="${title}" class="album-cover" loading="lazy">
                    <div class="album-info">
                        <h3 class="album-title">${title}</h3>
                        ${desc ? `<p class="album-desc">${desc}</p>` : ''}
                        <div class="album-meta">📸 ${album.photoCount} фото</div>
                    </div>
                </div>
            `;
        }).join('');

        albumsGrid.innerHTML = cards;

        // Add click handlers
        document.querySelectorAll('.album-card').forEach(card => {
            card.addEventListener('click', () => {
                const albumId = card.getAttribute('data-album-id');
                openAlbum(albumId);
            });
        });
    }

    async function openAlbum(albumId) {
        try {
            const r = await fetch(`/api/gallery/albums/${albumId}`);
            if (!r.ok) throw new Error('Failed to load album');
            const data = await r.json();

            currentAlbum = data.album;
            currentPhotos = data.album.photos || [];

            const title = lang === 'uz' && currentAlbum.title_uz ? currentAlbum.title_uz : currentAlbum.title_ru;
            const desc = lang === 'uz' && currentAlbum.description_uz ? currentAlbum.description_uz : currentAlbum.description_ru;

            albumTitle.textContent = title;
            albumDescription.textContent = desc || '';

            renderPhotos(currentPhotos);

            albumsView.style.display = 'none';
            albumView.style.display = 'block';
        } catch (err) {
            alert('Не удалось загрузить альбом');
        }
    }

    function renderPhotos(photos) {
        if (photos.length === 0) {
            photosGrid.innerHTML = '<div class="empty-state"><p>В этом альбоме пока нет фотографий</p></div>';
            return;
        }

        const items = photos.map((photo, index) => {
            const caption = lang === 'uz' && photo.caption_uz ? photo.caption_uz : photo.caption_ru;

            return `
                <div class="photo-item" data-photo-index="${index}">
                    <img src="${photo.url}" alt="${caption || 'Фото'}" class="lazy" loading="lazy">
                    ${caption ? `<div class="photo-caption">${caption}</div>` : ''}
                </div>
            `;
        }).join('');

        photosGrid.innerHTML = items;

        // Add click handlers
        document.querySelectorAll('.photo-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.getAttribute('data-photo-index'));
                openLightbox(index);
            });
        });

        // Trigger lazy loading check
        setTimeout(checkLazyImages, 100);
    }

    function showAlbumsView() {
        currentAlbum = null;
        currentPhotos = [];
        albumsView.style.display = 'block';
        albumView.style.display = 'none';
    }

    function openLightbox(index) {
        currentPhotoIndex = index;
        updateLightboxImage();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function navigateLightbox(direction) {
        currentPhotoIndex = (currentPhotoIndex + direction + currentPhotos.length) % currentPhotos.length;
        updateLightboxImage();
    }

    function updateLightboxImage() {
        const photo = currentPhotos[currentPhotoIndex];
        if (!photo) return;

        const caption = lang === 'uz' && photo.caption_uz ? photo.caption_uz : photo.caption_ru;

        lightboxImage.src = photo.url;
        lightboxImage.alt = caption || 'Фото';
        lightboxCaption.textContent = caption || '';

        // Show/hide navigation buttons
        lightboxPrev.style.display = currentPhotos.length > 1 ? 'block' : 'none';
        lightboxNext.style.display = currentPhotos.length > 1 ? 'block' : 'none';
    }

    // Lazy loading images
    function setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                });
            });

            window.imageObserver = imageObserver;
        }

        checkLazyImages();
    }

    function checkLazyImages() {
        const lazyImages = document.querySelectorAll('img.lazy');

        if (window.imageObserver) {
            lazyImages.forEach(img => {
                window.imageObserver.observe(img);
            });
        } else {
            // Fallback for browsers without IntersectionObserver
            lazyImages.forEach(img => {
                img.classList.add('loaded');
            });
        }
    }
})();

