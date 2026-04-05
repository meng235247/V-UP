// ---- State & Storage ----
let MILESTONES = []; // 改由 API 載入
let ACTIVITY_LOG = []; 
const MOCK_VTUBERS = [
    { name: '月野しずく', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Shizuku' },
    { name: '星野夢彩', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Yume' },
    { name: 'Kira', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Kira' },
    { name: '阿龍', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Dragon' }
];

let selectedCollabs = [];
let ADMIN_MODE = true; // For simulation, allowing manual checkout

function setProjectType(type) {
    document.getElementById('ms-type').value = type;
    document.getElementById('type-indie').classList.toggle('active', type === 'individual');
    document.getElementById('type-collab').classList.toggle('active', type === 'collab');
    
    const collabFields = document.getElementById('collab-fields');
    if (collabFields) collabFields.style.display = type === 'collab' ? 'block' : 'none';
}

function getInitialMilestones() {
    return [
        {
            id: 'ms-1', type: 'individual', title: '錄音室級別麥克風升級！',
            goal: 20000, current: 15000,
            status: 'active',
            desc: '升級專業麥克風，提升直播音質。',
            donors: generateMockDonors(15),
            participants: []
        }
    ];
}

function generateMockDonors(count) {
    const names = ['星空騎士_阿龍', '深海的貓', 'Mystic_K', '超及推', '匿名DD', '課金戰士'];
    let donors = [];
    for(let i=0; i<count; i++) {
        donors.push({
            name: names[Math.floor(Math.random() * names.length)] + (i > 10 ? '_' + i : ''),
            amount: Math.floor(Math.random() * 5000) + 100
        });
    }
    return donors.sort((a,b) => b.amount - a.amount);
}

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    
    // Core data loading
    try {
        console.log('正在從 API 載入基礎數據...');
        const [ms, hist, profile, posts] = await Promise.all([
            vupFetch('/milestones'),
            vupFetch('/activity'),
            vupFetch('/profile'),
            vupFetch('/posts')
        ]);
        
        MILESTONES = ms;
        ACTIVITY_LOG = hist;
        renderMilestones();
        renderHistory();
        renderPosts(posts);
        
        // Profile Sync
        syncProfileToUI(profile);
    } catch (err) {
        console.warn('API 加載失敗，使用初始資料或本地快取', err);
        MILESTONES = getInitialMilestones();
        renderMilestones();
        renderHistory();
        renderPosts([]);
    }

    initAnalytics();
    syncPreview();
    
    // Sidebar nav
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', e => {
            if(item.dataset.tab) {
                e.preventDefault();
                switchTab(item.dataset.tab);
            }
        });
    });

    // Milestone Filters
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMilestones(btn.dataset.filter);
        });
    });

    // Photo Preview URL Listener
    const photoUrlInput = document.getElementById('photo-url');
    if(photoUrlInput) {
        photoUrlInput.addEventListener('input', (e) => {
            const previewBox = document.getElementById('photo-preview-box');
            const previewImg = document.getElementById('photo-preview-img');
            if(e.target.value.trim()) {
                previewImg.src = e.target.value.trim();
                previewBox.style.display = 'block';
            } else {
                previewBox.style.display = 'none';
            }
        });
    }
});

function syncProfileToUI(data) {
    if(!data) return;
    const fields = ['name', 'handle', 'avatar', 'banner', 'catchphrase', 'bio', 'color', 'youtube', 'twitter', 'msTitle', 'msTarget'];
    fields.forEach(f => {
        const el = document.getElementById('vt-' + f);
        if(el && data[f]) el.value = data[f];
    });
    
    // Sync sidebar footer profile specifically for visual sync
    const sidebarName = document.querySelector('.sidebar-footer .user-name');
    const sidebarAvatar = document.querySelector('.sidebar-footer .mini-avatar');
    if(sidebarName && data.name) sidebarName.textContent = data.name;
    if(sidebarAvatar && data.avatar) sidebarAvatar.src = data.avatar;
}

function initTheme() {
    const theme = localStorage.getItem('vup-theme') || '';
    const style = localStorage.getItem('vup-style-pack') || 'standard';
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.style = style;
    
    // Smooth transition for styles
    document.documentElement.style.setProperty('--transition-speed', '0.3s');
    
    const icon = document.getElementById('theme-icon');
    if(icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    
    // Highlight active style card with more than just border color
    document.querySelectorAll('.style-pack-card').forEach(c => {
        const isActive = c.dataset.style === style;
        c.style.borderColor = isActive ? 'var(--primary)' : 'var(--border)';
        c.style.boxShadow = isActive ? '0 0 15px var(--primary-light)' : 'none';
        c.style.transform = isActive ? 'scale(1.05)' : 'scale(1)';
    });
}

function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? '' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('vup-theme', next);
    initTheme();
    logActivity('Settings', `切換系統主題至 ${next === 'dark' ? '深色' : '淺色'} 模式`);
}

function applyProfileStyle(style) {
    localStorage.setItem('vup-profile-style', style);
    
    // Update UI active state (mini grid)
    document.querySelectorAll('.style-pack-item').forEach(item => {
        item.classList.toggle('active', item.dataset.style === style);
    });
    
    // Show notification only as requested
    showToast(`已切換風格為 ${style.toUpperCase()}`, 'success');
}

// ---- Analytics ----
function initAnalytics() {
    const ctx = document.getElementById('growthChart');
    if(!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: '贊助點數成長',
                data: [5000, 15000, 28000, 42500],
                borderColor: '#ec4899',
                backgroundColor: 'rgba(236,72,153,0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ---- Milestones ----
function closeNewMilestoneModal() {
    document.getElementById('milestone-modal').classList.remove('open');
    // Reset form
    document.getElementById('ms-title').value = '';
    document.getElementById('ms-goal').value = '';
    document.getElementById('ms-desc').value = '';
    setProjectType('individual');
}

function renderMilestones(filter = 'all') {
    const container = document.getElementById('milestone-list-container');
    const reviewContainer = document.getElementById('review-list-container');
    const adminPanel = document.getElementById('admin-review-panel');
    if (!container || !reviewContainer) return;

    // 1. Separate Active vs Pending
    const active = MILESTONES.filter(ms => ms.status === 'active' && (filter === 'all' || ms.type === filter));
    const pending = MILESTONES.filter(ms => ms.status !== 'active');

    // 2. Render Review Queue (Admin)
    if (pending.length > 0) {
        adminPanel.style.display = 'block';
        reviewContainer.innerHTML = pending.map(ms => `
            <div class="milestone-card admin-review-card">
                <div class="ms-card-content">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span class="status-badge status-${ms.status}">
                            <i class="fas fa-clock"></i> ${ms.status === 'pending_collab' ? '待合作者同意' : '待人工審核'}
                        </span>
                        <span class="ms-tag ${ms.type}">${ms.type === 'collab' ? '共同企劃' : '個人'}</span>
                    </div>
                    <h3 class="ms-title">${ms.title}</h3>
                    <div class="collab-member-stack" title="參與者">
                        <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Yume" />
                        ${(ms.participants || []).map(p => `<img src="${p.avatar}" />`).join('')}
                    </div>
                    <div class="ms-actions" style="margin-top:15px; border-top:1px solid rgba(0,0,0,0.05); padding-top:15px;">
                        ${ms.status === 'pending_collab' ? 
                            `<button class="btn-primary btn-sm" onclick="simulateParticipantAccept('${ms.id}')"><i class="fas fa-check-double"></i> 模擬對方同意</button>` :
                            `<button class="btn-primary btn-sm" style="background:#16a34a;" onclick="approveMilestone('${ms.id}')"><i class="fas fa-user-check"></i> 點擊手動審核通過</button>`
                        }
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        adminPanel.style.display = 'none';
    }

    // 3. Render Active Milestones
    if (active.length === 0) {
        container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">目前尚無正式企劃活動</div>';
        return;
    }

    container.innerHTML = active.map(ms => `
        <div class="milestone-card">
            <div class="ms-card-content">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom: 12px;">
                    <span class="tag ${ms.type === 'individual' ? 't-blue' : 't-purple'}">${ms.type === 'individual' ? '個人企劃' : '共同合作'}</span>
                    <span class="status-badge status-active"><i class="fas fa-circle pulse"></i> 募資中</span>
                </div>
                <h3 class="ms-title" style="font-size: 1.1rem; font-weight: 800; margin-bottom: 15px;">${ms.title}</h3>
                <div class="ms-stats">
                    <div class="ms-progress-info" style="display:flex; justify-content:space-between; font-size: 0.85rem; margin-bottom: 8px;">
                        <span class="text-muted">進度 ${Math.round((ms.current/ms.goal)*100)}%</span>
                        <span class="font-mono" style="color: var(--primary);">${ms.current.toLocaleString()} / ${ms.goal.toLocaleString()}</span>
                    </div>
                    <div class="progress-bar-bg" style="height: 8px; background: #eee; border-radius: 4px; overflow: hidden;">
                        <div class="progress-bar-fill" style="width:${(ms.current/ms.goal)*100}%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--secondary));"></div>
                    </div>
                </div>
                <div class="ms-actions" style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button class="btn-outline btn-sm" onclick="openRanking('${ms.id}')" style="padding: 8px;"><i class="fas fa-list-ol"></i> 排行榜</button>
                    <button class="btn-primary btn-sm" onclick="openShareModal('${ms.id}')" style="padding: 8px;"><i class="fas fa-share-alt"></i> 分享</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function submitMilestone() {
    const title = document.getElementById('ms-title').value.trim();
    const goal = parseInt(document.getElementById('ms-goal').value);
    const type = document.getElementById('ms-type').value;
    
    if(!title || !goal) return showToast('請完整填寫項目標題與目標金額', 'error');

    const newMs = {
        id: 'ms-' + Date.now(),
        type: type,
        title, goal, current: 0,
        status: (type === 'collab') ? 'pending_collab' : 'pending_admin',
        desc: document.getElementById('ms-desc').value,
        banner: document.getElementById('ms-banner').value || 'https://images.unsplash.com/photo-1540221652346-e5dd6b1d4c2e?auto=format&fit=crop&q=80',
        participants: selectedCollabs,
        donors: []
    };

    try {
        await vupFetch('/milestones', {
            method: 'POST',
            body: JSON.stringify(newMs)
        });
        
        // 重新從伺服器拿最新清單
        MILESTONES = await vupFetch('/milestones');
        
        selectedCollabs = [];
        renderSelectedTags();
        renderMilestones();
        closeNewMilestoneModal();
        showToast('企劃已成功提交至伺服器！', 'success');
    } catch (err) {
        showToast('提交失敗，請檢查伺服器連線', 'error');
    }
}

// ---- Collab Mention Logic ----
function handleCollabSearch(query) {
    const resultsDiv = document.getElementById('collab-search-results');
    if (!query.trim()) { resultsDiv.style.display = 'none'; return; }
    
    const matches = MOCK_VTUBERS.filter(v => v.name.includes(query) && !selectedCollabs.some(s => s.name === v.name));
    if (matches.length > 0) {
        resultsDiv.innerHTML = matches.map(v => `
            <div class="mention-item" onclick="addCollab('${v.name}')">
                <img src="${v.avatar}" class="mention-avatar" />
                <span>${v.name}</span>
            </div>
        `).join('');
        resultsDiv.style.display = 'block';
    } else {
        resultsDiv.style.display = 'none';
    }
}

function addCollab(name) {
    const vt = MOCK_VTUBERS.find(v => v.name === name);
    if (vt) {
        selectedCollabs.push(vt);
        renderSelectedTags();
        document.getElementById('collab-search').value = '';
        document.getElementById('collab-search-results').style.display = 'none';
    }
}

function removeCollab(name) {
    selectedCollabs = selectedCollabs.filter(v => v.name !== name);
    renderSelectedTags();
}

function renderSelectedTags() {
    const container = document.getElementById('selected-collab-tags');
    if (!container) return;
    container.innerHTML = selectedCollabs.map(v => `
        <div class="tag-item">
            <img src="${v.avatar}" style="width:18px; height:18px; border-radius:50%;" />
            ${v.name}
            <i class="fas fa-times tag-remove" onclick="removeCollab('${v.name}')"></i>
        </div>
    `).join('');
}

// ---- Approval Flow Simulation ----
function simulateParticipantAccept(id) {
    const idx = MILESTONES.findIndex(m => m.id === id);
    if (idx !== -1) {
        MILESTONES[idx].status = 'pending_admin';
        localStorage.setItem('vup-milestones', JSON.stringify(MILESTONES));
        renderMilestones();
        showToast('合作者已全數同意，等待平台人工審核中', 'success');
    }
}

function approveMilestone(id) {
    const idx = MILESTONES.findIndex(m => m.id === id);
    if (idx !== -1) {
        MILESTONES[idx].status = 'active';
        localStorage.setItem('vup-milestones', JSON.stringify(MILESTONES));
        renderMilestones();
        logActivity('Admin', `手動審核通過企劃「${MILESTONES[idx].title}」`);
        showToast('企劃審核通過！現在粉絲已可看到此項目', 'success');
    }
}

// ---- QR Code & Sharing ----
function openShareModal(id) {
    const ms = MILESTONES.find(m => m.id === id);
    if (!ms) return;
    
    document.getElementById('share-ms-title').innerText = ms.title;
    const shareLink = `http://vup.platform/vtuber_profile.html?id=${ms.id}#milestones`;
    document.getElementById('share-link-input').value = shareLink;
    
    // Generate Mock QR (Simple SVG)
    const qrHolder = document.getElementById('qr-svg-holder');
    qrHolder.innerHTML = `
        <svg viewBox="0 0 100 100" width="160" height="160">
            <rect width="100" height="100" fill="white" />
            <path d="M10,10 h30 v30 h-30 z M15,15 h20 v20 h-20 z" fill="var(--primary)" />
            <path d="M60,10 h30 v30 h-30 z M65,15 h20 v20 h-20 z" fill="var(--primary)" />
            <path d="M10,60 h30 v30 h-30 z M15,65 h20 v20 h-20 z" fill="var(--primary)" />
            <rect x="50" y="50" width="10" height="10" fill="var(--primary)" />
            <rect x="70" y="70" width="10" height="10" fill="var(--primary)" />
            <rect x="80" y="50" width="10" height="10" fill="var(--primary)" />
            <rect x="60" y="80" width="10" height="10" fill="var(--primary)" />
        </svg>
    `;
    
    document.getElementById('share-modal').classList.add('open');
}

function closeShareModal() { document.getElementById('share-modal').classList.remove('open'); }

function copyShareURL() {
    const input = document.getElementById('share-link-input');
    input.select();
    document.execCommand('copy');
    showToast('連結已複製到剪貼簿', 'success');
}

function downloadQRAsset() {
    showToast('正在準備直播專屬素材包...', 'info');
    setTimeout(() => showToast('素材包已下載至下載資料匣', 'success'), 1500);
}

// ---- Premium Ranking UI ----
function generateSparkline(data) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 100;
    const height = 30;
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');
    return `<svg viewBox="0 0 ${width} ${height}" class="sparkline"><polyline fill="none" stroke="var(--primary)" stroke-width="2" points="${points}"/></svg>`;
}

function openRanking(id) {
    const ms = MILESTONES.find(m => m.id === id);
    if (!ms) return;

    const list = document.getElementById('ranking-list');
    const donors = ms.donors.slice(0, 10);

    if (donors.length === 0) {
        list.innerHTML = '<div class="p-5 text-center text-muted">尚無捐款紀錄</div>';
    } else {
        list.innerHTML = donors.map((d, index) => {
            const pct = Math.min(100, (d.amount / ms.goal) * 100).toFixed(1);
            const rankClass = index < 3 ? `rank-shield rank-${index + 1}` : 'rank-num';
            const medals = ['<i class="fas fa-crown"></i>', '2', '3'];
            const badge = index < 3 ? medals[index] : index + 1;
            
            // Generate some random trend data for visual "Stock" style
            const trendData = Array.from({length: 8}, () => Math.floor(Math.random() * 100));
            const trendDir = Math.random() > 0.4 ? 'up' : 'down';

            return `
                <div class="ranking-item stock-style">
                    <div class="${rankClass}">${badge}</div>
                    <div class="rank-info" style="flex:1;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="fan-meta">
                                <span class="fan-name">${d.name}</span>
                                <div class="fan-trend-indicator ${trendDir}">
                                    <i class="fas fa-caret-${trendDir === 'up' ? 'up' : 'down'}"></i>
                                    ${(Math.random() * 5).toFixed(1)}%
                                </div>
                            </div>
                            <div class="fan-chart-mini">${generateSparkline(trendData)}</div>
                            <div class="fan-wealth">
                                <span class="fan-val">${d.amount.toLocaleString()} 點</span>
                                <span class="fan-pct text-muted">${pct}% of Goal</span>
                            </div>
                            <!-- AI Contextual Action -->
                            <div class="fan-actions" style="margin-left: 15px;">
                                <button class="ai-btn-mini" onclick="aiGenerateThanks('${ms.id}', '${d.name}', ${d.amount})" title="AI 生成感謝文">
                                    <i class="fas fa-magic"></i>
                                </button>
                            </div>
                        </div>
                        <div class="contrib-bar-wrap">
                            <div class="contrib-bar-fill" style="width: ${pct}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    document.getElementById('ranking-modal').classList.add('open');
}

/**
 * AI 智慧感謝生成 (100% 離線)
 * 抓取當前里程碑標題與捐款進度，產出貼文草稿並跳轉
 */
async function aiGenerateThanks(msId, donorName, amount) {
    const ms = MILESTONES.find(m => m.id === msId);
    if (!ms) return;

    const progress = Math.min(100, (ms.current / ms.goal) * 100).toFixed(1);
    
    // 1. 關閉排行榜視窗
    document.getElementById('ranking-modal').classList.remove('open');
    
    // 2. 切換至貼文發布分頁
    switchTab('posts');
    
    // 3. 呼叫在地 AI 引擎獲取感謝文案
    const suggestion = await getAISuggestion('donation_thanks', { 
        title: ms.title, 
        percent: progress,
        donor: donorName 
    });
    
    // 4. 將建議填入貼文輸入框
    const postInput = document.getElementById('vt-post-input');
    if (postInput) {
        postInput.value = suggestion;
        postInput.focus();
        showToast(`已根據「${ms.title}」生成感謝草稿 ✨`, 'success');
    }
}

// ---- History / Activity Logs ----
async function logActivity(category, message) {
    try {
        await vupFetch('/activity', {
            method: 'POST',
            body: JSON.stringify({ category, message })
        });
        renderHistory();
    } catch (e) {}
}

async function renderHistory() {
    const container = document.getElementById('history-container');
    if(!container) return;
    
    try {
        ACTIVITY_LOG = await vupFetch('/activity');
    } catch (e) {
        ACTIVITY_LOG = [];
    }

    if(ACTIVITY_LOG.length === 0) {
        container.innerHTML = '<div class="p-5 text-center text-muted">尚無歷史活動紀錄</div>';
        return;
    }

    container.innerHTML = ACTIVITY_LOG.map(log => `
        <div class="history-item" style="padding:15px; border-bottom:1px solid var(--border); display:flex; gap:15px; align-items:center;">
            <div class="history-icon" style="flex-shrink:0; width:40px; height:40px; background:var(--bg-subtle); border-radius:8px; display:flex; align-items:center; justify-content:center; color:var(--primary);">
                <i class="${getHistoryIcon(log.category)}"></i>
            </div>
            <div class="history-content">
                <div style="font-size:0.9rem; font-weight:600;">${log.message}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${log.date} ${log.time} • <span class="text-primary">${log.category}</span></div>
            </div>
        </div>
    `).join('');
}

function getHistoryIcon(cat) {
    const icons = { Milestone: 'fas fa-bullseye', Customization: 'fas fa-palette', Settings: 'fas fa-cog' };
    return icons[cat] || 'fas fa-info-circle';
}

function clearHistory() {
    if(confirm('確定要清除所有歷史紀錄嗎？')) {
        ACTIVITY_LOG = [];
        localStorage.removeItem('vup-activity-log');
        renderHistory();
        showToast('紀錄已清除', 'info');
    }
}

// ---- General Helpers ----
async function switchTab(tabId) {
    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(p => p.classList.remove('active'));
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(n => n.classList.remove('active'));
    
    const activeNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if(activeNav) activeNav.classList.add('active');

    const target = document.getElementById('panel-' + tabId);
    if(target) {
        target.classList.add('active');
        // Re-render data based on tab to ensure fresh state
        if(tabId === 'milestones') renderMilestones();
        if(tabId === 'history') renderHistory();
        if(tabId === 'posts') {
            const posts = await vupFetch('/posts');
            renderPosts(posts);
        }
    }
    
    const titles = { 
        overview: '總覽數據 (Overview)', 
        milestones: '里程碑管理 (Milestones)',
        crm: '粉絲關係管理 (CRM)',
        posts: '限定內容發布 (Posts)',
        history: '活動歷史紀錄 (History)',
        customization: '專屬頁面自訂',
        settings: '帳號與收款設定'
    };
    const titleEl = document.getElementById('page-title-h1');
    if(titleEl) titleEl.textContent = titles[tabId] || 'Dashboard';
}

async function loadStoredProfile() {
    try {
        const data = await vupFetch('/profile');
        if(data.name) document.getElementById('vt-name').value = data.name;
        if(data.handle) document.getElementById('vt-handle').value = data.handle;
        if(data.avatar) document.getElementById('vt-avatar').value = data.avatar;
        if(data.banner) document.getElementById('vt-banner').value = data.banner;
        if(data.catchphrase) document.getElementById('vt-catchphrase').value = data.catchphrase;
        if(data.bio) document.getElementById('vt-bio').value = data.bio;
        if(data.color) document.getElementById('vt-color').value = data.color;
        if(data.youtube) document.getElementById('vt-youtube').value = data.youtube;
        if(data.twitter) document.getElementById('vt-twitter').value = data.twitter;
        if(data.instagram) document.getElementById('vt-ig').value = data.instagram;
        if(data.msTitle) document.getElementById('vt-ms-title').value = data.msTitle;
        if(data.msTarget) document.getElementById('vt-ms-target').value = data.msTarget;
    } catch(e) { 
        console.warn("無法從伺服器載入個人檔案，可能尚未設定");
    }
}

async function saveVProfile() {
    const data = {
        name: document.getElementById('vt-name').value,
        handle: document.getElementById('vt-handle').value,
        avatar: document.getElementById('vt-avatar').value,
        banner: document.getElementById('vt-banner').value,
        catchphrase: document.getElementById('vt-catchphrase').value,
        bio: document.getElementById('vt-bio').value,
        color: document.getElementById('vt-color').value,
        youtube: document.getElementById('vt-youtube').value,
        twitter: document.getElementById('vt-twitter').value,
        instagram: document.getElementById('vt-ig').value,
        msTitle: document.getElementById('vt-ms-title').value,
        msTarget: document.getElementById('vt-ms-target').value,
        style: localStorage.getItem('vup-profile-style') || 'v-up'
    };

    try {
        await vupFetch('/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        
        syncPreview();
        
        const toast = document.getElementById('save-toast');
        if(toast) {
            toast.style.display = 'block';
            setTimeout(() => toast.style.display = 'none', 3000);
        }
        
        logActivity('Customization', `更新了專屬頁面設定 (${data.name})`);
        showToast('設定已成功儲存至雲端', 'success');
    } catch (err) {
        showToast('儲存失敗，請檢查伺服器連 States', 'error');
    }
}

// ---- Modal Utilities ----
function openPhotoModal() { document.getElementById('photo-modal').classList.add('open'); }
function closePhotoModal() { 
    document.getElementById('photo-modal').classList.remove('open');
    document.getElementById('photo-url').value = '';
    document.getElementById('photo-title').value = '';
    const previewBox = document.getElementById('photo-preview-box');
    if (previewBox) previewBox.style.display = 'none';
}

// ---- Posts & Photos API ----
async function publishPost() {
    const input = document.getElementById('vt-post-input');
    const content = input.value.trim();
    if(!content) return showToast('請輸入文章內容', 'error');

    try {
        await vupFetch('/posts', {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        input.value = '';
        const posts = await vupFetch('/posts');
        renderPosts(posts);
        logActivity('Posts', `發布了新貼文：${content.substring(0, 15)}...`);
        showToast('貼文發布成功！', 'success');
    } catch (e) {
        showToast('發布失敗', 'error');
    }
}

function renderPosts(posts) {
    const list = document.getElementById('vt-post-list');
    if(!list) return;
    if(!posts || posts.length === 0) {
        list.innerHTML = '<div class="empty-state">尚無發布過的內容</div>';
        return;
    }
    list.innerHTML = posts.map(p => `
        <div class="card" style="padding:1.5rem; background:var(--bg-subtle); border-radius:16px;">
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:10px;">
                <i class="fas fa-clock"></i> ${p.date}
            </div>
            <div style="white-space: pre-wrap; line-height:1.7;">${p.content}</div>
        </div>
    `).join('');
}

async function publishPhoto() {
    const url = document.getElementById('photo-url').value.trim();
    const title = document.getElementById('photo-title').value.trim();
    if(!url) return showToast('請提供圖片網址', 'error');

    try {
        await vupFetch('/photos', {
            method: 'POST',
            body: JSON.stringify({ url, title: title || '新相片' })
        });
        closePhotoModal();
        logActivity('Posts', `發布了新相片：${title || '未命名'}`);
        showToast('相片已成功發布', 'success');
        syncPreview();
    } catch (e) {
        showToast('相片發布失敗', 'error');
    }
}

// ---- AI Assistant Handlers ----
async function triggerAI(type, targetInputId) {
    const input = document.getElementById(targetInputId);
    
    // Smart Context Sensing: 根據不同情境抓取相關標題
    let context = {};
    if (type === 'milestone_desc') {
        // 從里程碑編輯視窗抓取標題
        const titleEl = document.getElementById('ms-title');
        if (titleEl && titleEl.value) context.title = titleEl.value;
    } else if (type === 'post_social' || type === 'post_hype') {
        // 如果是在發貼文，嘗試抓取目前最新（或選定）的里程碑作為語境
        const activeMs = MILESTONES[0]; // 預設用最新的
        if (activeMs) {
            context.title = activeMs.title;
            context.percent = Math.min(100, (activeMs.current / activeMs.goal) * 100).toFixed(1);
        }
    }

    // Show loading state
    const modal = document.getElementById('ai-modal');
    const content = document.getElementById('ai-suggestion-content');
    content.innerHTML = '<div class="ai-loading-skeleton"></div><p style="text-align:center;color:var(--primary);margin-top:10px;">離線 AI 正在拼湊靈感... ✨</p>';
    modal.classList.add('open');

    const suggestion = await getAISuggestion(type, context);
    showAISuggestionModal(targetInputId, suggestion);
}

// ---- Live Preview Logic ----
function syncPreview() {
    const container = document.getElementById('profile-preview-container');
    if(!container) return;

    // 1. Gather data from Dashboard inputs
    const profileData = {
        name: document.getElementById('vt-name').value || 'SAKURA NOVA',
        handle: document.getElementById('vt-handle').value || '@SakuraNova',
        avatar: document.getElementById('vt-avatar').value || 'image/miku_test.png',
        banner: document.getElementById('vt-banner').value || '',
        catchphrase: document.getElementById('vt-catchphrase').value || '',
        bio: document.getElementById('vt-bio').value || '',
        color: document.getElementById('vt-color').value || '#FF85C0',
        yt: document.getElementById('vt-youtube')?.value || '#',
        tw: document.getElementById('vt-twitter')?.value || '#',
        ig: document.getElementById('vt-ig')?.value || '#',
        msTitle: document.getElementById('vt-ms-title').value || '',
        msTarget: document.getElementById('vt-ms-target').value || '',
        style: localStorage.getItem('vup-profile-style') || 'v-up'
    };

    // 2. Persist to localStorage for the iframe to pick up
    localStorage.setItem('vt-profile-data', JSON.stringify(profileData));
    localStorage.setItem('vup-milestones', JSON.stringify(MILESTONES));

    // 3. Update Iframe (Teammate's Official Layout)
    if (!container.querySelector('iframe')) {
        container.innerHTML = `<iframe id="preview-iframe" src="vtuber_profile.html" style="width:100%; height:100%; border:none; background:white;"></iframe>`;
    } else {
        // Trigger sync inside iframe via storage event or reload
        const iframe = document.getElementById('preview-iframe');
        iframe.contentWindow.location.reload(); 
    }

    // 4. Re-initialize overlay regions (approximate for the new layout)
    initPreviewOverlay();
}

function setPreviewTheme(theme) {
    const container = document.getElementById('profile-preview-container');
    if(!container) return;
    container.dataset.theme = theme;
    
    document.getElementById('p-light-btn').classList.toggle('active', theme === 'light');
    document.getElementById('p-dark-btn').classList.toggle('active', theme === 'dark');
}

function focusSetting(id) {
    const el = document.getElementById(id);
    if(el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight the group
        const group = document.getElementById('group-' + id.replace('vt-', ''));
        if(group) {
            group.style.background = 'var(--primary-light)';
            setTimeout(() => group.style.background = 'transparent', 1500);
        }
    }
}

function initPreviewOverlay() {
    const overlay = document.querySelector('.preview-overlay');
    if(!overlay) return;
    overlay.innerHTML = ''; 

    // Precise Mapped coordinates for the official vtuber_profile.html layout
    // Hero Image starts at ~140px top (Nav + Hero Margin), 30px left
    const regions = [
        { top: '140px', left: '30px', width: '480px', height: '340px', field: 'vt-avatar' },
        { top: '180px', left: '558px', width: '450px', height: '100px', field: 'vt-name' },
        { top: '300px', left: '558px', width: '450px', height: '120px', field: 'vt-bio' }
    ];

    regions.forEach(r => {
        const div = document.createElement('div');
        div.className = 'edit-region';
        div.style.top = r.top;
        div.style.left = r.left;
        div.style.width = r.width;
        div.style.height = r.height;
        div.onclick = (e) => {
            e.stopPropagation();
            focusSetting(r.field);
        };
        overlay.appendChild(div);
    });
}

function showFanInsight(name) {
    const card = document.getElementById('fan-insight-card');
    const nameEl = document.getElementById('insight-fan-name');
    const daysEl = document.getElementById('insight-days');
    const totalEl = document.getElementById('insight-total');
    const rankEl = document.getElementById('insight-rank');
    
    if(!card) return;
    
    // Mock data for insights
    const data = {
        '阿龍': { days: 520, total: '15,000', rank: 'Top 0.5%' },
        '深海的貓': { days: 180, total: '3,200', rank: 'Top 5%' }
    };
    
    const fan = data[name] || { days: Math.floor(Math.random() * 300), total: '---', rank: 'New Fan' };
    
    nameEl.textContent = `粉絲洞察: ${name}`;
    daysEl.textContent = fan.days;
    totalEl.textContent = fan.total;
    rankEl.textContent = fan.rank;
    
    card.classList.add('show');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showToast(msg, type = 'info') {
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast'; t.className = 'ds-toast';
        document.body.appendChild(t);
    }
    t.innerHTML = `<span>${type === 'success' ? '✅' : 'ℹ️'}</span> ${msg}`;
    t.className = `ds-toast ds-toast-${type} show`;
    setTimeout(() => t.classList.remove('show'), 3500);
}

function openNewMilestoneModal() { document.getElementById('milestone-modal').classList.add('open'); }
function closeNewMilestoneModal() { document.getElementById('milestone-modal').classList.remove('open'); }
function closeRankingModal() { document.getElementById('ranking-modal').classList.remove('open'); }
function setProjectType(type) {
    document.getElementById('ms-type').value = type;
    document.getElementById('type-indie').classList.toggle('active', type === 'individual');
    document.getElementById('type-collab').classList.toggle('active', type === 'collab');
}

window.onclick = e => { if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open'); };
