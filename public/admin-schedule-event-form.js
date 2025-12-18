(function () {
    const form = document.getElementById('eventForm');
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
    const eventId = isEdit ? pathParts[pathParts.length - 1] : null;

    if (isEdit) {
        pageTitle.textContent = 'Редактировать событие';
        (async () => {
            if (await checkAccess()) {
                loadEvent();
            }
        })();
    }

    async function loadEvent() {
        try {
            const r = await fetch(`/api/admin/schedule/events/${eventId}`, { credentials: 'same-origin' });
            if (!r.ok) throw new Error();
            const data = await r.json();
            const event = data.event;

            document.getElementById('title_ru').value = event.title_ru || '';
            document.getElementById('title_uz').value = event.title_uz || '';
            document.getElementById('description_ru').value = event.description_ru || '';
            document.getElementById('description_uz').value = event.description_uz || '';
            document.getElementById('location_ru').value = event.location_ru || '';
            document.getElementById('location_uz').value = event.location_uz || '';
            document.getElementById('date').value = event.date || '';
            document.getElementById('time').value = event.time || '';
            document.getElementById('type').value = event.type || 'info';
            // If status is missing (older events), treat as published to match calendar display
            document.getElementById('status').value = event.status || 'published';
        } catch (err) {
            show(errorBox, 'Ошибка загрузки события');
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
                    description_ru: document.getElementById('description_ru').value.trim(),
                    description_uz: document.getElementById('description_uz').value.trim(),
                    location_ru: document.getElementById('location_ru').value.trim(),
                    location_uz: document.getElementById('location_uz').value.trim(),
                    date: document.getElementById('date').value,
                    time: document.getElementById('time').value,
                    type: document.getElementById('type').value,
                    status: document.getElementById('status').value
                };

                const url = isEdit ? `/api/admin/schedule/events/${eventId}` : '/api/admin/schedule/events';
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

                show(successBox, isEdit ? 'Событие обновлено!' : 'Событие создано!');
                setTimeout(() => { window.location.href = '/admin/events'; }, 1000);
            } catch (err) {
                show(errorBox, err.message || 'Ошибка сохранения');
            } finally {
                saveBtn.disabled = false;
            }
        });
    }
})();
