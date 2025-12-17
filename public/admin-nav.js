// Navigation visibility control based on user role
(function () {
    async function getCurrentUser() {
        try {
            const r = await fetch('/api/auth/me', { credentials: 'same-origin' });
            if (!r.ok) return null;
            const j = await r.json();
            return j.user;
        } catch (e) { return null; }
    }

    async function initNav() {
        const user = await getCurrentUser();
        if (!user) return;

        // Hide restricted items for editors
        if (user.role === 'editor') {
            const scheduleMenu = document.getElementById('scheduleMenuAdmin');
            const usersMenu = document.getElementById('usersMenuAdmin');
            const auditMenu = document.getElementById('auditMenuAdmin');
            if (scheduleMenu) scheduleMenu.style.display = 'none';
            if (usersMenu) usersMenu.style.display = 'none';
            if (auditMenu) auditMenu.style.display = 'none';
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNav);
    } else {
        initNav();
    }
})();
