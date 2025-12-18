(function () {
    const tbody = document.getElementById('usersBody');
    const errorBox = document.getElementById('errorBox');
    const logoutBtn = document.getElementById('logoutBtn');

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

    function showError(msg) { if (!errorBox) return; errorBox.textContent = msg; errorBox.style.display = 'block'; }
    function clearError() { if (!errorBox) return; errorBox.style.display = 'none'; errorBox.textContent = ''; }

    const roleLabel = (r) => r === 'admin' ? 'Администратор' : r === 'editor' ? 'Редактор' : r;
    const roleBadgeClass = (r) => r === 'admin' ? 'badge-admin' : 'badge-editor';

    async function loadUsers() {
        clearError();
        try {
            const resp = await fetch('/api/admin/users', { credentials: 'same-origin' });
            const data = await resp.json();
            if (!resp.ok || !data.ok) throw new Error(data.error || 'Ошибка загрузки пользователей');
            const users = data.users || [];
            tbody.innerHTML = users.map(u => `
        <tr>
          <td>${u.username}</td>
          <td>${u.displayName || '-'}</td>
          <td>${u.email || '-'}</td>
          <td>${u.phone || '-'}</td>
          <td><span class="badge ${roleBadgeClass(u.role)}">${roleLabel(u.role)}</span></td>
          <td>${u.createdAt ? new Date(u.createdAt).toLocaleString('ru-RU') : '-'}</td>
          <td class="actions">
            <a href="/admin/users/edit/${u.id}" class="btn btn-sm">Редактировать</a>
            <button data-id="${u.id}" class="btn btn-sm btn-danger">Удалить</button>
          </td>
        </tr>
      `).join('');

            tbody.querySelectorAll('button.btn-danger').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    if (!confirm('Удалить пользователя?')) return;
                    try {
                        const r = await fetch(`/api/admin/users/${id}`, {
                            method: 'DELETE',
                            headers: getCSRFHeaders(),
                            credentials: 'same-origin'
                        });
                        const j = await r.json();
                        if (!r.ok || !j.ok) throw new Error(j.error || 'Ошибка удаления');
                        loadUsers();
                    } catch (err) { showError(err.message); }
                });
            });
        } catch (err) {
            showError(err.message);
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch (e) { }
            window.location.href = '/admin/login';
        });
    }

    document.addEventListener('DOMContentLoaded', async () => {
        if (await checkAccess()) {
            loadUsers();
        }
    });
})();
