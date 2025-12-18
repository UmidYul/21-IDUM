(function () {
    const logoutBtn = document.getElementById('logoutBtn');
    const userLabel = document.getElementById('userLabel');
    const newsTable = document.getElementById('newsTable');

    async function me() {
        try {
            const r = await fetch('/api/auth/me', { credentials: 'same-origin' });
            if (!r.ok) throw new Error();
            const j = await r.json();
            return j.user;
        } catch (e) { return null; }
    }

    async function loadNews() {
        try {
            const r = await fetch('/api/admin/news', { credentials: 'same-origin' });
            if (!r.ok) throw new Error('Failed to load');
            const data = await r.json();
            renderNews(data.news || []);
        } catch (err) {
            newsTable.innerHTML = '<div class="empty">Ошибка загрузки новостей</div>';
        }
    }

    function renderNews(news) {
        if (news.length === 0) {
            newsTable.innerHTML = '<div class="empty">Новостей пока нет. Создайте первую!</div>';
            return;
        }

        const rows = news.map(item => {
            const date = new Date(item.createdAt).toLocaleDateString('ru-RU');
            const statusBadge = item.status === 'published'
                ? '<span class="badge badge-published">Опубликовано</span>'
                : '<span class="badge badge-draft">Черновик</span>';
            return `
        <tr>
          <td><strong>${item.title_ru}</strong><br><span class="muted">${item.title_uz || ''}</span></td>
          <td>${statusBadge}</td>
          <td class="muted">${date}</td>
          <td>
            <a href="/admin/news/edit/${item.id}" class="btn btn-sm">Редактировать</a>
            <button class="btn btn-sm btn-danger" onclick="deleteNews('${item.id}')">Удалить</button>
          </td>
        </tr>
      `;
        }).join('');

        newsTable.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Заголовок</th>
            <th>Статус</th>
            <th>Дата</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    }

    window.deleteNews = async function (id) {
        if (!confirm('Удалить эту новость?')) return;
        try {
            const r = await fetch(`/api/admin/news/${id}`, {
                method: 'DELETE',
                headers: getCSRFHeaders(),
                credentials: 'same-origin'
            });
            if (!r.ok) throw new Error();
            loadNews();
        } catch (err) {
            alert('Ошибка удаления');
        }
    };

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch (e) { }
            window.location.href = '/admin/login';
        });
    }

    (async () => {
        const user = await me();
        if (!user) {
            window.location.href = '/admin/login';
            return;
        }
        if (userLabel) userLabel.textContent = user.username;
        loadNews();
    })();
})();
