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

    // Image upload preview
    if (coverImage) {
        coverImage.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Show preview immediately
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);

            // Upload to server
            try {
                const formData = new FormData();
                formData.append('image', file);

                const r = await fetch('/api/upload/news-cover', {
                    method: 'POST',
                    headers: getCSRFHeaders(),
                    body: formData,
                    credentials: 'same-origin'
                });

                const data = await r.json();
                if (!r.ok || !data.ok) {
                    throw new Error(data.error || 'Ошибка загрузки');
                }

                coverUrl.value = data.url;
                console.log('Изображение загружено:', data.url);
            } catch (err) {
                show(errorBox, 'Ошибка загрузки изображения: ' + err.message);
                coverImage.value = '';
                imagePreview.style.display = 'none';
            }
        });
    }

    if (removeImage) {
        removeImage.addEventListener('click', () => {
            coverImage.value = '';
            coverUrl.value = '';
            imagePreview.style.display = 'none';
            previewImg.src = '';
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
            document.getElementById('body_ru').value = news.body_ru || '';
            document.getElementById('body_uz').value = news.body_uz || '';
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
                const payload = {
                    title_ru: document.getElementById('title_ru').value.trim(),
                    title_uz: document.getElementById('title_uz').value.trim(),
                    body_ru: document.getElementById('body_ru').value.trim(),
                    body_uz: document.getElementById('body_uz').value.trim(),
                    coverUrl: document.getElementById('coverUrl').value.trim(),
                    status: document.getElementById('status').value
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
