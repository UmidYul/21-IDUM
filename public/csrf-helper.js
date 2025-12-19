// CSRF helper - loads token on page load and includes it in all admin API requests
let csrfToken = null;

async function loadCSRFToken() {
    try {
        const res = await fetch('/api/csrf-token', {
            credentials: 'include'
        });
        if (res.ok) {
            const data = await res.json();
            csrfToken = data.csrfToken;
            }
    } catch (err) {
        }
}

// Helper to include CSRF token in fetch requests
function getCSRFHeaders() {
    return csrfToken ? { 'CSRF-Token': csrfToken } : {};
}

// Load CSRF token on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCSRFToken);
} else {
    loadCSRFToken();
}

// Export for use in admin forms
window.getCSRFHeaders = getCSRFHeaders;

