(function () {
    const form = document.getElementById('reviewForm');
    const errorBox = document.getElementById('errorBox');
    const successBox = document.getElementById('successBox');
    const saveBtn = document.getElementById('saveBtn');
    const pageTitle = document.getElementById('pageTitle');

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

    function show(el, text) { if (!el) return; el.textContent = text || ''; el.style.display = 'block'; }
    function hide(el) { if (!el) return; el.style.display = 'none'; el.textContent = ''; }

    async function me() {
        try {
            const r = await fetch('/api/auth/me', { credentials: 'same-origin' });
            if (!r.ok) return null;
            const j = await r.json();
            return j.user;
        } catch (e) { return null; }
    }

    async function checkAccess() {
        const user = await me();
        if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
            window.location.href = '/admin';
            return false;
        }
        return true;
    }

    const pathParts = window.location.pathname.split('/');
    const isEdit = pathParts.includes('edit');
    const reviewId = isEdit ? pathParts[pathParts.length - 1] : null;

    if (isEdit) {
        pageTitle.textContent = 'Редактировать отзыв';
        (async () => {
            if (await checkAccess()) {
                loadReview();
            }
        })();
    }

    // Set today's date as default
    if (!isEdit) {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    async function loadReview() {
        try {
            const r = await fetch(`/api/reviews/${reviewId}`, { credentials: 'same-origin' });
            if (!r.ok) throw new Error();
            const data = await r.json();
            const rev = data.review;

            document.getElementById('author').value = rev.author || '';
            document.getElementById('text_ru').value = rev.text_ru || '';
            document.getElementById('text_uz').value = rev.text_uz || '';
            document.getElementById('date').value = rev.date || '';
            document.getElementById('status').value = rev.status || 'draft';
        } catch (err) {
            show(errorBox, 'Ошибка загрузки отзыва');
        }
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            hide(errorBox); hide(successBox);
            saveBtn.disabled = true;

            try {
                const payload = {
                    author: document.getElementById('author').value.trim(),
                    text_ru: document.getElementById('text_ru').value.trim(),
                    text_uz: document.getElementById('text_uz').value.trim(),
                    date: document.getElementById('date').value,
                    status: document.getElementById('status').value
                };

                const url = isEdit ? `/api/reviews/${reviewId}` : '/api/reviews';
                const method = isEdit ? 'PATCH' : 'POST';

                const r = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    credentials: 'same-origin'
                });

                const data = await r.json();
                if (!r.ok || !data.ok) {
                    throw new Error(data.error || 'Ошибка сохранения');
                }

                show(successBox, isEdit ? 'Отзыв обновлен!' : 'Отзыв создан!');
                setTimeout(() => { window.location.href = '/admin/reviews'; }, 1000);
            } catch (err) {
                show(errorBox, err.message || 'Ошибка сохранения');
            } finally {
                saveBtn.disabled = false;
            }
        });
    }
})();
