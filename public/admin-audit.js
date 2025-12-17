(function () {
    async function me() {
        try {
            const r = await fetch('/api/auth/me', { credentials: 'same-origin' });
            if (!r.ok) throw new Error('unauthorized');
            const j = await r.json();
            return j.user;
        } catch (e) { return null; }
    }
    async function json(url) {
        const r = await fetch(url, { credentials: 'same-origin' });
        if (!r.ok) return null;
        return r.json();
    }

    const logoutBtn = document.getElementById('logoutBtn');
    const userLabel = document.getElementById('userLabel');
    const errorBox = document.getElementById('errorBox');
    const successBox = document.getElementById('successBox');
    const tbody = document.getElementById('auditBody');

    function show(el, text) { if (!el) return; el.textContent = text || ''; el.style.display = 'block'; }
    function hide(el) { if (!el) return; el.style.display = 'none'; el.textContent = ''; }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch (e) { }
            window.location.href = '/admin/login';
        });
    }

    (async () => {
        hide(errorBox); hide(successBox);
        const user = await me();
        if (!user) {
            window.location.href = '/admin/login';
            return;
        }
        if (userLabel) userLabel.textContent = user.username;
        if (user.role !== 'admin') {
            window.location.href = '/admin';
            return;
        }

        try {
            const resp = await json('/api/admin/audit/logins?limit=50');
            const rows = Array.isArray(resp?.logins) ? resp.logins : [];
            tbody.innerHTML = '';
            if (!rows.length) {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.colSpan = 5;
                td.className = 'empty';
                td.textContent = 'Нет данных';
                tr.appendChild(td);
                tbody.appendChild(tr);
                return;
            }
            rows.forEach(e => {
                const tr = document.createElement('tr');
                const when = new Date(e.at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                const uaShort = (e.userAgent || '').slice(0, 60) + ((e.userAgent || '').length > 60 ? '…' : '');
                tr.innerHTML = `<td>${when}</td><td>${e.username}</td><td>${e.role}</td><td>${e.ip || ''}</td><td title="${e.userAgent || ''}">${uaShort}</td>`;
                tbody.appendChild(tr);
            });
        } catch (err) {
            show(errorBox, 'Ошибка загрузки лога');
        }
    })();
})();
