/**
 * fan-profile.page.js
 * Person B (feat/fan-profile-ui) — Firebase Firestore integration
 * 
 * 負責：
 *   1. 監聽 Firebase Auth，未登入跳轉 auth.html
 *   2. onSnapshot 即時更新 user document（名稱、頭像、徽章、稱號、支援的 VTuber）
 *   3. onSnapshot 即時更新 transactions（贊助紀錄）
 *   4. 將資料橋接到現有 fan_profile.html 的 DOM 元素
 */

import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, getDocs, collection, query, where,
  onSnapshot, orderBy, updateDoc
} from 'firebase/firestore';
import { storageService } from '../services/storage.service.js';
import { vtuberService } from '../services/vtuber.service.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const el = (id) => document.getElementById(id);
const vtuberNameCache = {};

const DEMO_FAN_UID = 'demo_fan_local';
const DEMO_KEYS = {
  profile: 'vup_demo_fan_profile',
  fanTransactions: 'vup_demo_fan_transactions',
  sharedTransactions: 'vup_demo_transactions'
};
const DEMO_VTUBER_PROFILE_URL = 'vtuber_profile.html?id=ryusei&mode=fan';
const DEMO_VTUBER_MAP = {
  ryusei: { handle: 'ryusei', displayName: '川雲爪日', avatarUrl: 'image/v_head_ryusei.jpg' },
  baifu: { handle: 'baifu', displayName: '拜風', avatarUrl: 'image/v_head_ryusei.jpg' }
};
const DEMO_MILESTONE_TITLES = {
  milestone_3d_stage: '川雲爪日',
  milestone_orig_song: '挑戰!全新原創曲製作',
  milestone_live: '線上演唱會準備'
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function isFanProfileDemoMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get('mode') === 'demo';
}

function fakeTs(ms) {
  const t = Number(ms || Date.now());
  return {
    toDate() {
      return new Date(t);
    }
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ensureDemoProfile() {
  const cached = readJSON(DEMO_KEYS.profile, null);
  if (cached) {
    if (cached.photoURL && cached.photoURL.includes('dicebear.com')) {
      cached.photoURL = 'image/ighead_b.jpg';
    }
    // Force update badges and supportedVtubers to ensure latest demo milestones and vtubers are used
    if (!cached.badges || cached.badges.length !== 3 || cached.badges[0].vtuberId !== 'ryusei' || cached.badges[1].vtuberId !== 'bifeng-vtype' || !cached.supportedVtubers || cached.supportedVtubers.join(',') !== 'ryusei,bifeng-vtype,shikuu') {
      cached.badges = [
        { id: 'demo_badge_1', milestoneId: 'ypdoNbTiq4xHUdaWHM8e', vtuberId: 'ryusei', contribution: 1500, awardedAt: '2026-05-01', selected: true },
        { id: 'demo_badge_2', milestoneId: '7ZaGgm6qzxxk44Ea55Hi', vtuberId: 'bifeng-vtype', contribution: 900, awardedAt: '2026-04-18', selected: true },
        { id: 'demo_badge_3', milestoneId: 'jSWAPeWGQaGdlbOJ1c2S', vtuberId: 'shikuu', contribution: 300, awardedAt: '2026-04-10', selected: true }
      ];
      cached.supportedVtubers = ['ryusei', 'bifeng-vtype', 'shikuu'];
    }
    writeJSON(DEMO_KEYS.profile, cached);
    return cached;
  }

  const seed = {
    uid: DEMO_FAN_UID,
    displayName: 'Demo Supporter',
    photoURL: 'image/ighead_b.jpg',
    email: 'demo.fan@local',
    tagline: 'Demo 模式粉絲檔案',
    themeColorPrimary: '#ec4899',
    themeColorSecondary: '#0ea5e9',
    supportedVtubers: ['ryusei', 'bifeng-vtype', 'shikuu'],
    badges: [
      {
        id: 'demo_badge_1',
        milestoneId: 'ypdoNbTiq4xHUdaWHM8e',
        vtuberId: 'ryusei',
        contribution: 1500,
        awardedAt: '2026-05-01',
        selected: true
      },
      {
        id: 'demo_badge_2',
        milestoneId: '7ZaGgm6qzxxk44Ea55Hi',
        vtuberId: 'bifeng-vtype',
        contribution: 900,
        awardedAt: '2026-04-18',
        selected: true
      },
      {
        id: 'demo_badge_3',
        milestoneId: 'jSWAPeWGQaGdlbOJ1c2S',
        vtuberId: 'shikuu',
        contribution: 300,
        awardedAt: '2026-04-10',
        selected: true
      }
    ],
    honorTitles: [
      { id: 'demo_title_1', iconClass: 'fa-solid fa-star text-pink', title: 'Demo 粉絲', origin: 'Demo 模式', selected: true },
      { id: 'demo_title_2', iconClass: 'fa-solid fa-heart text-blue', title: '熱情應援者', origin: '累積贊助達標', selected: true }
    ],
    longestSupportDays: 120,
    milestoneRate: 68
  };

  writeJSON(DEMO_KEYS.profile, seed);
  return seed;
}

function ensureDemoTransactionsSeed() {
  const cached = readJSON(DEMO_KEYS.fanTransactions, null);
  if (Array.isArray(cached) && cached.length === 3 && cached[0].vtuberId === 'ryusei' && cached[1].vtuberId === 'bifeng-vtype') {
    return cached;
  }

  const now = Date.now();
  const seed = [
    {
      id: 'demo_tx_seed_1',
      vtuberId: 'ryusei',
      milestoneId: 'ypdoNbTiq4xHUdaWHM8e',
      milestoneTitle: '帝國起源',
      amount: 1500,
      status: 'success',
      createdAtMs: now - 1000 * 60 * 60 * 24 * 3
    },
    {
      id: 'demo_tx_seed_2',
      vtuberId: 'bifeng-vtype',
      milestoneId: '7ZaGgm6qzxxk44Ea55Hi',
      milestoneTitle: '生命綻放',
      amount: 900,
      status: 'success',
      createdAtMs: now - 1000 * 60 * 60 * 24 * 8
    },
    {
      id: 'demo_tx_seed_3',
      vtuberId: 'shikuu',
      milestoneId: 'jSWAPeWGQaGdlbOJ1c2S',
      milestoneTitle: '努力的蛇',
      amount: 300,
      status: 'success',
      createdAtMs: now - 1000 * 60 * 60 * 24 * 14
    }
  ];

  writeJSON(DEMO_KEYS.fanTransactions, seed);
  return seed;
}

function buildDemoTransactions() {
  const shared = readJSON(DEMO_KEYS.sharedTransactions, []);
  const base = Array.isArray(shared) && shared.length ? shared : ensureDemoTransactionsSeed();
  return base.map((tx, i) => ({
    id: tx.id || `demo_tx_${i}`,
    vtuberId: tx.vtuberId || 'demo',
    milestoneId: tx.milestoneId || 'milestone_demo',
    milestoneTitle: tx.milestoneTitle || DEMO_MILESTONE_TITLES[tx.milestoneId] || '里程碑',
    amount: Number(tx.amount || 0),
    status: tx.status || 'success',
    createdAt: fakeTs(tx.createdAtMs || Date.now())
  }));
}

function patchDemoVtuberService() {
  if (vtuberService.__demoFanPatched) return;
  const oldGetByHandle = vtuberService.getProfileByHandle
    ? vtuberService.getProfileByHandle.bind(vtuberService)
    : null;
  vtuberService.getProfileByHandle = async (handle) => {
    const key = String(handle || '').toLowerCase();
    if (DEMO_VTUBER_MAP[key]) return { ...DEMO_VTUBER_MAP[key], handle: key };
    if (oldGetByHandle) return oldGetByHandle(handle);
    return null;
  };
  vtuberService.__demoFanPatched = true;
}

function applyDemoVtuberLinks() {
  window.__DEMO_VTUBER_PROFILE_URL = DEMO_VTUBER_PROFILE_URL;
  document.querySelectorAll('a[href^="vtuber_profile.html"]').forEach((link) => {
    const hash = link.hash || '';
    link.href = `${DEMO_VTUBER_PROFILE_URL}${hash}`;
  });
}

function shouldRunDemoBadgesTour() {
  if (!isFanProfileDemoMode()) return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('tour') === 'badges';
}

function runDemoBadgesTour() {
  if (!shouldRunDemoBadgesTour()) return;
  const target = document.getElementById('outer-badges-grid');
  if (!target) return;

  if (!document.getElementById('demo-badges-tour-style')) {
    const style = document.createElement('style');
    style.id = 'demo-badges-tour-style';
    style.textContent = `
      .demo-badges-tour-highlight {
        position: relative;
        z-index: 9991;
        outline: 3px solid #ff85b2;
        outline-offset: 6px;
        border-radius: 16px;
        box-shadow: 0 0 0 10px rgba(255, 133, 178, 0.18);
      }
      .demo-badges-tour-tip {
        position: fixed;
        z-index: 9992;
        width: min(320px, calc(100vw - 24px));
        background: rgba(255, 255, 255, 0.98);
        border: 2px solid rgba(255, 133, 178, 0.35);
        border-radius: 16px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.15);
        padding: 14px 14px 12px;
        color: #334155;
        font-size: 0.9rem;
        line-height: 1.5;
      }
      .demo-badges-tour-tip button {
        margin-top: 10px;
        border: none;
        background: linear-gradient(135deg, #ff6b9e, #70ddf1);
        color: #fff;
        border-radius: 999px;
        padding: 7px 14px;
        font-weight: 700;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  target.classList.add('demo-badges-tour-highlight');
  const tip = document.createElement('div');
  tip.className = 'demo-badges-tour-tip';
  tip.innerHTML = `
    <div>這裡是粉絲頁 Demo 的限定徽章區，可以查看你在 Demo 中解鎖的徽章展示。</div>
    <button type="button">知道了</button>
  `;
  document.body.appendChild(tip);

  const placeTip = () => {
    const rect = target.getBoundingClientRect();
    const pad = 12;
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const desiredLeft = rect.left + rect.width / 2 - tipW / 2;
    const desiredTop = rect.bottom + 14;
    const maxLeft = Math.max(pad, vw - tipW - pad);
    const maxTop = Math.max(pad, vh - tipH - pad);
    tip.style.left = `${Math.min(Math.max(desiredLeft, pad), maxLeft)}px`;
    tip.style.top = `${Math.min(Math.max(desiredTop, pad), maxTop)}px`;
  };

  const close = () => {
    tip.remove();
    target.classList.remove('demo-badges-tour-highlight');
    window.removeEventListener('resize', placeTip);
    const params = new URLSearchParams(window.location.search);
    if (params.get('tour') === 'badges') {
      params.delete('tour');
      const q = params.toString();
      const nextUrl = `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash || ''}`;
      window.history.replaceState({}, '', nextUrl);
    }
  };

  tip.querySelector('button')?.addEventListener('click', close);
  window.addEventListener('resize', placeTip);
  placeTip();
}

/**
 * 更新 Hero 區塊：名稱、頭像、Email
 */
function renderHero(user, userDocData) {
  const displayName = userDocData?.displayName || user.displayName || '未命名粉絲';
  let photoURL = userDocData?.photoURL || user.photoURL;
  if (isFanProfileDemoMode()) {
    if (!photoURL || photoURL.includes('dicebear.com')) {
      photoURL = 'image/ighead_b.jpg';
    }
  } else {
    if (!photoURL) {
      photoURL = 'https://api.dicebear.com/7.x/notionists/svg?seed=Felix';
    }
  }

  // 名稱：多個 .fan-name 元素
  document.querySelectorAll('.fan-name').forEach(nameEl => {
    nameEl.textContent = displayName;
  });

  // 頭像：profile card + nav avatar
  const avatarWrapperImg = document.querySelector('.avatar-wrapper img');
  const navAvatarImg     = document.querySelector('.nav-avatar');
  if (avatarWrapperImg) avatarWrapperImg.src = photoURL;
  if (navAvatarImg)     navAvatarImg.src     = photoURL;

  // 個人設定 modal 裡的 input 預填
  const themeNameInput    = el('theme-name');
  const themeTaglineInput = el('theme-tagline');
  if (themeNameInput    && !themeNameInput._fbFilled)    { themeNameInput.value    = displayName; themeNameInput._fbFilled    = true; }
  if (themeTaglineInput && !themeTaglineInput._fbFilled) { themeTaglineInput.value = userDocData?.tagline || ''; themeTaglineInput._fbFilled = true; }

  // 綁定 Google email
  const emailEl = el('bound-google-email');
  if (emailEl) emailEl.textContent = user.email || '';

  // tagline（個人簽名檔）
  const taglineEl = document.querySelector('.fan-tagline');
  if (taglineEl && userDocData?.tagline) taglineEl.textContent = userDocData.tagline;

  // 套用儲存的主題顏色
  if (userDocData?.themeColorPrimary && userDocData?.themeColorSecondary) {
    const cp = userDocData.themeColorPrimary;
    const cs = userDocData.themeColorSecondary;
    
    // 更新 modal 內的 input
    const cpInput = el('theme-color-primary');
    const csInput = el('theme-color-secondary');
    if (cpInput && !cpInput._fbFilled) { cpInput.value = cp; cpInput._fbFilled = true; }
    if (csInput && !csInput._fbFilled) { csInput.value = cs; csInput._fbFilled = true; }

    // 更新 DOM CSS 變數
    const root = document.documentElement;
    root.style.setProperty('--text-pink', cp);
    root.style.setProperty('--text-blue', cs);

    const mixPinkLight = `color-mix(in srgb, ${cp} 10%, white)`;
    const mixBlueLight = `color-mix(in srgb, ${cs} 10%, white)`;
    root.style.setProperty('--bg-pink-light', mixPinkLight);
    root.style.setProperty('--bg-blue-light', mixBlueLight);

    const supporterTagText = document.querySelector('.supporter-tag');
    if (supporterTagText) supporterTagText.style.color = ''; 
    const supporterIcon = document.querySelector('.supporter-tag i');
    if (supporterIcon) supporterIcon.style.color = cp;

    document.querySelectorAll('.section-title .text-pink').forEach(element => {
        if (!element.closest('.fixed-theme')) element.style.color = cp;
    });

    root.style.setProperty('--grad-left', `color-mix(in srgb, ${cp} 15%, white)`);
    root.style.setProperty('--grad-right', `color-mix(in srgb, ${cs} 15%, white)`);
    const bgGradient = document.querySelector('.bg-gradient');
    if (bgGradient) bgGradient.style.background = `linear-gradient(90deg, var(--grad-left, #FCE7F3) 0%, var(--grad-right, #E0F2FE) 100%)`;

    const shadowMix = `color-mix(in srgb, ${cp} 20%, transparent)`;
    const fanCard = document.querySelector('.fan-card:not(.fixed-theme)');
    if (fanCard) fanCard.style.boxShadow = `0 10px 40px ${shadowMix}`;

    const avatarWrap = document.querySelector('.avatar-wrapper');
    if (avatarWrap) avatarWrap.style.boxShadow = `0 0 30px ${shadowMix}`;

    const brmShadow = el('brm-shadow');
    if (brmShadow) brmShadow.style.boxShadow = `0 10px 25px ${shadowMix}`;

    document.querySelectorAll('.v-link').forEach(link => {
        link.style.color = cp;
        link.onmouseover = () => { link.style.borderColor = `color-mix(in srgb, ${cp} 30%, white)`; };
        link.onmouseleave = () => { link.style.borderColor = 'rgba(255, 255, 255, 0.9)'; };
    });
  }

  // 更新年月份 (DECEMBER 2024 -> 實際年月份)
  const dateBadge = document.querySelector('.date-badge');
  if (dateBadge) {
    const now = new Date();
    const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
    dateBadge.textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
  }
}

/**
 * 更新「收藏成就勳章」與「獲得稱號」
 * 將 Firestore 資料轉成 fan_profile.html 預期的格式並呼叫 window.updateBadgesAndTitles
 */
async function updateBadgesAndTitlesFromFirebase(fanUid, firestoreBadges = [], firestoreTitles = []) {
  if (!window.updateBadgesAndTitles) return;

  let formattedBadges = null;
  if (firestoreBadges && firestoreBadges.length > 0) {
    formattedBadges = await Promise.all(firestoreBadges.map(async (b, i) => {
      let vtName = b.vtuberName || null;
      let mTitle = b.milestoneTitle || null;
      let contrib = b.contribution || 0;
      let resolvedVtuberId = b.vtuberId || null;

      // 如果缺少 vtuberId 或 milestoneTitle 或 contribution，從交易紀錄回推
      if (fanUid && b.milestoneId) {
        try {
          // Avoid composite index requirement by querying only by fanUid
          const q = query(
            collection(db, 'transactions'),
            where('fanUid', '==', fanUid)
          );
          const qSnap = await getDocs(q);
          let total = 0;
          qSnap.forEach(tx => {
            const txData = tx.data();
            if (txData.milestoneId === b.milestoneId && txData.status === 'success') {
                total += Number(txData.amount || 0);
                if (!resolvedVtuberId && txData.vtuberId) resolvedVtuberId = txData.vtuberId;
                if (!mTitle && txData.milestoneTitle) mTitle = txData.milestoneTitle;
            }
          });
          if (!b.contribution) contrib = total;
        } catch (e) { console.warn('Failed to fetch contribution from transactions', e); }
      }

      let bName = b.name || b.badgeName || null;
      let bDesc = b.desc || b.description || null;
      let bImgSrc = b.badgeUrl || b.imageUrl || null;

      // 如果有 milestoneId，直接從里程碑文件獲取缺失的資料（包含 badgeUrl 和正確的 vtuberId）
      if (b.milestoneId && (!mTitle || !bName || !bDesc || !bImgSrc || !resolvedVtuberId)) {
        try {
          const mDoc = await getDoc(doc(db, 'milestones', b.milestoneId));
          if (mDoc.exists()) {
            const mData = mDoc.data();
            if (!mTitle) mTitle = mData.title || b.milestoneId;
            if (!bName) bName = mData.badgeName;
            if (!bDesc) bDesc = mData.badgeDesc;
            if (!bImgSrc) bImgSrc = mData.badgeUrl || mData.imageUrl || mData.badgeImage || mData.image || null;
            // 優先使用 milestone 內的 vtuberId
            if (mData.vtuberId) resolvedVtuberId = mData.vtuberId;
          }
        } catch (e) { console.warn('Failed to fetch milestone details', e); }
      }

      // 取得 VTuber 顯示名稱
      if (resolvedVtuberId && !vtName) {
        try {
          let profileUid = resolvedVtuberId;
          // 嘗試從 handles 集合中反查 UID，以防 vtuberId 存的其實是 handle
          const handleDoc = await getDoc(doc(db, 'handles', resolvedVtuberId));
          if (handleDoc.exists() && handleDoc.data().uid) {
            profileUid = handleDoc.data().uid;
          }
          
          const vDoc = await getDoc(doc(db, 'vtubers', profileUid));
          if (vDoc.exists()) {
            vtName = vDoc.data().displayName || vDoc.data().name || resolvedVtuberId;
          }
        } catch (e) { console.warn('Failed to fetch vtuberName', e); }
      }

      return {
        id: b.id || `fb_badge_${i}`,
        imgSrc: bImgSrc,
        iconClass: b.icon || (!bImgSrc ? 'fa-solid fa-medal' : null),
        style: b.style || 'bg-pink-light',
        title: bName || '預設徽章',
        origin: mTitle || '贊助成就',
        date: b.awardedAt ? (new Date(b.awardedAt).toLocaleDateString('zh-TW')) : (b.earnedAt ? (b.earnedAt.toDate ? b.earnedAt.toDate().toLocaleDateString('zh-TW') : b.earnedAt) : '最近'),
        desc: bDesc || '感謝您一直以來的支持！',
        contribution: contrib.toString(),
        selected: b.selected !== false,
        vtuberId: resolvedVtuberId || null,
        vtuberName: vtName || 'VTuber'
      };
    }));
  }

  let formattedTitles = null;
  if (firestoreTitles && firestoreTitles.length > 0) {
    formattedTitles = firestoreTitles.map((t, i) => {
      if (typeof t === 'string') {
        return {
          id: `fb_title_${i}`,
          iconClass: 'fa-solid fa-flag text-blue',
          title: t,
          origin: '成就解鎖',
          selected: true
        };
      }
      return {
        id: t.id || `fb_title_${i}`,
        iconClass: t.iconClass || 'fa-solid fa-flag text-blue',
        title: t.name || t.title || '稱號',
        origin: t.origin || '成就解鎖',
        selected: t.selected !== false
      };
    });
  }

  // Only update if we actually got data, otherwise keep the default HTML mock data for visual demo
  if (formattedBadges || formattedTitles) {
    window.updateBadgesAndTitles(formattedBadges, formattedTitles);
  }
}

/**
 * 更新統計數字
 */
function renderStats(userDocData) {
  const supportedCount = (userDocData?.supportedVtubers || []).length;
  const badgeCount     = (userDocData?.badges || []).length;
  const longestDays    = userDocData?.longestSupportDays || 0;
  const milestoneRate  = userDocData?.milestoneRate || 0;

  const vtuberCountEl = el('stat-vtuber-count');
  const badgeCountEl  = el('stat-badge-count');
  const longestDayEl  = el('stat-longest-day');
  const milestoneRateEl = el('stat-milestone-rate');

  if (vtuberCountEl && supportedCount > 0) {
    vtuberCountEl.innerHTML = `${supportedCount} <small>位</small>`;
  }
  if (badgeCountEl && badgeCount > 0) {
    badgeCountEl.textContent = `${badgeCount}`;
  }
  if (longestDayEl && longestDays > 0) {
    longestDayEl.innerHTML = `${longestDays} <small>day</small>`;
  }
  if (milestoneRateEl && milestoneRate > 0) {
    milestoneRateEl.textContent = `${milestoneRate}%`;
  }
}

/**
 * 更新「陪伴成長的 VTuber 們」區塊（vtuber-flex-container）
 */
async function renderSupportedVtubers(vtuberIds = []) {
  const container = el('vtuber-flex-container');
  if (!container) return;
  
  if (!vtuberIds.length) {
    container.innerHTML = `
      <div style="width:100%; text-align:center; padding:40px 20px; color:var(--text-muted); border: 2px dashed rgba(0,0,0,0.05); border-radius: 20px;">
        <i class="fa-solid fa-heart-crack" style="font-size:2rem; margin-bottom:15px; display:block; opacity:0.3;"></i>
        <p style="margin-bottom: 15px;">目前還沒有陪伴中的 VTuber 喔！</p>
        <a href="index.html" class="btn-primary" style="display:inline-block; padding:8px 25px; font-size:0.9rem; border-radius: 50px; text-decoration:none;">去尋找喜歡的 V 吧</a>
      </div>
    `;
    return;
  }

  // 取得各 VTuber 的資料
  const cards = await Promise.all(vtuberIds.map(async (vid) => {
    try {
      const data = await vtuberService.getProfileByHandle(vid);
      if (!data) {
        console.warn(`[fan-profile] VTuber profile not found for ID/Handle: ${vid}`);
        return { handle: vid, name: vid, avatar: 'image/v_head_ryusei.jpg' };
      }
      const handle = data.handle || vid;
      const name   = data.displayName || data.name || handle;
      // 優先序：avatarUrl > photoURL > bannerUrl > 預設圖
      const avatar = data.avatarUrl || data.photoURL || data.bannerUrl || 'image/v_head_ryusei.jpg';
      console.log(`[fan-profile] Resolved VTuber: ${name}, Avatar: ${avatar}`);
      return { handle, name, avatar };
    } catch (err) {
      console.error(`[fan-profile] Error fetching VTuber ${vid}:`, err);
      return { handle: vid, name: vid, avatar: 'image/v_head_ryusei.jpg' };
    }
  }));

  container.innerHTML = cards.map(v => `
    <div class="vtuber-circle-card">
      <img src="${v.avatar}" alt="${v.name}" class="w-full h-auto"
           onerror="this.src='image/v_head_ryusei.jpg'">
      <span class="v-name">${v.name}</span>
      <a href="vtuber_profile.html?id=${v.handle}${isFanProfileDemoMode() ? '&mode=fan' : ''}" class="v-link">前往專頁</a>
    </div>
  `).join('');

  if (window.renderSupportList) {
    window.renderSupportList(cards.map(c => ({ name: c.name, avatarUrl: c.avatar })));
  }
}

/**
 * 輔助：批次解析 VTuber 名稱
 */
async function resolveVtuberNames(txList) {
  const ids = [...new Set(txList.map(t => t.vtuberId).filter(Boolean))];
  await Promise.all(ids.map(async (id) => {
    if (vtuberNameCache[id]) return;
    try {
      let profileUid = id;
      // 嘗試從 handles 集合中反查 UID，以防 vtuberId 存的其實是 handle
      const handleDoc = await getDoc(doc(db, 'handles', id));
      if (handleDoc.exists() && handleDoc.data().uid) {
        profileUid = handleDoc.data().uid;
      }

      const snap = await getDoc(doc(db, 'vtubers', profileUid));
      if (snap.exists()) {
        const data = snap.data();
        vtuberNameCache[id] = data.displayName || data.name || id;
      } else {
        vtuberNameCache[id] = id;
      }
    } catch {
      vtuberNameCache[id] = id;
    }
  }));
}

/**
 * 更新「近期贊助與點數異動明細」表格（transaction-table tbody）
 */
function renderTransactions(txList = []) {
  // 找到 transaction-table 的 tbody
  const table = document.querySelector('.transaction-table');
  if (!table) return;
  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  if (!txList.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">尚無贊助紀錄。</td></tr>';
    const btnViewMore = table.parentElement.querySelector('.btn-view-more') || table.closest('.fan-card')?.querySelector('.btn-view-more');
    if (btnViewMore) btnViewMore.style.display = 'none';
    return;
  }

  tbody.innerHTML = txList.map((tx, index) => {
    const date   = tx.createdAt?.toDate
      ? tx.createdAt.toDate().toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      : '—';
    const vtuberName = vtuberNameCache[tx.vtuberId] || tx.vtuberId || '—';
    const statusHtml = tx.status === 'success'
      ? '<span class="status-success"><i class="fa-solid fa-check"></i> 成功扣款</span>'
      : '<span style="color:#f59e0b;"><i class="fa-solid fa-clock"></i> 處理中</span>';

    const hiddenClass = index >= 5 ? 'hidden-item extra-trans' : '';

    return `
      <tr class="${hiddenClass}">
        <td class="col-date" data-label="日期時間">${date}</td>
        <td class="col-bold" data-label="對象">${vtuberName}</td>
        <td data-label="項目">${tx.milestoneTitle || tx.milestoneId || '—'}</td>
        <td class="col-red" data-label="花費(NTD)">- ${Number(tx.amount || 0).toLocaleString()}</td>
        <td data-label="狀態">${statusHtml}</td>
      </tr>
    `;
  }).join('');

  // 處理「查看更多」按鈕的顯示/隱藏
  const btnViewMore = table.parentElement.querySelector('.btn-view-more') || table.closest('.fan-card')?.querySelector('.btn-view-more');
  if (btnViewMore) {
    btnViewMore.style.display = txList.length > 5 ? 'block' : 'none';
    // 確保按鈕文字重置（如果是剛加載）
    btnViewMore.innerHTML = '查看更多 <i class="fa-solid fa-chevron-down"></i>';
  }
}

async function initFanProfileDemo() {
  const profile = ensureDemoProfile();
  patchDemoVtuberService();
  applyDemoVtuberLinks();

  const demoUser = {
    uid: DEMO_FAN_UID,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    email: profile.email || 'demo.fan@local'
  };

  renderHero(demoUser, profile);
  const badgeList = Array.isArray(profile.badges) ? profile.badges : [];
  const titleList = Array.isArray(profile.honorTitles) ? profile.honorTitles : [];
  if (badgeList.length && (badgeList[0].imgSrc || badgeList[0].title)) {
    if (window.updateBadgesAndTitles) window.updateBadgesAndTitles(badgeList, titleList);
  } else {
    await updateBadgesAndTitlesFromFirebase(null, badgeList, titleList);
  }
  renderStats(profile);

  const vtuberIds = Array.isArray(profile.supportedVtubers) ? profile.supportedVtubers : [];
  if (vtuberIds.length) {
    await renderSupportedVtubers(vtuberIds);
  }

  const txList = buildDemoTransactions();
  await resolveVtuberNames(txList);
  txList.forEach((tx) => {
    if (vtuberNameCache[tx.vtuberId]) return;
    const meta = tx.vtuberId ? DEMO_VTUBER_MAP[tx.vtuberId] : null;
    if (meta && meta.displayName) vtuberNameCache[tx.vtuberId] = meta.displayName;
  });
  renderTransactions(txList);
  setTimeout(runDemoBadgesTour, 280);
}

// ─── 主初始化 ────────────────────────────────────────────────────────────────

function initFanProfile() {
  if (isFanProfileDemoMode()) {
    initFanProfileDemo();
    return;
  }
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      // 未登入 → 跳轉
      window.location.href = 'auth.html';
      return;
    }

    // 1. 即時監聽 User Document
    onSnapshot(doc(db, 'users', user.uid), async (snap) => {
      if (!snap.exists()) {
        // 文件不存在時，至少用 auth 資料更新 Hero
        renderHero(user, null);
        return;
      }

      const data = snap.data();

      renderHero(user, data);
      await updateBadgesAndTitlesFromFirebase(user.uid, data.badges || [], data.honorTitles || []);
      renderStats(data);

      const vtuberIds = data.supportedVtubers || [];
      if (vtuberIds.length) {
        await renderSupportedVtubers(vtuberIds);
      }
    }, (err) => {
      console.warn('[fan-profile] User doc onSnapshot error:', err);
      // fallback：至少用 auth 資料填名稱
      renderHero(user, null);
    });

    // 2. 即時監聽 Transactions (近 30 天且成功的贊助)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let txQuery;
    try {
      txQuery = query(
        collection(db, 'transactions'),
        where('fanUid', '==', user.uid),
        where('status', '==', 'success'),
        where('createdAt', '>=', thirtyDaysAgo),
        orderBy('createdAt', 'desc')
      );
    } catch (e) {
      console.warn('[fan-profile] Query construction failed, falling back to simple query', e);
      txQuery = query(collection(db, 'transactions'), where('fanUid', '==', user.uid));
    }

    onSnapshot(txQuery, (snap) => {
      let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // 如果 query 因為缺少索引報錯或回傳全量，則在前端補強過濾 (防止萬一)
      // 同時處理那些不支援複合查詢的情況
      const thirtyDaysMs = thirtyDaysAgo.getTime();
      const filtered = docs.filter(tx => {
        const txTime = tx.createdAt?.toMillis ? tx.createdAt.toMillis() : 0;
        return tx.status === 'success' && txTime >= thirtyDaysMs;
      });

      // 確保排序 (以防 fallback query 沒有 orderBy)
      filtered.sort((a, b) => {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });

      resolveVtuberNames(filtered).then(() => renderTransactions(filtered));
    }, (err) => {
      console.warn('[fan-profile] Transactions onSnapshot error (可能缺少索引):', err);
      // 如果正式查詢失敗（通常是索引問題），嘗試回退到最基礎查詢並手動過濾
      const fallbackQuery = query(collection(db, 'transactions'), where('fanUid', '==', user.uid));
      onSnapshot(fallbackQuery, (snap) => {
          const allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const filtered = allDocs.filter(tx => {
            const txTime = tx.createdAt?.toMillis ? tx.createdAt.toMillis() : 0;
            return tx.status === 'success' && txTime >= thirtyDaysMs;
          });
          filtered.sort((a, b) => {
            const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return tB - tA;
          });
          resolveVtuberNames(filtered).then(() => renderTransactions(filtered));
      }, (err2) => {
          console.error('[fan-profile] Fallback transactions query also failed:', err2);
      });
    });
  });
}

/**
 * 儲存介面設定（名稱、簽名檔、主題顏色、頭像上傳）
 */
window.handleInterfaceSettingsUpdate = async () => {
  const user = auth.currentUser;
  if (isFanProfileDemoMode()) {
    const newName = el('theme-name').value;
    const newTagline = el('theme-tagline').value;
    const avatarInput = el('theme-avatar');
    const colorPrimary = el('theme-color-primary').value;
    const colorSecondary = el('theme-color-secondary').value;

    const profile = ensureDemoProfile();
    const updates = {
      displayName: newName,
      tagline: newTagline,
      themeColorPrimary: colorPrimary,
      themeColorSecondary: colorSecondary
    };

    if (avatarInput && avatarInput.files && avatarInput.files[0]) {
      updates.photoURL = await fileToDataUrl(avatarInput.files[0]);
    }

    const next = { ...profile, ...updates, updatedAt: new Date().toISOString() };
    writeJSON(DEMO_KEYS.profile, next);
    renderHero({
      displayName: next.displayName,
      photoURL: next.photoURL,
      email: next.email || 'demo.fan@local'
    }, next);
    return;
  }
  if (!user) return;

  const newName = el('theme-name').value;
  const newTagline = el('theme-tagline').value;
  const avatarInput = el('theme-avatar');
  const colorPrimary = el('theme-color-primary').value;
  const colorSecondary = el('theme-color-secondary').value;
  
  const userDocRef = doc(db, 'users', user.uid);
  const updates = {
    displayName: newName,
    tagline: newTagline,
    themeColorPrimary: colorPrimary,
    themeColorSecondary: colorSecondary,
    updatedAt: new Date()
  };

  try {
    // 處理頭像上傳
    if (avatarInput && avatarInput.files && avatarInput.files[0]) {
      const file = avatarInput.files[0];
      const uploadUrl = await storageService.uploadFile(file);
      updates.photoURL = uploadUrl;

      // 即時更新 UI 預覽
      const heroAvatars = document.querySelectorAll('.hero-avatar img');
      heroAvatars.forEach(img => img.src = uploadUrl);
    }

    await updateDoc(userDocRef, updates);
    console.log('[fan-profile] Interface settings updated');
    alert('設定已儲存！');
  } catch (err) {
    console.error('[fan-profile] Failed to save settings:', err);
    alert('儲存失敗：' + err.message);
  }
};

/**
 * 儲存徽章與稱號展示設定
 */
window.handleBadgeSettingsUpdate = async (badges, titles) => {
  const user = auth.currentUser;
  if (isFanProfileDemoMode()) {
    const profile = ensureDemoProfile();
    const next = {
      ...profile,
      badges: Array.isArray(badges) ? badges : profile.badges,
      honorTitles: Array.isArray(titles) ? titles : profile.honorTitles,
      updatedAt: new Date().toISOString()
    };
    writeJSON(DEMO_KEYS.profile, next);
    if (window.updateBadgesAndTitles) {
      window.updateBadgesAndTitles(next.badges, next.honorTitles);
    }
    return;
  }
  if (!user) return;

  const userDocRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return;
    const data = snap.data();
    
    let firestoreBadges = data.badges || [];
    let firestoreTitles = data.honorTitles || [];

    // 更新 badges 的 selected 狀態
    firestoreBadges = firestoreBadges.map((fb, i) => {
      const id = fb.id || `fb_badge_${i}`;
      const uiBadge = badges.find(b => b.id === id);
      if (uiBadge) {
        fb.selected = uiBadge.selected;
      }
      return fb;
    });

    // 更新 honorTitles 的 selected 狀態 (支援字串或物件格式)
    firestoreTitles = firestoreTitles.map((ft, i) => {
      let id = typeof ft === 'string' ? `fb_title_${i}` : (ft.id || `fb_title_${i}`);
      const uiTitle = titles.find(t => t.id === id);
      
      if (typeof ft === 'string') {
        if (uiTitle) return { title: ft, selected: uiTitle.selected, id };
        return { title: ft, selected: true, id };
      }
      
      if (uiTitle) {
        ft.selected = uiTitle.selected;
      }
      return ft;
    });

    await updateDoc(userDocRef, {
      badges: firestoreBadges,
      honorTitles: firestoreTitles,
      updatedAt: new Date()
    });
    console.log('[fan-profile] Badge settings updated in Firebase');
  } catch (err) {
    console.error('[fan-profile] Failed to update badge settings:', err);
  }
};

// 等 DOM 載入完再初始化
initFanProfile();
