// [LEGACY/REFERENCE ONLY] V-UP SaaS API Server
// Note: Core data and sync logic are now managed directly via Firebase (SDK version).
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;
const DB_FILE = path.join(__dirname, 'db.json');
const API_SECRET = 'vup_private_key_2026'; // SaaS 私人密鑰

// --- Middlewares ---
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files (HTML, JS, CSS)

// --- Database Logic ---
function readDB() {
    if (!fs.existsSync(DB_FILE)) return {}; 
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}
function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- API Router ---
const apiRouter = express.Router();

// 2. SaaS Global Security Middleware (for /api only)
apiRouter.use((req, res, next) => {
    // Skip secret check for CORS Preflight
    if (req.method === 'OPTIONS') return next();

    const secret = req.headers['x-vup-secret'];
    if (secret !== API_SECRET) {
        console.warn(`[Security] Denied: ${req.method} ${req.url}`);
        return res.status(403).json({ error: 'Invalid API Secret' });
    }
    next();
});

// --- API Routes ---

// 1. Milestones
apiRouter.get('/milestones', (req, res) => {
    res.json(readDB().milestones || []);
});
apiRouter.post('/milestones', (req, res) => {
    const db = readDB();
    db.milestones.unshift(req.body);
    writeDB(db);
    res.status(201).json(req.body);
});

// 2. Profile
apiRouter.get('/profile', (req, res) => {
    res.json(readDB().profile || {});
});

// 3. User Specific (Fan Profile)
apiRouter.get('/user/stats', (req, res) => {
    res.json(readDB().fanStats || {});
});
apiRouter.get('/user/top-supported', (req, res) => {
    res.json(readDB().topSupported || []);
});
apiRouter.get('/user/following', (req, res) => {
    res.json(readDB().following || []);
});
apiRouter.get('/user/badges', (req, res) => {
    res.json(readDB().badges || []);
});
apiRouter.get('/user/titles', (req, res) => {
    res.json(readDB().titles || []);
});
apiRouter.get('/user/notifications', (req, res) => {
    res.json(readDB().notifications || []);
});
apiRouter.get('/user/notifications/unread-count', (req, res) => {
    const db = readDB();
    const count = (db.notifications || []).filter(n => !n.read).length;
    res.json({ count });
});
apiRouter.get('/user/settings', (req, res) => {
    const db = readDB();
    res.json({
        displayName: db.profile.name,
        tagline: db.profile.bio,
        themeColorPrimary: db.profile.color,
        style: db.profile.style,
        googleEmail: 'example.fan@gmail.com'
    });
});

// Mount Router
app.use('/api', apiRouter);

app.listen(port, () => {
    console.log(`🚀 V-UP SaaS API Server running on http://localhost:${port}`);
});
