const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;
const DB_FILE = path.join(__dirname, 'db.json');
const API_SECRET = 'vup_private_key_2026'; // SaaS 私人密鑰

// --- 中間件設定 ---
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // 服務靜態檔案 (HTML, JS, CSS)

// 2. SaaS 全域安全驗證中間件 (僅針對 API)
app.use('/api', (req, res, next) => {
    const secret = req.headers['x-vup-secret'];
    if (secret !== API_SECRET) {
        console.warn(`[Security] 拒絕未授權的 API 請求: ${req.method} ${req.url}`);
        return res.status(403).json({ error: 'Invalid API Secret' });
    }
    next();
});

// --- 檔案資料庫讀寫 ---
function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            milestones: [
                { 
                    id: 'ms-1', 
                    type: 'individual', 
                    title: '【熱血企劃】專業麥克風升級！🎙️', 
                    goal: 20, 
                    current: 15, 
                    status: 'active', 
                    desc: '為了提供更好的直播音質，希望能換成專業級的電容麥克風。', 
                    donors: [
                        { name: '守護星野的騎士', amount: 5 },
                        { name: '打賞狂魔', amount: 4 },
                        { name: '草莓大福', amount: 3 },
                        { name: '匿名用戶', amount: 3 }
                    ], 
                    participants: [] 
                }
            ],
            profile: { 
                name: '星野夢彩', 
                handle: '@Yume_Official', 
                bio: '你的星空，由我來點亮 ✨',
                avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Yume',
                banner: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80',
                color: '#ec4899'
            },
            activity: [],
            posts: [],
            photos: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- API 路由 ---

// 1. 獲取企劃
app.get('/api/milestones', (req, res) => {
    const db = readDB();
    res.json(db.milestones);
});

// 2. 新增企劃
app.post('/api/milestones', (req, res) => {
    const db = readDB();
    db.milestones.unshift(req.body);
    writeDB(db);
    res.status(201).json({ message: 'Success', data: req.body });
});

// 3. 審核企劃
app.put('/api/milestones/:id/approve', (req, res) => {
    const db = readDB();
    const index = db.milestones.findIndex(m => m.id === req.params.id);
    if (index !== -1) {
        db.milestones[index].status = 'active';
        writeDB(db);
        return res.json({ message: 'Approved', data: db.milestones[index] });
    }
    res.status(404).json({ error: 'Not Found' });
});

// 4. 獲取個人檔案
app.get('/api/profile', (req, res) => {
    const db = readDB();
    res.json(db.profile);
});

// 5. 更新個人檔案
app.put('/api/profile', (req, res) => {
    const db = readDB();
    db.profile = req.body;
    writeDB(db);
    res.json({ message: 'Profile Updated', data: db.profile });
});

// 6. 獲取活動紀錄
app.get('/api/activity', (req, res) => {
    const db = readDB();
    res.json(db.activity || []);
});

// 7. 新增活動紀錄
app.post('/api/activity', (req, res) => {
    const db = readDB();
    const newLog = {
        id: Date.now(),
        ...req.body,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
    };
    db.activity.unshift(newLog);
    if (db.activity.length > 50) db.activity.pop(); // 只保留前 50 筆
    writeDB(db);
    res.status(201).json(newLog);
});

// 8. 獲取貼文
app.get('/api/posts', (req, res) => {
    const db = readDB();
    res.json(db.posts || []);
});

// 9. 新增貼文
app.post('/api/posts', (req, res) => {
    const db = readDB();
    const newPost = {
        id: Date.now(),
        ...req.body,
        date: new Date().toLocaleString()
    };
    db.posts.unshift(newPost);
    if (db.posts.length > 100) db.posts.pop();
    writeDB(db);
    res.status(201).json(newPost);
});

// 10. 獲取相片
app.get('/api/photos', (req, res) => {
    const db = readDB();
    res.json(db.photos || []);
});

// 11. 新增相片
app.post('/api/photos', (req, res) => {
    const db = readDB();
    const newPhoto = {
        id: Date.now(),
        ...req.body,
        date: new Date().toLocaleString()
    };
    db.photos.unshift(newPhoto);
    writeDB(db);
    res.status(201).json(newPhoto);
});

app.listen(port, () => {
    console.log(`🚀 V-UP SaaS API Server running on http://localhost:${port}`);
});
