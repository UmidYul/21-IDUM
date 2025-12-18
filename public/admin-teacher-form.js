(function () {
    const form = document.getElementById('teacherForm');
    const errorBox = document.getElementById('errorBox');
    const successBox = document.getElementById('successBox');
    const saveBtn = document.getElementById('saveBtn');
    const pageTitle = document.getElementById('pageTitle');
    const photoInput = document.getElementById('photo');
    const photoPreview = document.getElementById('photoPreview');
    const previewImg = document.getElementById('previewImg');
    const removePhoto = document.getElementById('removePhoto');
    const photoUrl = document.getElementById('photoUrl');

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

    // Photo upload with preview
    if (photoInput) {
        photoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Show preview immediately
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                photoPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);

            // Upload to server
            try {
                const formData = new FormData();
                formData.append('image', file);

                const r = await fetch('/api/upload/teacher-photo', {
                    method: 'POST',
                    headers: getCSRFHeaders(),
                    body: formData,
                    credentials: 'same-origin'
                });

                const data = await r.json();
                if (!r.ok || !data.ok) {
                    throw new Error(data.error || 'Ошибка загрузки');
                }

                photoUrl.value = data.url;
                console.log('Фото учителя загружено:', data.url);
            } catch (err) {
                show(errorBox, 'Ошибка загрузки фото: ' + err.message);
                photoInput.value = '';
                photoPreview.style.display = 'none';
            }
        });
    }

    if (removePhoto) {
        removePhoto.addEventListener('click', () => {
            photoInput.value = '';
            photoUrl.value = '';
            photoPreview.style.display = 'none';
            previewImg.src = '';
        });
    }

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

            // Load existing photo if exists
            if (t.photo) {
                photoUrl.value = t.photo;
                previewImg.src = t.photo;
                photoPreview.style.display = 'block';
            }
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

                const photoUrlValue = document.getElementById('photoUrl').value.trim();
                if (photoUrlValue) {
                    payload.photo = photoUrlValue;
                } else if (!isEdit) {
                    throw new Error('Фото обязательно');
                }

                const url = isEdit ? `/api/teachers/${teacherId}` : '/api/teachers';
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
