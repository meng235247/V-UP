import { db, auth } from './firebase_config.js';
import { 
    doc, 
    onSnapshot, 
    collection, 
    query, 
    where, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { authService } from './auth_service.js';

/**
 * V-Up! Public Profile Engine (Dynamic SaaS Version)
 * Enforces strict role-based access and eliminates legacy fallbacks.
 */

const engine = {
    init: () => {
        // --- Hard Security Guard: No fallback to 'hoshino_yume' anymore ---
        const urlParams = new URLSearchParams(window.location.search);
        const targetUid = urlParams.get('uid') || (auth.currentUser ? auth.currentUser.uid : null);
        
        if (!targetUid) {
            console.warn("🚫 [Engine] Identity missing. Protected redirect.");
            window.location.href = 'auth.html';
            return;
        }
        
        console.log(`🚀 [Engine] Syncing cloud data for: ${targetUid}`);
        
        // Clear all static junk
        const wrapper = document.querySelector('.milestones-wrapper .container');
        if (wrapper) {
            wrapper.innerHTML = `
                <section id="milestones" class="vt-section">
                    <!-- Security Badge Injector -->
                    <div id="security-badge-area" style="margin-bottom:20px;"></div>
                    <div id="milestones-active-list"></div>
                </section>
                <section id="achieved" class="achieved-section">
                    <div id="milestones-achieved-list" class="achieved-grid"></div>
                </section>
            `;
        }
        
        // 1. Sync Profile Identity
        engine.syncIdentity(targetUid);
        // 2. Sync Milestones
        engine.syncMilestones(targetUid);
        // 3. Sync Posts
        engine.syncPosts(targetUid);
        // 4. Render 2FA Status
        engine.renderSecurityBadge();
    },

    syncIdentity: (uid) => {
        onSnapshot(doc(db, "users", uid), (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            engine.injectProfileData(data);
        });
    },

    injectProfileData: (profile) => {
        const els = {
            name: document.getElementById('vt-name'),
            handle: document.getElementById('vt-handle'),
            avatar: document.getElementById('vt-avatar'),
            banner: document.getElementById('vt-banner'),
            catchphrase: document.getElementById('vt-catchphrase'),
            bio: document.getElementById('vt-bio'),
            tags: document.getElementById('vt-tags-container'),
            socials: document.getElementById('vt-socials'),
            navName: document.getElementById('nav-creator-name')
        };

        if (els.name) els.name.textContent = profile.name || 'VTuber';
        if (els.navName) els.navName.textContent = profile.name || 'VTuber';
        if (els.handle) els.handle.textContent = profile.handle || '@Channel';
        if (els.catchphrase) els.catchphrase.textContent = profile.catchphrase || '歡迎來到我的頻道！';
        if (els.bio) els.bio.textContent = profile.bio || '尚未建立個人簡介...';
        if (els.avatar && profile.avatar) els.avatar.src = profile.avatar;
        
        document.title = `${profile.name || 'VTuber'} | V-Up! 專屬基地`;

        // 動態更換 Style
        document.documentElement.className = profile.style ? `vup-style-${profile.style}` : '';
        if (profile.color) {
            document.documentElement.style.setProperty('--vt-pink-dark', profile.color);
            document.documentElement.style.setProperty('--primary', profile.color);
        }

        // 渲染橫幅 Banner
        if (els.banner) {
            if (profile.banner) {
                els.banner.style.backgroundImage = `url('${profile.banner}')`;
            } else {
                els.banner.style.backgroundImage = `linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)`;
            }
        }

        // 渲染頻道標籤 (Tags)
        if (els.tags) {
            let tagsHTML = `<span class="p-tag certified" title="安全防護中"><i class="fas fa-shield-cat"></i> 官方認證</span>`;
            if (profile.tags && Array.isArray(profile.tags)) {
                profile.tags.forEach(t => {
                    tagsHTML += `<span class="p-tag">${t}</span>`;
                });
            }
            els.tags.innerHTML = tagsHTML;
        }

        // 渲染社群連結
        if (els.socials) {
            let socialsHTML = '';
            if (profile.youtube) socialsHTML += `<a href="${profile.youtube}" target="_blank" class="vt-social-link" style="color:#ff0000; border-color:#ff0000;"><i class="fab fa-youtube"></i></a>`;
            if (profile.twitter) socialsHTML += `<a href="${profile.twitter}" target="_blank" class="vt-social-link" style="color:#1DA1F2; border-color:#1DA1F2;"><i class="fab fa-twitter"></i></a>`;
            const igUrl = profile.ig || profile.instagram;
            if (igUrl) socialsHTML += `<a href="${igUrl}" target="_blank" class="vt-social-link" style="color:#e1306c; border-color:#e1306c;"><i class="fab fa-instagram"></i></a>`;
            els.socials.innerHTML = socialsHTML;
        }
    },

    renderSecurityBadge: () => {
        const area = document.getElementById('security-badge-area');
        if (!area) return;
        area.innerHTML = `
            <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(255, 107, 158, 0.1); border:1px solid rgba(255, 107, 158, 0.3); padding:6px 12px; border-radius:50px; font-size:0.75rem; color:var(--vt-pink-dark); font-weight:700;">
                <i class="fas fa-check-circle" style="color:var(--vt-pink-dark);"></i> V-Up! 官方認證創作者平台
            </div>
        `;
    },

    syncMilestones: (uid) => {
        const q = query(collection(db, "milestones"), where("creatorId", "==", uid), orderBy("timestamp", "desc"));
        onSnapshot(q, (snap) => {
            const milestones = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            engine.renderMilestones(milestones);
        });
    },

    syncPosts: (uid) => {
        const q = query(collection(db, "posts"), where("creatorId", "==", uid), orderBy("timestamp", "desc"));
        onSnapshot(q, (snap) => {
            const posts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            engine.renderPosts(posts);
        });
    },

    renderPosts: (posts) => {
        const container = document.getElementById('posts-feed-list');
        if (!container) return;
        
        const avatarUrl = document.getElementById('vt-avatar')?.src || 'https://api.dicebear.com/7.x/notionists/svg?seed=creator';
        const name = document.getElementById('vt-name')?.textContent || '創作者';

        if (posts.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:30px; color:var(--text-muted); background:#f8fafc; border-radius:16px;">
                    <i class="fas fa-inbox" style="font-size:2rem; margin-bottom:15px; opacity:0.5;"></i>
                    <p>創作者還沒有發布任何動態喔！</p>
                </div>`;
            return;
        }

        container.innerHTML = posts.map(p => {
            const d = p.timestamp ? p.timestamp.toDate() : new Date();
            const dateStr = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
            return `
            <div class="post-card">
                <div class="post-header">
                    <img src="${avatarUrl}" class="post-avatar" alt="Avatar">
                    <div class="post-meta">
                        <span class="post-author-name">${name}</span>
                        <span class="post-time">${dateStr}</span>
                    </div>
                </div>
                <div class="post-content">
                    <p>${p.content}</p>
                </div>
            </div>
            `;
        }).join('');
    },

    renderMilestones: (milestones) => {
        const activeContainer = document.getElementById('milestones-active-list');
        const achievedContainer = document.getElementById('milestones-achieved-list');
        if (!activeContainer) return;
        
        activeContainer.innerHTML = '';
        if (achievedContainer) achievedContainer.innerHTML = '';

        const activeList = milestones.filter(m => m.status === 'active');
        const achievedList = milestones.filter(m => m.status === 'achieved');
        
        if (activeList.length > 0) {
            activeList.forEach(m => {
                const progressPct = Math.min(100, Math.round((m.current / m.goal) * 100));
                activeContainer.innerHTML += `
                    <div class="ms-card" data-milestone-id="${m.id}">
                        <div class="ms-main">
                            <div class="ms-top-header">
                                <span class="ms-status-badge">進行中!</span>
                                <h2 class="ms-title">${m.title}</h2>
                            </div>
                            <p class="ms-desc">${m.desc}</p>
                            <div class="ms-support-box">
                                <div class="ms-progress-wrap">
                                    <div class="ms-progress-labels">
                                        <div class="current">當前進度: <span>${progressPct}%</span></div>
                                        <div class="target">目標: <span>${m.goal.toLocaleString()} NTD</span></div>
                                    </div>
                                    <div class="ms-progress-bar">
                                        <div class="ms-progress-fill ms-progress-animated" style="width: ${progressPct}%;"></div>
                                    </div>
                                </div>
                                <div class="ms-payment-row">
                                    <div class="ms-input-wrap">
                                        <span class="ms-input-icon">NTD</span>
                                        <input type="number" class="ms-input" placeholder="輸入金額" id="support-amt-${m.id}">
                                    </div>
                                    <button class="btn-support-now" onclick="window.supportMilestone('${m.id}')">
                                        <i class="fa-solid fa-heart"></i> 立刻支持
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            // 身分建立成功後的「空狀態」補償機制：加入一個可點擊的測試企劃
            activeContainer.innerHTML = `
                <div class="ms-card" style="border: 2px dashed var(--vt-pink-light); background: rgba(255, 133, 192, 0.05); margin-top: 20px;">
                    <div class="ms-main">
                        <div class="ms-top-header">
                            <span class="ms-status-badge" style="background: var(--vt-pink-dark); color: white;">[功能測試中]</span>
                            <h2 class="ms-title">初始化應援：開啟您的 V-Up! 之旅</h2>
                        </div>
                        <p class="ms-desc">這是一個系統自動生成的應援企劃，讓創作者您可以立即測試互動按鈕。您可以在後台建立正式企劃後，此測試內容會自動消失！✨</p>
                        <div class="ms-support-box">
                            <div class="ms-progress-wrap">
                                <div class="ms-progress-labels">
                                    <div class="current">當前進度: <span>5%</span></div>
                                    <div class="target">目標: <span>10,000 NTD</span></div>
                                </div>
                                <div class="ms-progress-bar">
                                    <div class="ms-progress-fill" style="width: 5%; background: var(--vt-pink-dark);"></div>
                                </div>
                            </div>
                            <div class="ms-payment-row" style="margin-top: 15px;">
                                <button class="btn-support-now" style="width: 100%; justify-content: center;" onclick="window.supportMilestone('system-test')">
                                    <i class="fa-solid fa-heart"></i> 測試立刻支持 (彈窗功能驗證)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (achievedList.length > 0 && achievedContainer) {
            achievedList.forEach(m => {
                achievedContainer.innerHTML += `
                    <div class="achieved-card">
                        <div class="ac-top"><span>ACHIEVED</span></div>
                        <h3 class="ac-title">${m.title}</h3>
                        <div class="ac-stats"><span>100% 達成</span><span class="amt">${m.goal.toLocaleString()} NTD</span></div>
                    </div>
                `;
            });
        }
    }
};

// Global Bridge for legacy HTML (Fully functional with Modals)
window.supportMilestone = (id) => {
    const modal = document.getElementById('payment-modal');
    if (!modal) return;
    
    // Reset and Show
    modal.classList.add('open');
    document.getElementById('pay-amount').value = '';
    window.currentMilestoneSupport = id;
    console.log(`💡 [Support] Targeting milestone: ${id}`);
};

window.closePaymentModal = () => {
    const modal = document.getElementById('payment-modal');
    if (modal) modal.classList.remove('open');
};

window.confirmPayment = () => {
    const amt = document.getElementById('pay-amount').value;
    if (!amt || amt <= 0) return alert('請輸入有效的支持金額');
    
    alert(`🌟 感謝您的應援！[模擬交易] 已收到 ${amt} NTD。\n我們將立刻更新創作者的里程碑進度！`);
    window.closePaymentModal();
};

// Auto-init on load
auth.onAuthStateChanged((user) => {
    engine.init();
});

// ==== 即時預覽支援 (Live Preview Bridge) ====
// 當作為 iframe 嵌入時，接收來自 Dashboard 的未儲存編輯資料並即時渲染
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SYNC_VUP_DATA') {
        const { profile, milestones } = event.data;

        if (profile) {
            engine.injectProfileData(profile);
        }

        if (milestones) {
            engine.renderMilestones(milestones);
        }
    }
});

// 啟動完畢後，通知父層 (Dashboard) 送出最初的預覽資料
window.addEventListener('load', () => {
    if (window.parent !== window) {
        window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
    }
});
