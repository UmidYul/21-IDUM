(function () {
    const logoutBtn = document.getElementById('logoutBtn');
    const userLabel = document.getElementById('userLabel');
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(targetTab + '-tab').classList.add('active');
        });
    });

    async function me() {
        try {
            const r = await fetch('/api/auth/me', { credentials: 'same-origin' });
            if (!r.ok) throw new Error();
            const j = await r.json();
            return j.user;
        } catch (e) { return null; }
    }

    async function loadBells() {
        try {
            const r = await fetch('/api/admin/schedule/bells', { credentials: 'same-origin' });
            if (!r.ok) throw new Error('Failed to load');
            const data = await r.json();
            renderBells(data.bells || []);
        } catch (err) {
            document.getElementById('bellsTable').innerHTML = '<div class="empty">Ошибка загрузки расписания звонков</div>';
        }
    }

    function renderBells(bells) {
        const bellsTable = document.getElementById('bellsTable');
        if (bells.length === 0) {
            bellsTable.innerHTML = '<div class="empty">Расписание звонков не настроено. Создайте расписание!</div>';
            return;
        }

        let html = '';
        bells.forEach(bell => {
            const lessonsHtml = bell.lessons.map((lesson, idx) => {
                if (lesson.isBreak) {
                    return `<div style="padding:4px 0; color:#9ca3af"><em>${lesson.time} - Перемена</em></div>`;
                }
                return `<div style="padding:4px 0">${idx + 1}. ${lesson.time} - Урок</div>`;
            }).join('');

            html += `
        <div style="margin-bottom:24px; padding:16px; border:1px solid #e5e7eb; border-radius:12px">
          <h3 style="margin:0 0 8px">${bell.name_ru}</h3>
          <p class="muted" style="margin:0 0 12px">${bell.name_uz}</p>
          ${lessonsHtml}
        </div>
      `;
        });

        bellsTable.innerHTML = html;
    }

    async function loadEvents() {
        try {
            const r = await fetch('/api/admin/schedule/events', { credentials: 'same-origin' });
            if (!r.ok) throw new Error('Failed to load');
            const data = await r.json();
            renderEvents(data.events || []);
        } catch (err) {
            document.getElementById('eventsTable').innerHTML = '<div class="empty">Ошибка загрузки событий</div>';
        }
    }

    function renderEvents(events) {
        const eventsTable = document.getElementById('eventsTable');
        if (events.length === 0) {
            eventsTable.innerHTML = '<div class="empty">Событий пока нет. Создайте первое!</div>';
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

        eventsTable.innerHTML = `
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

    window.deleteEvent = async function (id) {
        if (!confirm('Удалить это событие?')) return;
        try {
            const r = await fetch(`/api/admin/schedule/events/${id}`, {
                method: 'DELETE',
                headers: getCSRFHeaders(),
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
        loadBells();
        loadEvents();
    })();
})();
