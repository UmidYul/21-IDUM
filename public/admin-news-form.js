(function () {
    const form = document.getElementById('newsForm');
    const errorBox = document.getElementById('errorBox');
    const successBox = document.getElementById('successBox');
    const saveBtn = document.getElementById('saveBtn');
    const pageTitle = document.getElementById('pageTitle');
    const coverImage = document.getElementById('coverImage');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const removeImage = document.getElementById('removeImage');
    const coverUrl = document.getElementById('coverUrl');

    const tabs = document.querySelectorAll('.form-tab');
    const contents = document.querySelectorAll('.lang-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const lang = tab.getAttribute('data-lang');
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.querySelector(`.lang-content[data-lang="${lang}"]`).classList.add('active');
        });
    });

    // Image upload with preview, validation, progress
    if (coverImage) {
        const progressWrap = document.getElementById('coverUploadProgress');
        const progressBar = document.getElementById('coverProgressBar');
        const progressText = document.getElementById('coverProgressText');

        coverImage.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // client-side validation
            const maxSize = parseInt(coverImage.dataset.maxSize || (5 * 1024 * 1024), 10);
            const minWidth = parseInt(coverImage.dataset.minWidth || 0, 10);
            const minHeight = parseInt(coverImage.dataset.minHeight || 0, 10);
            try {
                const v = await UploadUtils.validateImageFile(file, {
                    maxSize,
                    minWidth,
                    minHeight,
                    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
                });
                if (!v.ok) throw new Error(v.error);
            } catch (err) {
                show(errorBox, err.message);
                coverImage.value = '';
                return;
            }

            // Show preview immediately
            const reader = new FileReader();
            reader.onload = (ev) => {
                previewImg.src = ev.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);

            // Upload with progress
            try {
                if (progressWrap) { progressWrap.classList.add('show'); progressWrap.setAttribute('aria-hidden', 'false'); }
                if (progressText) { progressText.textContent = '0%'; progressText.setAttribute('aria-hidden', 'false'); }
                if (progressBar) { progressBar.style.width = '0%'; }

                const data = await UploadUtils.uploadImageWithProgress({
                    url: '/api/upload/news-cover',
                    file,
                    headers: getCSRFHeaders(),
                    onProgress: (percent) => {
                        if (progressBar) progressBar.style.width = percent + '%';
                        if (progressText) progressText.textContent = percent + '%';
                    }
                });

                if (!data || !data.ok) {
                    throw new Error((data && data.error) || 'Ошибка загрузки');
                }

                coverUrl.value = data.url;
            } catch (err) {
                show(errorBox, 'Ошибка загрузки изображения: ' + (err.message || ''));
                coverImage.value = '';
                imagePreview.style.display = 'none';
            } finally {
                // small delay for UX then hide
                setTimeout(() => {
                    if (progressWrap) { progressWrap.classList.remove('show'); progressWrap.setAttribute('aria-hidden', 'true'); }
                    if (progressText) { progressText.setAttribute('aria-hidden', 'true'); }
                }, 500);
            }
        });
    }

    if (removeImage) {
        removeImage.addEventListener('click', () => {
            coverImage.value = '';
            coverUrl.value = '';
            imagePreview.style.display = 'none';
            previewImg.src = '';
            // Reset filename display
            const nameEl = document.querySelector('[data-filedrop-name="coverImage"]');
            if (nameEl) nameEl.textContent = 'Файл не выбран';
        });
    }

    function show(el, text) { if (!el) return; el.textContent = text || ''; el.style.display = 'block'; }
    function hide(el) { if (!el) return; el.style.display = 'none'; el.textContent = ''; }

    const pathParts = window.location.pathname.split('/');
    const isEdit = pathParts.includes('edit');
    const newsId = isEdit ? pathParts[pathParts.length - 1] : null;

    if (isEdit) {
        pageTitle.textContent = 'Редактировать новость';
        loadNews();
    }

    async function loadNews() {
        try {
            const r = await fetch(`/api/admin/news/${newsId}`, { credentials: 'same-origin' });
            if (!r.ok) throw new Error();
            const data = await r.json();
            const news = data.news;

            document.getElementById('title_ru').value = news.title_ru || '';
            document.getElementById('title_uz').value = news.title_uz || '';

            // Load into Quill editors if available
            if (window.setEditorContent) {
                setEditorContent('body_ru', news.body_ru || '');
                setEditorContent('body_uz', news.body_uz || '');
            } else {
                document.getElementById('body_ru').value = news.body_ru || '';
                document.getElementById('body_uz').value = news.body_uz || '';
            }

            document.getElementById('status').value = news.status || 'draft';

            // Load existing cover image if exists
            if (news.coverUrl) {
                coverUrl.value = news.coverUrl;
                previewImg.src = news.coverUrl;
                imagePreview.style.display = 'block';
            }
        } catch (err) {
            show(errorBox, 'Ошибка загрузки новости');
        }
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            hide(errorBox); hide(successBox);
            saveBtn.disabled = true;

            try {
                const title_ru = document.getElementById('title_ru').value.trim();
                const title_uz = document.getElementById('title_uz').value.trim();

                // Get content from rich text editors if available, otherwise from textarea
                let body_ru = document.getElementById('body_ru').value.trim();
                let body_uz = document.getElementById('body_uz').value.trim();

                if (window.getEditorHTML) {
                    body_ru = getEditorHTML('body_ru');
                    body_uz = getEditorHTML('body_uz');
                }

                const status = document.getElementById('status').value;

                if (!title_ru) { throw new Error('Заголовок на русском обязателен'); }
                if (!body_ru) { throw new Error('Содержание на русском обязательно'); }

                const payload = {
                    title_ru,
                    title_uz,
                    body_ru,
                    body_uz,
                    coverUrl: coverUrl.value,
                    status
                };

                const url = isEdit ? `/api/admin/news/${newsId}` : '/api/admin/news';
                const method = isEdit ? 'PATCH' : 'POST';

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

                show(successBox, isEdit ? 'Новость обновлена!' : 'Новость создана!');
                setTimeout(() => { window.location.href = '/admin/news'; }, 1000);
            } catch (err) {
                show(errorBox, err.message || 'Ошибка сохранения');
            } finally {
                saveBtn.disabled = false;
            }
        });
    }
})();
