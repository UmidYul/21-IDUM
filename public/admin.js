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
        const r = await fetch(url);
        if (!r.ok) return null;
        return r.json();
    }

    const logoutBtn = document.getElementById('logoutBtn');
    const userLabel = document.getElementById('userLabel');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch (e) { }
            window.location.href = '/admin/login';
        });
    }

    // no list helpers needed for counters-only dashboard

    (async () => {
        const user = await me();
        if (!user) {
            window.location.href = '/admin/login';
            return;
        }
        if (userLabel) userLabel.textContent = user.username;

        const [news, faqAll, schedule] = await Promise.all([
            json('/api/news?lang=ru&limit=1000'),
            json('/api/faq/all'),
            json('/api/schedule')
        ]);

        const statNews = document.getElementById('statNews');
        const statFaq = document.getElementById('statFaq');
        const statEvents = document.getElementById('statEvents');
        if (statNews && news) {
            const list = Array.isArray(news?.news) ? news.news : [];
            statNews.textContent = list.length ?? '—';
        }
        if (statFaq && faqAll) {
            const list = Array.isArray(faqAll?.faq) ? faqAll.faq : [];
            statFaq.textContent = list.length ?? '—';
        }
        if (statEvents && schedule) {
            const events = Array.isArray(schedule?.events) ? schedule.events : [];
            statEvents.textContent = events.length ?? '—';
        }

        if (user.role === 'admin') {
            try {
                const u = await json('/api/admin/users');
                const card = document.getElementById('statUsersCard');
                const statUsers = document.getElementById('statUsers');
                if (u && card && statUsers) {
                    card.style.display = '';
                    const count = (typeof u.count === 'number') ? u.count : (Array.isArray(u.users) ? u.users.length : '—');
                    statUsers.textContent = count;
                }
            } catch { /* ignore */ }

            // recent login activity
            try {
                const audit = await json('/api/admin/audit/logins?limit=10');
                const row = document.getElementById('adminAuditRow');
                const ul = document.getElementById('recentLogins');
                if (audit && row && ul) {
                    row.style.display = '';
                    ul.innerHTML = '';
                    const items = Array.isArray(audit.logins) ? audit.logins : [];
                    items.forEach(e => {
                        const when = new Date(e.at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                        const ip = e.ip || '';
                        const li = document.createElement('li');
                        li.style.margin = '6px 0';
                        li.textContent = `${when} — ${e.username} (${e.role})${ip ? ' · ' + ip : ''}`;
                        ul.appendChild(li);
                    });
                    if (!items.length) {
                        const li = document.createElement('li');
                        li.textContent = 'Нет записей';
                        ul.appendChild(li);
                    }
                }
            } catch { /* ignore */ }
        }
    })();
})();
