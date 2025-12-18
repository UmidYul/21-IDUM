(function () {
    const form = document.getElementById('userForm');
    const pageTitle = document.getElementById('pageTitle');
    const errorBox = document.getElementById('errorBox');
    const saveBtn = document.getElementById('saveBtn');
    const passwordHint = document.getElementById('passwordHint');
    const logoutBtn = document.getElementById('logoutBtn');

    function showError(msg) { if (!errorBox) return; errorBox.textContent = msg; errorBox.style.display = 'block'; }
    function clearError() { if (!errorBox) return; errorBox.style.display = 'none'; errorBox.textContent = ''; }

    const isEdit = /\/admin\/users\/edit\//.test(window.location.pathname);
    const userId = isEdit ? window.location.pathname.split('/').pop() : null;

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
        if (!user || user.role !== 'admin') {
            window.location.href = '/admin';
            return false;
        }
        return true;
    }

    async function loadUser() {
        if (!isEdit) return;
        try {
            const r = await fetch(`/api/admin/users/${userId}`, { credentials: 'same-origin' });
            const j = await r.json();
            if (!r.ok || !j.ok) throw new Error(j.error || 'Не удалось загрузить пользователя');
            const u = j.user;
            document.getElementById('username').value = u.username || '';
            document.getElementById('displayName').value = u.displayName || '';
            document.getElementById('email').value = u.email || '';
            document.getElementById('phone').value = u.phone || '';
            document.getElementById('role').value = u.role || 'editor';
            pageTitle.textContent = 'Редактировать пользователя';
            passwordHint.textContent = '(можно оставить пустым, если не меняете)';
        } catch (err) {
            showError(err.message);
        }
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError();
            saveBtn.disabled = true;
            try {
                const payload = {
                    username: document.getElementById('username').value.trim(),
                    displayName: document.getElementById('displayName').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    phone: document.getElementById('phone').value.trim(),
                    password: document.getElementById('password').value,
                    role: document.getElementById('role').value
                };
                if (!payload.username || !payload.displayName || !payload.email || !payload.phone || (!isEdit && !payload.password) || !payload.role) {
                    throw new Error('Заполните обязательные поля');
                }

                const url = isEdit ? `/api/admin/users/${userId}` : '/api/admin/users';
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
                const j = await r.json();
                if (!r.ok || !j.ok) throw new Error(j.error || 'Ошибка сохранения');
                window.location.href = '/admin/users';
            } catch (err) {
                showError(err.message);
            } finally {
                saveBtn.disabled = false;
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch (e) { }
            window.location.href = '/admin/login';
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        if (await checkAccess()) {
            loadUser();
        }
    });
})();
