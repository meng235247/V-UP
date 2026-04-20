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

        const milestones = await MilestonesService.getMilestones(vtuber.uid || vtuberHandle);
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
    // Target the active milestones section without wiping the entire page
    const section = document.querySelector('#milestones');
    if (!section) {
      console.warn('[VtuberProfilePage] no #milestones section found to render into');
      return;
    }

    const activeCards = Array.from(section.querySelectorAll('.ms-card')).filter(c => !c.classList.contains('placeholder'));
    const existingPlaceholder = section.querySelector('.ms-card.placeholder');

    if (!milestones || milestones.length === 0) {
      // Hide existing active cards and show a single placeholder card
      activeCards.forEach(c => { c.style.display = 'none'; });
      if (!existingPlaceholder) {
        const placeholder = document.createElement('div');
        placeholder.className = 'ms-card placeholder';
        placeholder.innerHTML = `
          <div class="ms-main" style="display:flex; align-items:center; justify-content:center; padding:60px;">
            <div style="text-align:center; font-weight:900; font-size:1.6rem; color:var(--text-muted);">夢想緒力中……!</div>
          </div>
        `;
        section.insertBefore(placeholder, section.firstChild);
      } else {
        existingPlaceholder.style.display = '';
      }
    } else {
      // Remove placeholder if present and show active cards
      if (existingPlaceholder) existingPlaceholder.remove();
      activeCards.forEach(c => { c.style.display = ''; });
      // Note: existing static cards remain; dynamic mapping may be added later.
    }

    // Handle achieved section empty-state
    const achievedContainer = document.getElementById('milestones-achieved');
    const achievedTimeline = document.querySelector('.achieved-timeline');
    const viewLogsBtn = document.querySelector('.btn-view-logs');
    if (achievedContainer) {
      const hasAchieved = milestones && milestones.some(m => m.status === 'achieved' || m.status === 'completed' || m.isAchieved);
      if (!hasAchieved) {
        // Show a friendly placeholder and hide timeline items + "view logs" button
        achievedContainer.innerHTML = `<div style="padding:40px; text-align:center; font-weight:900; color:var(--text-muted);">期待夢想成真的那天</div>`;
        if (achievedTimeline) {
          const items = achievedTimeline.querySelector('.timeline-items');
          if (items) items.style.display = 'none';
        }
        if (viewLogsBtn) viewLogsBtn.style.display = 'none';
      } else {
        // Ensure timeline items and button are visible when there are achieved items
        if (achievedTimeline) {
          const items = achievedTimeline.querySelector('.timeline-items');
          if (items) items.style.display = '';
        }
        if (viewLogsBtn) viewLogsBtn.style.display = '';
      }
    }
  }
};

// Expose controller to window to avoid duplicate init and for debugging
window.VtuberProfilePage = VtuberProfilePage;

// Initialize the page
VtuberProfilePage.init();
