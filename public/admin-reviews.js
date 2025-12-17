(function () {
    const logoutBtn = document.getElementById('logoutBtn');
    const userLabel = document.getElementById('userLabel');

    async function me() {
        try {
            const r = await fetch('/api/auth/me', { credentials: 'same-origin' });
            if (!r.ok) throw new Error();
            const j = await r.json();
            return j.user;
        } catch (e) { return null; }
    }

    function renderEmpty(message) {
        document.getElementById('reviewsTable').innerHTML = `<div class="empty">${message}</div>`;
    }

    function renderReviews(reviews) {
        const container = document.getElementById('reviewsTable');
        if (!reviews || reviews.length === 0) {
            renderEmpty('Отзывов пока нет. Добавьте первый!');
            return;
        }

        const rows = reviews.map(r => {
            const date = new Date(r.date).toLocaleDateString('ru-RU');

            return `
        <tr>
          <td><strong>${r.author}</strong><br><span class="muted">"${r.text_ru?.substring(0, 50)}..."</span></td>
          <td>${date}</td>
          <td><span class="badge ${r.status === 'published' ? 'badge-success' : 'badge-secondary'}">${r.status === 'published' ? 'Публик.' : 'Черновик'}</span></td>
          <td>
            <a href="/admin/reviews/edit/${r.id}" class="btn btn-sm">Редактировать</a>
            <button class="btn btn-sm btn-danger" onclick="deleteReview('${r.id}')">Удалить</button>
          </td>
        </tr>
      `;
        }).join('');

        container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Автор / Текст</th>
            <th>Дата</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    }

    async function loadReviews() {
        try {
            const r = await fetch('/api/reviews', { credentials: 'same-origin' });
            if (!r.ok) throw new Error('Ошибка загрузки');
            const data = await r.json();
            renderReviews(data.reviews || []);
        } catch (err) {
            renderEmpty('Не удалось загрузить отзывы');
        }
    }

    window.deleteReview = async function (id) {
        if (!confirm('Удалить этот отзыв?')) return;
        try {
            const r = await fetch(`/api/reviews/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });
            if (!r.ok) throw new Error();
            loadReviews();
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
        if (user.role !== 'admin' && user.role !== 'editor') {
            window.location.href = '/admin';
            return;
        }
        if (userLabel) userLabel.textContent = user.username;
        loadReviews();
    })();
})();
