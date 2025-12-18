(function () {
    const form = document.getElementById('bellsForm');
    const errorBox = document.getElementById('errorBox');
    const successBox = document.getElementById('successBox');
    const saveBtn = document.getElementById('saveBtn');
    const lessonsContainer = document.getElementById('lessonsContainer');

    function show(el, text) { if (!el) return; el.textContent = text || ''; el.style.display = 'block'; }
    function hide(el) { if (!el) return; el.style.display = 'none'; el.textContent = ''; }

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

    const pathParts = window.location.pathname.split('/');
    const shift = parseInt(pathParts[pathParts.length - 1]);

    let lessonCounter = 0;

    window.addLesson = function () {
        lessonCounter++;
        const div = document.createElement('div');
        div.className = 'lesson-item';
        div.dataset.id = lessonCounter;
        div.innerHTML = `
      <div class="lesson-header">
        <strong>Урок ${lessonCounter}</strong>
        <button type="button" class="btn btn-sm btn-danger" onclick="removeLesson(${lessonCounter})">Удалить</button>
      </div>
      <label>Время (например, 08:00 - 08:45)</label>
      <input type="text" class="lesson-time" data-id="${lessonCounter}" placeholder="08:00 - 08:45" required>
    `;
        lessonsContainer.appendChild(div);
    };

    window.addBreak = function () {
        lessonCounter++;
        const div = document.createElement('div');
        div.className = 'lesson-item';
        div.dataset.id = lessonCounter;
        div.innerHTML = `
      <div class="lesson-header">
        <strong>Перемена</strong>
        <button type="button" class="btn btn-sm btn-danger" onclick="removeLesson(${lessonCounter})">Удалить</button>
      </div>
      <label>Время перемены</label>
      <input type="text" class="lesson-time" data-id="${lessonCounter}" data-break="true" placeholder="08:45 - 09:00" required>
    `;
        lessonsContainer.appendChild(div);
    };

    window.removeLesson = function (id) {
        const item = lessonsContainer.querySelector(`[data-id="${id}"]`);
        if (item) item.remove();
    };

    async function loadBells() {
        try {
            const r = await fetch(`/api/admin/schedule/bells/${shift}`, { credentials: 'same-origin' });
            if (!r.ok) {
                // Создаем новое расписание
                document.getElementById('name_ru').value = shift === 1 ? 'Первая смена' : 'Вторая смена';
                document.getElementById('name_uz').value = shift === 1 ? 'Birinchi smena' : 'Ikkinchi smena';
                return;
            }
            const data = await r.json();
            const bell = data.bell;

            document.getElementById('name_ru').value = bell.name_ru || '';
            document.getElementById('name_uz').value = bell.name_uz || '';

            // Load lessons
            if (bell.lessons && bell.lessons.length > 0) {
                bell.lessons.forEach((lesson, idx) => {
                    if (lesson.isBreak) {
                        addBreak();
                    } else {
                        addLesson();
                    }
                    const inputs = lessonsContainer.querySelectorAll('.lesson-time');
                    const lastInput = inputs[inputs.length - 1];
                    if (lastInput) {
                        lastInput.value = lesson.time || '';
                        if (lesson.isBreak) {
                            lastInput.dataset.break = 'true';
                        }
                    }
                });
            }
        } catch (err) {
            console.error('Error loading bells:', err);
        }
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            hide(errorBox); hide(successBox);
            saveBtn.disabled = true;

            try {
                const lessons = [];
                const lessonInputs = lessonsContainer.querySelectorAll('.lesson-time');
                lessonInputs.forEach(input => {
                    lessons.push({
                        time: input.value.trim(),
                        isBreak: input.dataset.break === 'true'
                    });
                });

                if (lessons.length === 0) {
                    throw new Error('Добавьте хотя бы один урок');
                }

                const payload = {
                    shift,
                    name_ru: document.getElementById('name_ru').value.trim(),
                    name_uz: document.getElementById('name_uz').value.trim(),
                    lessons
                };

                const r = await fetch('/api/admin/schedule/bells', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getCSRFHeaders()
                    },
                    body: JSON.stringify(payload),
                    credentials: 'same-origin'
                });

                const data = await r.json();
                if (!r.ok || !data.ok) {
                    throw new Error(data.error || 'Ошибка сохранения');
                }

                show(successBox, 'Расписание сохранено!');
                setTimeout(() => { window.location.href = '/admin/schedule'; }, 1000);
            } catch (err) {
                show(errorBox, err.message || 'Ошибка сохранения');
            } finally {
                saveBtn.disabled = false;
            }
        });
    }

    // Initialize
    (async () => {
        if (await checkAccess()) {
            loadBells();
        }
    })();
})();
