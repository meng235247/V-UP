// ---- State & Storage ----
let MILESTONES = JSON.parse(localStorage.getItem('vup-milestones')) || getInitialMilestones();
let ACTIVITY_LOG = JSON.parse(localStorage.getItem('vup-activity-log')) || [];
const MOCK_VTUBERS = [
    { name: '月野しずく', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Shizuku' },
    { name: '星野夢彩', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Yume' },
    { name: 'Kira', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Kira' },
    { name: '阿龍', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Dragon' }
];

let selectedCollabs = [];

function getInitialMilestones() {
    return [
        {
            id: 'ms-1', type: 'individual', title: '錄音室級別麥克風升級！',
            goal: 20000, current: 15000,
            desc: '升級專業麥克風，提升直播音質。',
            donors: generateMockDonors(15)
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
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderMilestones();
    renderHistory();
    initAnalytics();
    
    // Initial Profile Sync
    loadStoredProfile();
    syncPreview();
    
    // Sidebar nav
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', e => {
            if(item.dataset.tab) {
                e.preventDefault();
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
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
function renderMilestones(filter = 'all') {
    const container = document.getElementById('milestone-list-container');
    if (!container) return;

    const filtered = MILESTONES.filter(ms => filter === 'all' || ms.type === filter);
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">目前尚無相關企劃</div>';
        return;
    }

    container.innerHTML = filtered.map(ms => `
        <div class="milestone-card">
            <div class="ms-card-content">
                <span class="ms-tag ${ms.type}">${ms.type === 'individual' ? '個人' : '共同'}</span>
                <h3 class="ms-title">${ms.title}</h3>
                <div class="ms-stats">
                    <div class="ms-progress-info">
                        <span>進度 ${Math.round((ms.current/ms.goal)*100)}%</span>
                        <span class="font-mono">${ms.current.toLocaleString()} / ${ms.goal.toLocaleString()}</span>
                    </div>
                    <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${(ms.current/ms.goal)*100}%;"></div></div>
                </div>
                <div class="ms-actions">
                    <button class="btn-outline btn-sm" onclick="openRanking('${ms.id}')"><i class="fas fa-list-ol"></i> 排行榜</button>
                    <button class="btn-primary btn-sm" onclick="openShare('${ms.id}')"><i class="fas fa-share-alt"></i> 分享</button>
                </div>
            </div>
        </div>
    `).join('');
}

function submitMilestone() {
    const title = document.getElementById('ms-title').value.trim();
    const goal = parseInt(document.getElementById('ms-goal').value);
    if(!title || !goal) return showToast('請完整填寫資訊', 'error');

    const newMs = {
        id: 'ms-' + Date.now(),
        type: document.getElementById('ms-type').value,
        title, goal, current: 0,
        desc: document.getElementById('ms-desc').value,
        donors: []
    };

    MILESTONES.unshift(newMs);
    localStorage.setItem('vup-milestones', JSON.stringify(MILESTONES));
    renderMilestones();
    closeNewMilestoneModal();
    logActivity('Milestone', `建立了新企劃「${title}」，目標 ${goal.toLocaleString()} 點`);
    showToast('里程碑企劃已發起', 'success');
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

// ---- History / Activity Logs ----
function logActivity(category, message) {
    const entry = {
        id: Date.now(),
        category,
        message,
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString()
    };
    ACTIVITY_LOG.unshift(entry);
    localStorage.setItem('vup-activity-log', JSON.stringify(ACTIVITY_LOG.slice(0, 50)));
    renderHistory();
}

function renderHistory() {
    const container = document.getElementById('history-container');
    if(!container) return;

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
function switchTab(tabId) {
    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(p => p.classList.remove('active'));
    
    // Reset all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(n => n.classList.remove('active'));
    
    // Hide fan insight card if switching tabs
    const insight = document.getElementById('fan-insight-card');
    if(insight) insight.classList.remove('show');
    
    // Activate target panel
    const target = document.getElementById('panel-' + tabId);
    if(target) target.classList.add('active');
    
    // Activate corresponding sidebar item using data-tab
    const activeNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if(activeNav) activeNav.classList.add('active');
    
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

function loadStoredProfile() {
    const saved = localStorage.getItem('vt-profile-data');
    if (saved) {
        try {
            const data = JSON.parse(saved);
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
        } catch(e) { console.error("Error loading profile", e); }
    }
}

function saveVProfile() {
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

    localStorage.setItem('vt-profile-data', JSON.stringify(data));
    
    // Sync to preview immediately
    syncPreview();
    
    const toast = document.getElementById('save-toast');
    if(toast) {
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);
    }
    
    logActivity('Customization', `更新了專屬頁面設定 (${data.name})`);
    showToast('設定已成功發布', 'success');
}

// ---- Photo Publishing ----
function openPhotoModal() { document.getElementById('photo-modal').classList.add('open'); }
function closePhotoModal() { 
    document.getElementById('photo-modal').classList.remove('open');
    document.getElementById('photo-url').value = '';
    document.getElementById('photo-title').value = '';
    document.getElementById('photo-preview-box').style.display = 'none';
}

function publishPhoto() {
    const url = document.getElementById('photo-url').value.trim();
    const title = document.getElementById('photo-title').value.trim();
    if(!url) return showToast('請提供圖片網址', 'error');

    const photo = {
        id: 'photo-' + Date.now(),
        type: 'photo',
        url: url,
        title: title || '新發布的相片',
        date: new Date().toLocaleString()
    };

    let posts = JSON.parse(localStorage.getItem('vt-posts') || '[]');
    posts.unshift(photo);
    localStorage.setItem('vt-posts', JSON.stringify(posts));
    
    closePhotoModal();
    logActivity('Posts', `發布了新相片：${title || '未命名'}`);
    showToast('相片已成功發布', 'success');
    
    // Refresh preview if in customization tab
    syncPreview();
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
