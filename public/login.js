(function () {
    const form = document.getElementById('loginForm');
    const errorBox = document.getElementById('errorBox');
    const successBox = document.getElementById('successBox');
    const loginBtn = document.getElementById('loginBtn');
    const logoutLink = document.getElementById('logoutLink');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');

    function show(el, text) { if (!el) return; el.textContent = text || ''; el.style.display = 'block'; }
    function hide(el) { if (!el) return; el.style.display = 'none'; el.textContent = ''; }

    async function checkMe() {
        try {
            const r = await fetch('/api/auth/me', { credentials: 'same-origin' });
            if (r.ok) {
                const { user } = await r.json();
                hide(errorBox);
                show(successBox, `Вы авторизованы: ${user.username}`);
                logoutLink.style.display = 'inline';
                return true;
            }
        } catch (e) { /* ignore */ }
        hide(successBox);
        logoutLink.style.display = 'none';
        return false;
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            hide(errorBox); hide(successBox);
            loginBtn.disabled = true;
            console.log('📝 Отправка формы входа...');
            try {
                const payload = {
                    username: document.getElementById('username').value.trim(),
                    password: document.getElementById('password').value
                };
                console.log('📤 Отправка запроса на /api/auth/login с username:', payload.username);
                const r = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    credentials: 'same-origin'
                });
                console.log('📥 Получен ответ:', r.status, r.statusText);
                const data = await r.json();
                console.log('📦 Данные ответа:', data);
                if (!r.ok || !data.ok) {
                    throw new Error(data.error || 'Ошибка входа');
                }
                show(successBox, 'Успешный вход. Перенаправление...');
                console.log('✅ Успех! Редирект на /admin через 600мс');
                setTimeout(() => {
                    console.log('🔄 Выполняется редирект...');
                    window.location.href = '/admin';
                }, 600);
            } catch (err) {
                console.error('❌ Ошибка входа:', err);
                show(errorBox, err.message || 'Ошибка входа');
            } finally {
                loginBtn.disabled = false;
            }
        });
    }

    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            hide(errorBox); hide(successBox);
            try {
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
            } catch (e) { /* ignore */ }
            await checkMe();
        });
    }

    if (togglePassword && passwordInput) {
        const eyeOpen = document.getElementById('eyeOpen');
        const eyeClosed = document.getElementById('eyeClosed');

        togglePassword.addEventListener('click', (e) => {
            e.preventDefault();
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Toggle eye icons
            if (type === 'password') {
                eyeOpen.style.display = 'none';
                eyeClosed.style.display = 'block';
                togglePassword.setAttribute('aria-label', 'Показать пароль');
            } else {
                eyeOpen.style.display = 'block';
                eyeClosed.style.display = 'none';
                togglePassword.setAttribute('aria-label', 'Скрыть пароль');
            }
        });
    }

    // try detect current session
    checkMe();
})();
