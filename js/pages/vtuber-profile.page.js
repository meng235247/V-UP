import PostsService from '../services/posts.service.js';
import { auth } from '../firebase-config.js';

const MEDIA_ICON_CLASS = {
  image: 'fa-regular fa-image',
  video: 'fa-solid fa-video',
  audio: 'fa-solid fa-headphones',
  file: 'fa-solid fa-paperclip',
  text: 'fa-regular fa-file-lines'
};

const postModalCache = new Map();

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
  init: async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const vtuberHandle = urlParams.get('id');

    if (vtuberHandle === 'demo') {
      // Use seed data for demo mode
      VtuberProfilePage.renderVtuber(seedData.vtuber);
      VtuberProfilePage.renderMilestones(seedData.milestones);
      document.body.insertAdjacentHTML('afterbegin', '<div class="demo-banner">🎭 Demo 展示模式</div>');
    } else {
      try {
        // 使用 vtuberService 從 vtuber_profiles 集合讀取最新的設定資料
        // (這是dashboard更新的數據所在位置)
        const vtuber = await vtuberService.getProfileByHandle(vtuberHandle);
        if (!vtuber) throw new Error('VTuber not found');
        VtuberProfilePage.renderVtuber(vtuber);

        const milestones = await MilestonesService.getPublicMilestones(vtuber.uid || vtuberHandle);
        VtuberProfilePage.renderMilestones(milestones);
      } catch (error) {
        console.error('Error loading VTuber profile:', error);
        alert('無法載入 VTuber 資料');
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
      section.insertBefore(placeholder, section.firstChild);
    } else {
      milestones.forEach(m => {
        const card = document.createElement('div');
        card.className = 'ms-card';
        card.dataset.generated = 'true';
        card.dataset.milestoneId = m.id;

        const current = Number(m.currentAmount || m.current || 0);
        const goal = Number(m.goal || m.targetAmount || m.target || 0);
        const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
        const badge = m.badgeDataUrl || m.badgeImageUrl || (m.badgeUrl || 'https://picsum.photos/seed/badge/80/80');
        const statusLabel = (m.status === 'published' || m.status === 'active') ? '進行中!' : (m.status === 'achieved' ? '已達成' : (m.status || '公開'));

        card.innerHTML = `
          <div class="ms-main">
            <div class="ms-floating-badge">
              <img src="${esc(badge)}" alt="徽章" class="ms-badge-img">
            </div>
            <div class="ms-top-header">
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

        // insert at top
        section.insertBefore(card, section.firstChild);

        // async populate rankings
        (async () => {
          try {
            const rankList = await MilestonesService.getRankings(m.id, 5);
            const rl = card.querySelector(`#rank-list-${m.id}`);
            if (rl) {
              rl.innerHTML = rankList.map(r => `
                <div class="rank-item">
                  <img src="${esc(r.avatarUrl || 'https://i.pravatar.cc/100?u=' + (r.id || Math.random()))}" class="r-avatar" alt="User">
                  <div class="r-info"><span class="r-name">${esc(r.displayName || r.name || '匿名')}</span><span class="r-amt">${Number(r.totalAmount || 0).toLocaleString()} NTD</span></div>
                </div>
              `).join('');
            }
          } catch (e) { /* silently ignore rankings errors */ }
        })();

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
        ${lockHtml}
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
      postModalCache.set(cacheKey, {
        title,
        time,
        iconType: mediaType,
        body: post.content || '',
        imageUrl: media.imageUrl,
        mediaType: media.mediaType === 'text' || media.mediaType === 'file' ? null : media.mediaType,
        mediaUrl: media.mediaUrl
      });

      const isSupporterOnly = post.visibility === 'supporters';
      const viewerUid = auth && auth.currentUser ? auth.currentUser.uid : null;
      const shouldLock = isSupporterOnly && !viewerUid;

      return `
        <div class="exc-post ${shouldLock ? 'locked' : ''}">
          ${shouldLock ? '<div class="ms-lock-overlay"><i class="fa-solid fa-lock"></i><span>贊助此里程碑即可解鎖</span></div>' : ''}
          <div class="exc-post-info">
            <div class="exc-tag"><i class="${iconClass}"></i></div>
            <div class="exc-text">
              <h4>${esc(title)}</h4>
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
          payload.mediaUrl
        );
      });
    });
  }
};

// Expose controller to window to avoid duplicate init and for debugging
window.VtuberProfilePage = VtuberProfilePage;

// Initialize the page
VtuberProfilePage.init();
