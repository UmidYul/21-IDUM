(function () {
    const form = document.getElementById('teacherForm');
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
    const teacherId = isEdit ? pathParts[pathParts.length - 1] : null;

    if (isEdit) {
        pageTitle.textContent = 'Редактировать учителя';
        (async () => {
            if (await checkAccess()) {
                loadTeacher();
            }
        })();
    }

    async function loadTeacher() {
        try {
            const r = await fetch(`/api/teachers/${teacherId}`, { credentials: 'same-origin' });
            if (!r.ok) throw new Error();
            const data = await r.json();
            const t = data.teacher;

            document.getElementById('name_ru').value = t.name_ru || '';
            document.getElementById('name_uz').value = t.name_uz || '';
            document.getElementById('position_ru').value = t.position_ru || '';
            document.getElementById('position_uz').value = t.position_uz || '';
            document.getElementById('bio_ru').value = t.bio_ru || '';
            document.getElementById('bio_uz').value = t.bio_uz || '';
            document.getElementById('order').value = t.order || 0;
            document.getElementById('instagram').value = t.instagram || '';
            document.getElementById('telegram').value = t.telegram || '';
            document.getElementById('phone').value = t.phone || '';
            document.getElementById('status').value = t.status || 'draft';
        } catch (err) {
            show(errorBox, 'Ошибка загрузки учителя');
        }
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            hide(errorBox); hide(successBox);
            saveBtn.disabled = true;

            try {
                const payload = {
                    name_ru: document.getElementById('name_ru').value.trim(),
                    name_uz: document.getElementById('name_uz').value.trim(),
                    position_ru: document.getElementById('position_ru').value.trim(),
                    position_uz: document.getElementById('position_uz').value.trim(),
                    bio_ru: document.getElementById('bio_ru').value.trim(),
                    bio_uz: document.getElementById('bio_uz').value.trim(),
                    instagram: document.getElementById('instagram').value.trim(),
                    telegram: document.getElementById('telegram').value.trim(),
                    phone: document.getElementById('phone').value.trim(),
                    order: document.getElementById('order').value,
                    status: document.getElementById('status').value
                };

                const photoFile = document.getElementById('photo').files[0];
                if (photoFile) {
                    const formData = new FormData();
                    formData.append('file', photoFile);
                    const uploadRes = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData,
                        credentials: 'same-origin'
                    });
                    const uploadData = await uploadRes.json();
                    if (!uploadRes.ok || !uploadData.ok) {
                        throw new Error(uploadData.error || 'Ошибка загрузки фото');
                    }
                    payload.photo = uploadData.url;
                } else if (isEdit) {
                    // При редактировании фото не обязательно
                } else {
                    throw new Error('Фото обязательно');
                }

                const url = isEdit ? `/api/teachers/${teacherId}` : '/api/teachers';
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

                show(successBox, isEdit ? 'Учитель обновлен!' : 'Учитель создан!');
                setTimeout(() => { window.location.href = '/admin/teachers'; }, 1000);
            } catch (err) {
                show(errorBox, err.message || 'Ошибка сохранения');
            } finally {
                saveBtn.disabled = false;
            }
        });
    }
})();
