(function () {
    const form = document.getElementById('faqForm');
    const errorBox = document.getElementById('errorBox');
    const successBox = document.getElementById('successBox');
    const saveBtn = document.getElementById('saveBtn');
    const pageTitle = document.getElementById('pageTitle');

    const tabs = document.querySelectorAll('.form-tab');
    const contents = document.querySelectorAll('.lang-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const lang = tab.getAttribute('data-lang');
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.querySelector(`.lang-content[data-lang="${lang}"]`).classList.add('active');
        });
    });

    function show(el, text) { if (!el) return; el.textContent = text || ''; el.style.display = 'block'; }
    function hide(el) { if (!el) return; el.style.display = 'none'; el.textContent = ''; }

    const pathParts = window.location.pathname.split('/');
    const isEdit = pathParts.includes('edit');
    const faqId = isEdit ? pathParts[pathParts.length - 1] : null;

    if (isEdit) {
        pageTitle.textContent = 'Редактировать FAQ';
        loadFaq();
    }

    async function loadFaq() {
        try {
            const r = await fetch(`/api/admin/faq/${faqId}`, { credentials: 'same-origin' });
            if (!r.ok) throw new Error();
            const data = await r.json();
            const faq = data.faq;

            document.getElementById('question_ru').value = faq.question_ru || '';
            document.getElementById('question_uz').value = faq.question_uz || '';
            document.getElementById('answer_ru').value = faq.answer_ru || '';
            document.getElementById('answer_uz').value = faq.answer_uz || '';
            document.getElementById('category').value = faq.category || 'general';
            document.getElementById('order').value = faq.order || 0;
            document.getElementById('visible').checked = faq.visible !== false;
        } catch (err) {
            show(errorBox, 'Ошибка загрузки FAQ');
        }
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            hide(errorBox); hide(successBox);
            saveBtn.disabled = true;

            try {
                const payload = {
                    question_ru: document.getElementById('question_ru').value.trim(),
                    question_uz: document.getElementById('question_uz').value.trim(),
                    answer_ru: document.getElementById('answer_ru').value.trim(),
                    answer_uz: document.getElementById('answer_uz').value.trim(),
                    category: document.getElementById('category').value,
                    order: parseInt(document.getElementById('order').value) || 0,
                    visible: document.getElementById('visible').checked
                };

                const url = isEdit ? `/api/admin/faq/${faqId}` : '/api/admin/faq';
                const method = isEdit ? 'PATCH' : 'POST';

                const r = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    credentials: 'same-origin'
                });

                const data = await r.json();
                if (!r.ok || !data.ok) {
                    throw new Error(data.error || 'Ошибка сохранения');
                }

                show(successBox, isEdit ? 'FAQ обновлён!' : 'FAQ создан!');
                setTimeout(() => { window.location.href = '/admin/faq'; }, 1000);
            } catch (err) {
                show(errorBox, err.message || 'Ошибка сохранения');
            } finally {
                saveBtn.disabled = false;
            }
        });
    }
})();
