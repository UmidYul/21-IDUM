import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// POST /api/auth/login - Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Get admin credentials from environment
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'ВашСложныйПароль123';

        // Validate credentials
        if (username === adminUsername && password === adminPassword) {
            req.session.adminLoggedIn = true;
            req.session.adminUsername = username;

            res.json({
                success: true,
                message: 'Login successful',
                username: username
            });
        } else {
            res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error: ' + error.message
        });
    }
});

// POST /api/auth/logout - Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Logout failed'
            });
        }
        res.json({
            success: true,
            message: 'Logout successful'
        });
    });
});

// GET /api/auth/check - Check if user is authenticated
router.get('/check', (req, res) => {
    if (req.session && req.session.adminLoggedIn) {
        res.json({
            success: true,
            authenticated: true,
            username: req.session.adminUsername
        });
    } else {
        res.json({
            success: true,
            authenticated: false
        });
    }
});

export default router;
