(function () {
    const logoutBtn = document.getElementById('logoutBtn');
    const userLabel = document.getElementById('userLabel');
    const faqTable = document.getElementById('faqTable');

    async function me() {
        try {
            const r = await fetch('/api/auth/me', { credentials: 'same-origin' });
            if (!r.ok) throw new Error();
            const j = await r.json();
            return j.user;
        } catch (e) { return null; }
    }

    async function loadFaq() {
        try {
            const r = await fetch('/api/admin/faq', { credentials: 'same-origin' });
            if (!r.ok) throw new Error('Failed to load');
            const data = await r.json();
            renderFaq(data.faq || []);
        } catch (err) {
            faqTable.innerHTML = '<div class="empty">Ошибка загрузки FAQ</div>';
        }
    }

    function renderFaq(faq) {
        if (faq.length === 0) {
            faqTable.innerHTML = '<div class="empty">FAQ пока нет. Создайте первый вопрос!</div>';
            return;
        }

        const categoryNames = {
            general: 'Общие',
            admission: 'Поступление',
            education: 'Обучение',
            exams: 'Экзамены',
            documents: 'Документы',
            other: 'Другое'
        };

        const rows = faq.map(item => {
            const visibleBadge = item.visible !== false
                ? '<span class="badge badge-visible">Видимый</span>'
                : '<span class="badge badge-hidden">Скрытый</span>';
            return `
        <tr>
          <td style="width:50px">${item.order || 0}</td>
          <td><strong>${item.question_ru}</strong><br><span class="muted">${item.question_uz || ''}</span></td>
          <td><span class="muted">${categoryNames[item.category] || item.category}</span></td>
          <td>${visibleBadge}</td>
          <td>
            <a href="/admin/faq/edit/${item.id}" class="btn btn-sm">Редактировать</a>
            <button class="btn btn-sm btn-danger" onclick="deleteFaq('${item.id}')">Удалить</button>
          </td>
        </tr>
      `;
        }).join('');

        faqTable.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>№</th>
            <th>Вопрос</th>
            <th>Категория</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    }

    window.deleteFaq = async function (id) {
        if (!confirm('Удалить этот вопрос?')) return;
        try {
            const r = await fetch(`/api/admin/faq/${id}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });
            if (!r.ok) throw new Error();
            loadFaq();
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
        loadFaq();
    })();
})();
