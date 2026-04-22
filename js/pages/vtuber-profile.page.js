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
      // For each milestone, generate a card
      const esc = s => s ? String(s).replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])) : '';

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
                <div class="ms-lock-overlay"><i class="fa-solid fa-lock"></i><span>贊助此里程碑即可解鎖</span></div>
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
  }
};

// Expose controller to window to avoid duplicate init and for debugging
window.VtuberProfilePage = VtuberProfilePage;

// Initialize the page
VtuberProfilePage.init();
