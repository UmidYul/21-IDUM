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
        document.getElementById('teachersTable').innerHTML = `<div class="empty">${message}</div>`;
    }

    function renderTeachers(teachers) {
        const container = document.getElementById('teachersTable');
        if (!teachers || teachers.length === 0) {
            renderEmpty('Учителей пока нет. Добавьте первого!');
            return;
        }

        const rows = teachers.map(t => {
            const contacts = [];
            if (t.phone) contacts.push(`📞 ${t.phone}`);
            if (t.instagram) contacts.push(`📷 IG`);
            if (t.telegram) contacts.push(`✈️ TG`);
            const contactStr = contacts.join(' ');

            return `
        <tr>
          <td><strong>${t.name_ru}</strong><br><span class="muted">${t.name_uz || ''}</span></td>
          <td>${t.subject_ru}<br><span class="muted">${t.position_ru}</span></td>
          <td>${contactStr || '—'}</td>
          <td><span class="badge ${t.status === 'published' ? 'badge-success' : 'badge-secondary'}">${t.status === 'published' ? 'Публик.' : 'Черновик'}</span></td>
          <td>
            <a href="/admin/teachers/edit/${t.id}" class="btn btn-sm">Редактировать</a>
            <button class="btn btn-sm btn-danger" onclick="deleteTeacher('${t.id}')">Удалить</button>
          </td>
        </tr>
      `;
        }).join('');

        container.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>ФИО</th>
            <th>Предмет / Должность</th>
            <th>Контакты</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    }

    async function loadTeachers() {
        try {
            const r = await fetch('/api/teachers', { credentials: 'same-origin' });
            if (!r.ok) throw new Error('Ошибка загрузки');
            const data = await r.json();
            renderTeachers(data.teachers || []);
        } catch (err) {
            renderEmpty('Не удалось загрузить учителей');
        }
    }

    window.deleteTeacher = async function (id) {
        if (!confirm('Удалить этого учителя?')) return;
        try {
            const r = await fetch(`/api/teachers/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });
            if (!r.ok) throw new Error();
            loadTeachers();
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
        loadTeachers();
    })();
})();
