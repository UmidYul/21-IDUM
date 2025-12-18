import csrf from 'csurf';
import cookieParser from 'cookie-parser';

// CSRF protection middleware
export const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
    }
});

// Cookie parser for CSRF (required by csurf)
export const cookieParserMiddleware = cookieParser();

// Generate CSRF token endpoint
export function csrfTokenEndpoint(req, res) {
    res.json({ csrfToken: req.csrfToken() });
}
