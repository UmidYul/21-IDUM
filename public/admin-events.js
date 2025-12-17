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
        document.getElementById('eventsTable').innerHTML = `<div class="empty">${message}</div>`;
    }

    function renderEvents(events) {
        const container = document.getElementById('eventsTable');
        if (!events || events.length === 0) {
            renderEmpty('Событий пока нет. Создайте первое!');
            return;
        }

        const rows = events.map(item => {
            const date = new Date(item.date).toLocaleDateString('ru-RU');
            return `
        <tr>
          <td><strong>${item.title_ru}</strong><br><span class="muted">${item.title_uz || ''}</span></td>
          <td>${date}</td>
          <td>${item.time || '—'}</td>
          <td>${item.location_ru || '—'}</td>
          <td>
            <a href="/admin/schedule/events/edit/${item.id}" class="btn btn-sm">Редактировать</a>
            <button class="btn btn-sm btn-danger" onclick="deleteEvent('${item.id}')">Удалить</button>
          </td>
        </tr>
      `;
        }).join('');

        container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Дата</th>
            <th>Время</th>
            <th>Место</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    }

    async function loadEvents() {
        try {
            const r = await fetch('/api/admin/schedule/events', { credentials: 'same-origin' });
            if (!r.ok) throw new Error('Ошибка загрузки событий');
            const data = await r.json();
            renderEvents(data.events || []);
        } catch (err) {
            renderEmpty('Не удалось загрузить события');
        }
    }

    window.deleteEvent = async function (id) {
        if (!confirm('Удалить это событие?')) return;
        try {
            const r = await fetch(`/api/admin/schedule/events/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });
            if (!r.ok) throw new Error();
            loadEvents();
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
        loadEvents();
    })();
})();
