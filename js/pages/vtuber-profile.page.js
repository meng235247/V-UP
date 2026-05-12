import PostsService from '../services/posts.service.js';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase-config.js';

const MEDIA_ICON_CLASS = {
  image: 'fa-regular fa-image',
  video: 'fa-solid fa-video',
  audio: 'fa-solid fa-headphones',
  file: 'fa-solid fa-paperclip',
  text: 'fa-regular fa-file-lines'
};

const postModalCache = new Map();
const userAvatarCache = new Map(); // [Step 3] 快取使用者頭像，避免重複讀取

function esc(s) {
  return s ? String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])) : '';
}

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
}

function timeAgo(ts) {
  const ms = toMillis(ts);
  if (!ms) return '剛剛';
  const diff = Date.now() - ms;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return '剛剛';
  if (diff < hour) return `${Math.floor(diff / minute)} 分鐘前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小時前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  return new Date(ms).toLocaleDateString('zh-TW');
}

function getPostMediaType(post) {
  if (post.primaryMediaType) return post.primaryMediaType;
  const first = Array.isArray(post.attachments) ? post.attachments.find(a => a && a.type) : null;
  return first ? first.type : 'text';
}

function getPostPrimaryMedia(post) {
  const mediaType = getPostMediaType(post);
  const attachments = Array.isArray(post.attachments) ? post.attachments : [];
  const byType = attachments.find(a => a && a.type === mediaType) || attachments[0] || null;
  if (!byType) return { mediaType: 'text', imageUrl: null, mediaUrl: null };
  if (mediaType === 'image') return { mediaType, imageUrl: byType.url || null, mediaUrl: null };
  if (mediaType === 'video' || mediaType === 'audio') return { mediaType, imageUrl: null, mediaUrl: byType.url || null };
  return { mediaType: 'file', imageUrl: null, mediaUrl: null };
}

function buildPostTitle(post) {
  if (post.title) return post.title;
  if (post.content) return String(post.content).trim().split('\n').find(Boolean)?.slice(0, 64) || '未命名貼文';
  return '未命名貼文';
}

// VTuber profile page controller
const VtuberProfilePage = {
  _currentVtuber: null,
  _unsubMilestones: null,
  _unsubRankings: [],
  _viewerUnlockedMilestones: [],
  init: async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const vtuberHandle = urlParams.get('id');
    console.log('[VtuberProfilePage] init started with handle=', vtuberHandle);

    // [修正] 監聽 Auth 狀態，確保登入後能從 Firestore 讀取已解鎖清單
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('[VtuberProfilePage] Auth settled: user=', user.uid);
        try {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            VtuberProfilePage._viewerUnlockedMilestones = data.unlockedMilestones || [];
            console.log('[VtuberProfilePage] Loaded unlocked milestones:', VtuberProfilePage._viewerUnlockedMilestones);
            
            // 重新渲染當前頁面上的所有里程碑貼文區塊，以反映解鎖狀態
            const cards = document.querySelectorAll('.ms-card');
            cards.forEach(card => {
              const mid = card.dataset.milestoneId;
              // 重新讀取並渲染貼文
              PostsService.getPublishedPostsByMilestone(mid, { limit: 12, tryIncludeSupporters: true })
                .then(posts => VtuberProfilePage.renderMilestonePosts(card, mid, posts))
                .catch(err => console.warn('[VtuberProfilePage] Auth-refresh posts error:', mid, err));
            });
          }
        } catch (e) {
          console.warn('[VtuberProfilePage] failed to fetch viewer doc', e);
        }
      } else {
        VtuberProfilePage._viewerUnlockedMilestones = [];
      }
    });

    if (vtuberHandle === 'demo') {
      // Use seed data for demo mode
      VtuberProfilePage._currentVtuber = seedData.vtuber;
      VtuberProfilePage.renderVtuber(seedData.vtuber);
      VtuberProfilePage.renderMilestones(seedData.milestones);
      document.body.insertAdjacentHTML('afterbegin', '<div class="demo-banner">🎭 Demo 展示模式</div>');
    } else {
      try {
        // 使用 vtuberService 從 vtubers 集合讀取最新的設定資料
        const vtuber = await vtuberService.getProfileByHandle(vtuberHandle);
        console.log('[VtuberProfilePage] loaded vtuber profile:', vtuber);
        if (!vtuber) throw new Error('VTuber not found');
        VtuberProfilePage._currentVtuber = vtuber;
        VtuberProfilePage.renderVtuber(vtuber);

        const vtuberId = vtuber.uid || vtuberHandle;
        console.log('[VtuberProfilePage] 開始監聽里程碑即時變更 vtuberId=', vtuberId);

        if (VtuberProfilePage._unsubMilestones) VtuberProfilePage._unsubMilestones();
        VtuberProfilePage._unsubMilestones = MilestonesService.listenPublicMilestones(
          vtuberId,
          (milestones) => {
            console.log('[VtuberProfilePage] 里程碑即時更新 count:', milestones.length);
            VtuberProfilePage.renderMilestones(milestones);
          }
        );
        window.addEventListener('beforeunload', () => {
          if (VtuberProfilePage._unsubMilestones) VtuberProfilePage._unsubMilestones();
          VtuberProfilePage._unsubRankings.forEach(fn => fn());
        });
      } catch (error) {
        console.error('Error loading VTuber profile:', error);
        alert('無法載入 VTuber 資料：' + (error.message || error));
      }
    }
  },

  renderVtuber: (vtuber) => {
    // helper: color mixing utilities
    function hexToRgb(hex) {
      if (!hex) return null;
      let h = hex.replace('#', '').trim();
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      const num = parseInt(h, 16);
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }

    function rgbToHex(r, g, b) {
      const toHex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    function mixHex(hex1, hex2, weight) {
      const c1 = hexToRgb(hex1) || { r: 0, g: 0, b: 0 };
      const c2 = hexToRgb(hex2) || { r: 255, g: 255, b: 255 };
      const w = Math.max(0, Math.min(1, weight));
      const r = c1.r * (1 - w) + c2.r * w;
      const g = c1.g * (1 - w) + c2.g * w;
      const b = c1.b * (1 - w) + c2.b * w;
      return rgbToHex(r, g, b);
    }

    // Safe setters with fallbacks to class selectors used in the existing HTML
    try {
      const displayName = vtuber.displayName || vtuber.name || '';
      const titleEl = document.getElementById('vtuber-name') || document.querySelector('.vt-hero-title');
      if (titleEl) titleEl.textContent = displayName;

      // Update brand and document title
      const brandEl = document.querySelector('.vt-brand');
      if (brandEl) brandEl.textContent = displayName;
      if (displayName) document.title = `${displayName} | V-UP!`;

      const subtitleEl = document.getElementById('vtuber-subtitle') || document.querySelector('.vt-hero-subtitle');
      if (subtitleEl) subtitleEl.textContent = vtuber.catchphrase || vtuber.subtitle || '';

      const bioEl = document.getElementById('vtuber-bio') || document.querySelector('.vt-hero-bio');
      if (bioEl) bioEl.textContent = vtuber.bio || '';

      const avatarEl = document.getElementById('vtuber-avatar') || document.querySelector('.vt-hero-image img');
      if (avatarEl && vtuber.avatarUrl) avatarEl.src = vtuber.avatarUrl;

      const bannerEl = document.getElementById('vtuber-banner') || document.querySelector('.vt-hero-image img');
      if (bannerEl && vtuber.bannerUrl) bannerEl.src = vtuber.bannerUrl;

      // Apply theme colors (map saved colorPrimary/colorSecondary into CSS variables)
      const root = document.documentElement;
      if (vtuber.colorPrimary) {
        root.style.setProperty('--vt-pink', vtuber.colorPrimary);
        root.style.setProperty('--vt-pink-dark', mixHex(vtuber.colorPrimary, '#000000', 0.15));
        root.style.setProperty('--vt-pink-light', mixHex(vtuber.colorPrimary, '#ffffff', 0.88));
        // set derived rgba variables for gradients and shadows
        const pRgb = hexToRgb(vtuber.colorPrimary);
        if (pRgb) {
          root.style.setProperty('--vt-gradient-right', `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.25)`);
          root.style.setProperty('--vt-floating-badge-shadow', `rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.15)`);
          root.style.setProperty('--vt-hero-shadow', `0 20px 40px rgba(${pRgb.r}, ${pRgb.g}, ${pRgb.b}, 0.18)`);
        }
      }
      if (vtuber.colorSecondary) {
        root.style.setProperty('--vt-blue', vtuber.colorSecondary);
        root.style.setProperty('--vt-blue-light', mixHex(vtuber.colorSecondary, '#ffffff', 0.9));
        // set derived rgba variables for gradients and blue shadows
        const sRgb = hexToRgb(vtuber.colorSecondary);
        if (sRgb) {
          root.style.setProperty('--vt-gradient-left', `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, 0.25)`);
          root.style.setProperty('--vt-floating-badge-shadow-blue', `rgba(${sRgb.r}, ${sRgb.g}, ${sRgb.b}, 0.15)`);
        }
      }

      // [Step 2] 渲染社群連結
      const socials = [
        { id: 'social-youtube', url: vtuber.youtubeUrl },
        { id: 'social-twitter', url: vtuber.twitterUrl || vtuber.xUrl },
        { id: 'social-instagram', url: vtuber.instagramUrl },
        { id: 'social-facebook', url: vtuber.facebookUrl },
        { id: 'social-others', url: vtuber.othersUrl }
      ];
      socials.forEach(s => {
        const el = document.getElementById(s.id);
        if (el) {
          if (s.url) {
            el.href = s.url;
            el.style.display = 'flex';
          } else {
            el.style.display = 'none';
          }
        }
      });

      // [修正] 更新全站 Footer 品牌名稱和版權聲明
      const footerBrand = document.getElementById('footer-brand');
      if (footerBrand) footerBrand.textContent = vtuber.displayName || vtuber.name || 'SAKURA NOVA';
      const footerCopyright = document.getElementById('footer-copyright');
      if (footerCopyright) {
        const name = vtuber.displayName || vtuber.name || 'SAKURA NOVA';
        const year = new Date().getFullYear();
        footerCopyright.textContent = `© ${year} ${name} 數位展演版權所有`;
      }
    } catch (err) {
      console.warn('[VtuberProfilePage] renderVtuber partial failure:', err);
    }
  },

  renderMilestones: (milestones) => {
    const section = document.querySelector('#milestones');
    if (!section) return console.warn('[VtuberProfilePage] no #milestones section found to render into');

    // remove previously generated dynamic cards
    Array.from(section.querySelectorAll('.ms-card[data-generated]')).forEach(n => n.remove());

    // hide existing static cards while rendering dynamic ones
    const staticCards = Array.from(section.querySelectorAll('.ms-card:not([data-generated])'));
    staticCards.forEach(c => c.style.display = 'none');

    // no milestones -> show placeholder
    if (!milestones || milestones.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'ms-card placeholder';
      placeholder.dataset.generated = 'true';
      placeholder.innerHTML = `
        <div class="ms-main" style="display:flex; align-items:center; justify-content:center; padding:60px;">
          <div style="text-align:center; font-weight:900; font-size:1.6rem; color:var(--text-muted);">夢想緒力中……!</div>
        </div>
      `;
      section.appendChild(placeholder);
    } else {
      // [Task 3 Step 1] 精確排序：進行中優先(由新到舊)，已達成次之(由新到舊)
      const sorted = [...milestones].sort((a, b) => {
        const isAchA = (a.status === 'achieved' || a.status === 'completed');
        const isAchB = (b.status === 'achieved' || b.status === 'completed');
        
        // 1. 狀態優先級：進行中(0) < 已達成(1)
        if (isAchA !== isAchB) return (isAchA ? 1 : -1);

        // 2. 內部排序
        if (!isAchA) {
          // 進行中：依 publishedAt 降序 (fallback createdAt)
          const tA = toMillis(a.publishedAt || a.createdAt);
          const tB = toMillis(b.publishedAt || b.createdAt);
          return tB - tA;
        } else {
          // 已達成：依 achievedAt 降序 (fallback updatedAt)
          const tA = toMillis(a.achievedAt || a.updatedAt);
          const tB = toMillis(b.achievedAt || b.updatedAt);
          return tB - tA;
        }
      });

      sorted.forEach(m => {
        const card = document.createElement('div');
        card.className = 'ms-card';
        card.dataset.generated = 'true';
        card.dataset.milestoneId = m.id;

        const current = Number(m.currentAmount || m.current || 0);
        const goal = Number(m.goal || m.targetAmount || m.target || 0);
        const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
        const badge = m.badgeDataUrl || m.badgeImageUrl || (m.badgeUrl || 'https://picsum.photos/seed/badge/80/80');
        const statusLabel = (m.status === 'published' || m.status === 'active') ? '進行中!' :
          (m.status === 'achieved' ? '✨ 已達成' : (m.status || '公開'));
        const isAchieved = (m.status === 'achieved' || m.status === 'completed');

        let collabHtml = '';
        if (m.isCollab && m.collaboratorsMeta && m.collaboratorsMeta.length > 0) {
          const vt = VtuberProfilePage._currentVtuber || {};
          const ownerName = vt.displayName || vt.name || '本頻道';
          // [Step 3 修正] 使用 bannerUrl 作為展示頭貼
          const ownerAvatar = vt.bannerUrl || vt.avatarUrl || 'https://i.pravatar.cc/100';
          const avatarsHtml = m.collaboratorsMeta.map(c => `<img src="${esc(c.bannerUrl || c.avatarUrl || 'https://i.pravatar.cc/100?u='+c.uid)}" alt="${esc(c.name)}">`).join('');
          const namesHtml = m.collaboratorsMeta.map(c => `<span class="vt-name-ume" style="font-weight:bold;">${esc(c.name)}</span>`).join('、');
          
          collabHtml = `
            <div class="ms-joint-collab" style="flex-basis: 100%; margin-bottom: 8px;">
                <div class="collab-avatars">
                    <img src="${esc(ownerAvatar)}" alt="${esc(ownerName)}">
                    ${avatarsHtml}
                </div>
                <div class="collab-text">
                    <span class="vt-name-sakura" style="font-weight:bold;">${esc(ownerName)}</span> 和 ${namesHtml} 的聯合企劃
                </div>
            </div>
          `;
        }

        card.innerHTML = `
          <div class="ms-main">
            <div class="ms-floating-badge">
              <img src="${esc(badge)}" alt="徽章" class="ms-badge-img">
            </div>
            <div class="ms-top-header" style="flex-wrap: wrap;">
              ${collabHtml}
              <span class="ms-status-badge">${esc(statusLabel)}</span>
              <h2 class="ms-title">${esc(m.title || '（無標題）')}</h2>
            </div>
            <p class="ms-desc">${esc(m.desc || m.description || '')}</p>

            <div class="ms-support-box">
              <div class="ms-progress-wrap">
                <div class="ms-progress-labels">
                  <div class="current">當前進度: <span data-bind="progress-pct">${pct}%</span></div>
                  <div class="target">目標: <span data-bind="progress-target">${goal ? Number(goal).toLocaleString() + ' NTD' : '—'}</span></div>
                </div>
                <div class="ms-progress-bar">
                  <div class="ms-progress-fill ms-progress-animated" data-bind="progress-bar" style="width: ${pct}%;"></div>
                </div>
              </div>

              <div class="ms-payment-row">
                <div class="ms-input-wrap">
                  <span class="ms-input-icon">NTD</span>
                  <input type="number" class="ms-input" placeholder="輸入金額" value="">
                </div>
                <button class="btn-support-now" onclick="openPaymentModal('${esc(m.title || '')}', '${m.id}', this)"><i class="fa-solid fa-heart"></i> 立刻支持</button>
              </div>
            </div>

            <div class="ms-exclusive" data-milestone-id="${m.id}">
              <div class="ms-exc-title"><i class="fa-solid fa-bullhorn text-pink"></i> 贊助者限定消息</div>
              <div class="ms-exclusive-content" data-milestone-id="${m.id}">
                <div class="exc-post">
                  <div class="exc-post-info">
                    <div class="exc-tag"><i class="fa-regular fa-file-lines"></i></div>
                    <div class="exc-text">
                      <h4>載入貼文中...</h4>
                      <p>請稍候</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="ms-ranking" data-milestone-id="${m.id}">
            <div class="ranking-header"><i class="fa-solid fa-medal"></i><h3>本階段貢獻榜</h3></div>
            <div class="rank-list" id="rank-list-${m.id}" data-milestone-id="${m.id}">
              <div class="rank-item"><div class="r-avatar" style="background:#E2E8F0;"></div><div class="r-info"><span class="r-name">—</span><span class="r-amt">—</span></div></div>
            </div>
          </div>
        `;

        // 改用 appendChild 確保排序與 UI 呈現一致
        section.appendChild(card);

        // 若里程碑已達成，立即標示並檢查晃祝中狀態
        if (isAchieved) {
          if (typeof window.markCardAsAchieved === 'function') window.markCardAsAchieved(m.id);
          // Check if returning user hasn't seen celebration yet
          let seen = false;
          try { seen = !!localStorage.getItem('celebSeen_' + m.id); } catch(e) {}
          if (!seen && typeof window.triggerCelebration === 'function') {
            setTimeout(() => window.triggerCelebration(m.id, m.title || '', false), 900);
          }
        }

        // A-Task 2b: 即時監聽排行榜（依 transactions 彙整粉絲累積金額）
        const unsubRank = MilestonesService.listenRankings(m.id, 10, async (rankList, myAmount) => {
          const rl = card.querySelector(`#rank-list-${m.id}`);
          if (!rl) return;
          
          // [Step 3] 異步取得排行榜中所有用戶的真實頭像
            const renderList = rankList.map((r, i) => {
              const displayAvatar = r.avatarUrl || `https://i.pravatar.cc/100?u=${r.fanUid}`;
              return `
                <div class="rank-item">
                  <span class="r-rank" style="min-width:1.5rem;font-weight:bold;color:var(--vt-pink,#e91e8c)">${i + 1}</span>
                  <img src="${esc(displayAvatar)}" class="r-avatar" alt="${esc(r.displayName)}">
                  <div class="r-info">
                    <span class="r-name">${esc(r.displayName)}</span>
                    <span class="r-amt">${Number(r.totalAmount).toLocaleString()} NTD</span>
                  </div>
                </div>
              `;
            });

            let html = renderList.length ? renderList.join('') : '<div class="rank-item"><div class="r-info"><span class="r-name">尚無贊助紀錄</span></div></div>';

          // A-Task 2b: 顯示該用戶在此里程碑的累計金額
          const user = auth.currentUser;
          if (user) {
            let myAvatar = userAvatarCache.get(user.uid);
            if (!myAvatar || myAvatar === false) myAvatar = user.photoURL || `https://i.pravatar.cc/100?u=${user.uid}`;
            html += `
              <div class="rank-item you" style="border-top: 1px solid var(--border); padding-top: 0.5rem; margin-top: 0.5rem;">
                <img src="${esc(myAvatar)}" class="r-avatar" alt="您">
                <div class="r-info">
                  <span class="r-name">您目前的累計贊助</span>
                  <span class="r-amt" style="color:var(--vt-blue,#2196f3);font-weight:bold;">${Number(myAmount || 0).toLocaleString()} NTD</span>
                </div>
              </div>
            `;
          }
          
          rl.innerHTML = html;
        });
        VtuberProfilePage._unsubRankings.push(unsubRank);

        (async () => {
          try {
            const posts = await PostsService.getPublishedPostsByMilestone(m.id, {
              limit: 12,
              tryIncludeSupporters: true
            });
            VtuberProfilePage.renderMilestonePosts(card, m.id, posts);
          } catch (e) {
            console.warn('[VtuberProfilePage] load milestone posts failed:', m.id, e);
            VtuberProfilePage.renderMilestonePosts(card, m.id, []);
          }
        })();
      });
    }

    // Achieved section logic: show placeholder if no achieved items
    const achievedContainer = document.getElementById('milestones-achieved');
    const achievedTimeline = document.querySelector('.achieved-timeline');
    const viewLogsBtn = document.querySelector('.btn-view-logs');
    if (achievedContainer) {
      const hasAchieved = milestones && milestones.some(m => m.status === 'achieved' || m.status === 'completed' || m.isAchieved);
      if (!hasAchieved) {
        achievedContainer.innerHTML = `<div style="padding:40px; text-align:center; font-weight:900; color:var(--text-muted);">期待夢想成真的那天</div>`;
        if (achievedTimeline) {
          const items = achievedTimeline.querySelector('.timeline-items'); if (items) items.style.display = 'none';
        }
        if (viewLogsBtn) viewLogsBtn.style.display = 'none';
      } else {
        if (achievedTimeline) { const items = achievedTimeline.querySelector('.timeline-items'); if (items) items.style.display = ''; }
        if (viewLogsBtn) viewLogsBtn.style.display = '';
      }
    }
  },

  renderMilestonePosts: (card, milestoneId, posts) => {
    if (!card) return;
    const container = card.querySelector(`.ms-exclusive-content[data-milestone-id="${milestoneId}"]`);
    if (!container) return;

    

    const publishedPosts = Array.isArray(posts) ? posts.filter(p => p && p.status === 'published') : [];
    if (publishedPosts.length === 0) {
      container.innerHTML = `
        <div class="exc-post">
          <div class="exc-post-info">
            <div class="exc-tag"><i class="fa-regular fa-file-lines"></i></div>
            <div class="exc-text">
              <h4>尚未發布任何貼文</h4>
              <p>發布後會顯示在這裡</p>
            </div>
          </div>
          <button class="btn-read-more" type="button" disabled>待發布</button>
        </div>
      `;
      return;
    }

    const renderRow = (post) => {
      const title = buildPostTitle(post);
      const time = timeAgo(post.publishedAt || post.updatedAt || post.createdAt);
      const mediaType = getPostMediaType(post);
      const iconClass = MEDIA_ICON_CLASS[mediaType] || MEDIA_ICON_CLASS.text;
      const cacheKey = `${milestoneId}:${post.id}`;
      const media = getPostPrimaryMedia(post);
      const vt = VtuberProfilePage._currentVtuber || {};
      postModalCache.set(cacheKey, {
        title,
        time,
        iconType: mediaType,
        body: post.content || '',
        imageUrl: media.imageUrl,
        mediaType: media.mediaType === 'text' || media.mediaType === 'file' ? null : media.mediaType,
        mediaUrl: media.mediaUrl,
        authorName: vt.displayName || vt.name || 'SAKURA NOVA',
        authorAvatar: vt.bannerUrl || vt.avatarUrl || 'image/miku_test.png'
      });

      const isSupporterOnly = post.visibility === 'supporters';
      const viewerUid = auth && auth.currentUser ? auth.currentUser.uid : null;
      const vtuberUid = VtuberProfilePage._currentVtuber && VtuberProfilePage._currentVtuber.uid
        ? VtuberProfilePage._currentVtuber.uid
        : null;
      const allowList = Array.isArray(post.allowedUids) ? post.allowedUids : [];
      const unlockedMilestones = VtuberProfilePage._viewerUnlockedMilestones || [];
      const canReadSupporterPost = !!viewerUid && (
        (vtuberUid && viewerUid === vtuberUid)
        || allowList.includes(viewerUid)
        || post.viewerUnlocked === true
        || unlockedMilestones.includes(milestoneId)
      );
      const shouldLock = isSupporterOnly && !canReadSupporterPost;
      const visibilityLabel = isSupporterOnly ? '限定' : '公開';
      const visibilityClass = isSupporterOnly ? 'is-supporters' : 'is-public';

      return `
        <div class="exc-post ${shouldLock ? 'locked' : ''}">
          ${shouldLock ? '<div class="ms-lock-overlay"><i class="fa-solid fa-lock"></i><span>贊助此里程碑即可解鎖</span></div>' : ''}
          <div class="exc-post-info">
            <div class="exc-tag"><i class="${iconClass}"></i></div>
            <div class="exc-text">
              <h4>${esc(title)} <span class="exc-visibility-badge ${visibilityClass}">${visibilityLabel}</span></h4>
              <p>${esc(time)}</p>
            </div>
          </div>
          ${shouldLock ? '<button class="btn-read-more" type="button" disabled>贊助解鎖 <i class="fa-solid fa-lock"></i></button>' : `<button class="btn-read-more" type="button" data-open-post-key="${esc(cacheKey)}">展開閱讀 <i class="fa-solid fa-chevron-down"></i></button>`}
        </div>
      `;
    };

    const visible = publishedPosts.slice(0, 2).map(renderRow).join('');
    const hidden = publishedPosts.slice(2).map(renderRow).join('');
    const hasMore = publishedPosts.length > 2;
    const moreId = `exc-more-${String(milestoneId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    container.innerHTML = `
      ${visible}
      ${hasMore ? `<div class="exc-more-posts" id="${moreId}" style="display:none;">${hidden}</div>` : ''}
      ${hasMore ? `<button class="btn-view-all" onclick="toggleExcMore('${moreId}', this)">查看更多 <i class="fa-solid fa-chevron-down"></i></button>` : ''}
    `;

    container.querySelectorAll('[data-open-post-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cacheKey = btn.getAttribute('data-open-post-key');
        const payload = postModalCache.get(cacheKey);
        if (!payload || typeof window.openPostModal !== 'function') return;
        window.openPostModal(
          payload.title,
          payload.time,
          payload.iconType,
          payload.body,
          payload.imageUrl,
          payload.mediaType,
          payload.mediaUrl,
          payload.authorName,
          payload.authorAvatar
        );
      });
    });
  },

  /**
   * [Step 3] 渲染回顧彈窗中的排行榜
   */
  renderReviewRankings: async (milestoneId) => {
    const rl = document.getElementById('rmc-rank-list');
    if (!rl || !milestoneId) return;

    try {
      // 取得 Top 10 排行 (靜態一次性讀取)
      const rankingsRef = collection(db, 'transactions');
      const q = query(
        rankingsRef,
        where('milestoneId', '==', milestoneId),
        where('status', '==', 'success')
      );
      const snap = await getDocs(q);
      
      const map = {};
      snap.docs.forEach(d => {
        const tx = d.data();
        if (!tx.fanUid) return;
        if (!map[tx.fanUid]) {
          map[tx.fanUid] = { 
            fanUid: tx.fanUid, 
            displayName: tx.fanName || '匿名粉絲', 
            avatarUrl: tx.fanAvatarUrl || null,
            totalAmount: 0 
          };
        }
        map[tx.fanUid].totalAmount += (Number(tx.amount) || 0);
      });

      const sorted = Object.values(map)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10);

      if (!sorted.length) {
        rl.innerHTML = '<div class="rank-item"><div class="r-info"><span class="r-name">尚無贊助紀錄</span></div></div>';
        return;
      }

      const medalClass = ['gold', 'silver', 'bronze'];
      const medalEmoji = ['🥇', '🥈', '🥉'];

      const renderList = sorted.map((r, i) => {
        const displayAvatar = r.avatarUrl || `https://i.pravatar.cc/100?u=${r.fanUid}`;
        return `
          <div class="rmc-rank-item">
            <span class="rmc-rank-num ${medalClass[i] || ''}">${i < 3 ? medalEmoji[i] : (i + 1)}</span>
            <img src="${esc(displayAvatar)}" alt="${esc(r.displayName)}" class="rmc-rank-avatar">
            <span class="rmc-rank-name">${esc(r.displayName)}</span>
            <span class="rmc-rank-amt">${Number(r.totalAmount).toLocaleString()} NTD</span>
          </div>
        `;
      });

      rl.innerHTML = renderList.join('');
    } catch (err) {
      console.error('[VtuberProfilePage] renderReviewRankings error:', err);
      rl.innerHTML = '<div class="rank-item"><div class="r-info"><span class="r-name">載入失敗</span></div></div>';
    }
  }
};

window.VtuberProfilePage = VtuberProfilePage;

// Initialize the page
VtuberProfilePage.init();
