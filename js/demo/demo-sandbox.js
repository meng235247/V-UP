const DEMO_KEYS = {
  points: 'vup_demo_points',
  role: 'vup_demo_role',
  transactions: 'vup_demo_transactions',
  fanMilestones: 'vup_demo_fan_milestones',
  creatorMilestones: 'vup_demo_creator_milestones',
  creatorPosts: 'vup_demo_creator_posts',
  creatorProfile: 'vup_demo_creator_profile',
  creatorEmail: 'vup_demo_creator_email',
  creatorSkippedEmail: 'vup_demo_creator_skipped_email'
};

const DEMO_CREATOR_UID = 'demo_creator_local';
const DEMO_CREATOR_PREVIEW_ID = 'demo_creator_local';
const DEMO_INITIAL_POINTS = 120000;
const DEMO_FAN_PROFILE = {
  uid: 'demo_fan_local',
  displayName: 'Demo Supporter',
  photoURL: 'https://api.dicebear.com/7.x/notionists/svg?seed=demo-supporter'
};
const FORM_URL_FAN = '#';
const FORM_URL_CREATOR = '#';

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

function fakeTs(ms) {
  const t = Number(ms || Date.now());
  return {
    toMillis() {
      return t;
    },
    toDate() {
      return new Date(t);
    }
  };
}

function isCurrentPage(name) {
  return window.location.pathname.toLowerCase().endsWith(name.toLowerCase());
}

function getMode() {
  return new URLSearchParams(window.location.search).get('mode') || '';
}

export function isDemoCreatorMode() {
  return isCurrentPage('dashboard.html') && getMode() === 'demo';
}

export function isDemoFanMode() {
  if (!isCurrentPage('vtuber_profile.html')) return false;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const mode = params.get('mode');
  return mode === 'fan' || id === 'demo';
}

export function isCreatorPreviewMode() {
  if (!isCurrentPage('vtuber_profile.html')) return false;
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  return mode === 'creator-preview';
}

export function getDemoFanProfile() {
  return { ...DEMO_FAN_PROFILE };
}

export function trackDemoEvent(eventName, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

function showDemoBanner(text, withPoints = false) {
  let banner = document.getElementById('demo-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'demo-banner';
    document.body.prepend(banner);
  }
  const points = Number(localStorage.getItem(DEMO_KEYS.points) || String(DEMO_INITIAL_POINTS));
  banner.innerHTML = withPoints
    ? `<span>${text}</span><span id="demo-points-display">V點：<strong>${points}</strong></span><span>僅本機模擬，不會產生真實金流</span>`
    : `<span>${text}</span>`;
  document.body.classList.add('demo-has-banner');
}

function updateDemoPointsDisplay() {
  const el = document.getElementById('demo-points-display');
  if (!el) return;
  const points = Number(localStorage.getItem(DEMO_KEYS.points) || String(DEMO_INITIAL_POINTS));
  el.innerHTML = `V點：<strong>${points}</strong>`;
}

function openFormInNewTab(role) {
  const url = role === 'creator' ? FORM_URL_CREATOR : FORM_URL_FAN;
  if (!url || url === '#') {
    alert('表單連結尚未填入，稍後可替換常數 FORM_URL_*');
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function showCompletionModal(role) {
  const id = 'demo-completion-modal';
  const old = document.getElementById(id);
  if (old) old.remove();

  const wrap = document.createElement('div');
  wrap.id = id;
  wrap.className = 'demo-modal-overlay';
  wrap.innerHTML = `
    <div class="demo-modal-card">
      <h3>你已完成 Demo 關鍵流程</h3>
      <p>願意的話，幫我們填 2 分鐘回饋問卷，連結會用新分頁開啟。</p>
      <div class="demo-modal-actions">
        <button id="demo-feedback-btn" class="demo-btn demo-btn-primary">填寫回饋表單</button>
        <button id="demo-close-btn" class="demo-btn demo-btn-secondary">繼續試玩</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrap);

  const close = () => {
    trackDemoEvent('feedback_form_skipped', { role });
    wrap.remove();
  };
  wrap.querySelector('#demo-close-btn')?.addEventListener('click', close);
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap) close();
  });
  wrap.querySelector('#demo-feedback-btn')?.addEventListener('click', () => {
    trackDemoEvent('feedback_form_clicked', { role });
    openFormInNewTab(role);
  });
}

function readFanMilestoneMap() {
  const cached = readJSON(DEMO_KEYS.fanMilestones, {});
  if (Array.isArray(cached)) return {};
  return cached || {};
}

function saveFanMilestoneMap(map) {
  writeJSON(DEMO_KEYS.fanMilestones, map);
}

function getFanVtuberId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || 'demo';
}

function milestoneKey(vtuberId, milestoneId) {
  return `${vtuberId}:${milestoneId}`;
}

function ensureDemoSeedMilestones(seedData) {
  const map = readFanMilestoneMap();
  const vtuberId = 'demo';
  (seedData?.milestones || []).forEach((m) => {
    const key = milestoneKey(vtuberId, m.id);
    if (!map[key]) {
      map[key] = {
        milestoneId: m.id,
        vtuberId,
        currentAmount: Number(m.currentAmount || m.current || 0),
        targetAmount: Number(m.targetAmount || m.goal || m.target || 0),
        totalSupporters: Number(m.totalSupporters || 0),
        status: m.status || 'published',
        updatedAtMs: Date.now()
      };
    }
  });
  saveFanMilestoneMap(map);
}

function resolveMilestoneFromPage(milestoneId) {
  const list = window.VtuberProfilePage && Array.isArray(window.VtuberProfilePage._lastRenderedMilestones)
    ? window.VtuberProfilePage._lastRenderedMilestones
    : [];
  const m = list.find((item) => item && item.id === milestoneId);
  if (!m) return null;
  return {
    milestoneId,
    currentAmount: Number(m.currentAmount || m.current || 0),
    targetAmount: Number(m.targetAmount || m.goal || m.target || 0),
    totalSupporters: Number(m.totalSupporters || 0),
    status: m.status || 'published',
    updatedAtMs: Date.now()
  };
}

function readTransactions() {
  return readJSON(DEMO_KEYS.transactions, []);
}

function saveTransactions(list) {
  writeJSON(DEMO_KEYS.transactions, list);
}

export function getDemoFanSupportAmount(milestoneId) {
  const txs = readTransactions().filter((t) => t && t.status === 'success' && t.fanUid === DEMO_FAN_PROFILE.uid);
  return txs
    .filter((t) => !milestoneId || t.milestoneId === milestoneId)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
}

function patchFanPaymentService(PaymentService, seedData) {
  if (!PaymentService || PaymentService.__demoFanPatched) return;

  const createTx = ({ vtuberId, milestoneId, amount, method, message, fanName }) => ({
    id: `demo_tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    fanUid: 'demo_fan_local',
    fanName: fanName || 'Demo Fan',
    vtuberId: vtuberId || getFanVtuberId(),
    milestoneId,
    amount: Number(amount),
    method: method || 'demo_points',
    message: message || '',
    status: 'success',
    createdAtMs: Date.now()
  });

  const doPayment = (milestoneId, amount, method, message, fanName) => {
    const numericAmount = Number(amount);
    if (!(numericAmount > 0)) throw new Error('金額需大於 0');

    const points = Number(localStorage.getItem(DEMO_KEYS.points) || String(DEMO_INITIAL_POINTS));
    if (points < numericAmount) throw new Error('V點不足，請降低金額');

    const vtuberId = getFanVtuberId();
    const map = readFanMilestoneMap();
    const key = milestoneKey(vtuberId, milestoneId);
    let milestone = map[key];
    if (!milestone) {
      milestone = resolveMilestoneFromPage(milestoneId);
    }
    if (!milestone && vtuberId === 'demo' && seedData && Array.isArray(seedData.milestones)) {
      const seed = seedData.milestones.find((m) => m.id === milestoneId);
      if (seed) {
        milestone = {
          milestoneId,
          vtuberId,
          currentAmount: Number(seed.currentAmount || seed.current || 0),
          targetAmount: Number(seed.targetAmount || seed.goal || seed.target || 0),
          totalSupporters: Number(seed.totalSupporters || 0),
          status: seed.status || 'published',
          updatedAtMs: Date.now()
        };
      }
    }
    if (!milestone) throw new Error('找不到里程碑');

    const nextPoints = points - numericAmount;
    localStorage.setItem(DEMO_KEYS.points, String(nextPoints));
    updateDemoPointsDisplay();

    milestone = { ...milestone };
    const before = Number(milestone.currentAmount || 0);
    const target = Number(milestone.targetAmount || milestone.goal || milestone.target || 0);
    milestone.currentAmount = before + numericAmount;
    milestone.totalSupporters = Number(milestone.totalSupporters || 0) + 1;
    milestone.updatedAtMs = Date.now();
    const justAchieved = target > 0 && before < target && milestone.currentAmount >= target;
    if (justAchieved) {
      milestone.status = 'achieved';
      milestone.achievedAtMs = Date.now();
    }
    map[key] = milestone;
    saveFanMilestoneMap(map);

    if (vtuberId === 'demo' && seedData && Array.isArray(seedData.milestones)) {
      seedData.milestones = seedData.milestones.map((m) => {
        if (m.id !== milestoneId) return m;
        return {
          ...m,
          currentAmount: milestone.currentAmount,
          totalSupporters: milestone.totalSupporters,
          status: milestone.status,
          achievedAt: milestone.achievedAtMs ? fakeTs(milestone.achievedAtMs) : null,
          updatedAt: fakeTs(milestone.updatedAtMs)
        };
      });
    }

    const tx = createTx({ vtuberId, milestoneId, amount: numericAmount, method, message, fanName });
    const txs = readTransactions();
    txs.unshift(tx);
    saveTransactions(txs);

    trackDemoEvent('demo_payment_completed', { role: 'fan', amount: numericAmount, milestone_id: milestoneId });
    window.dispatchEvent(
      new CustomEvent('vup:demo-payment-completed', {
        detail: {
          milestoneId,
          amount: numericAmount,
          currentAmount: milestone.currentAmount,
          targetAmount: target,
          totalSupporters: milestone.totalSupporters,
          remainingPoints: nextPoints,
          justAchieved
        }
      })
    );
    return { txId: tx.id, status: 'success', demo: true, justAchieved };
  };

  PaymentService.initiate = async (milestoneId, amount, method, message, customName = null) =>
    doPayment(milestoneId, amount, method, message, customName);
  PaymentService.initiateGuest = async (_vtuberId, milestoneId, amount, method, message, guestName = null) =>
    doPayment(milestoneId, amount, method, message, guestName);
  PaymentService.getTransactions = async (vtuberId) => {
    const txs = readTransactions()
      .filter((t) => !vtuberId || t.vtuberId === vtuberId)
      .map((t) => ({ ...t, createdAt: fakeTs(t.createdAtMs) }));
    return txs;
  };

  PaymentService.__demoFanPatched = true;
}

function patchFanMilestonesService(MilestonesService) {
  if (!MilestonesService || MilestonesService.__demoFanPatched) return;
  const usingSeedDemo = getFanVtuberId() === 'demo';
  if (!usingSeedDemo) {
    MilestonesService.__demoFanPatched = true;
    return;
  }

  MilestonesService.listenRankings = (milestoneId, lim = 10, callback) => {
    const txs = readTransactions().filter((t) => t.milestoneId === milestoneId && t.status === 'success');
    const map = {};
    txs.forEach((t) => {
      const key = t.fanUid || 'demo_fan_local';
      if (!map[key]) {
        map[key] = {
          fanUid: key,
          displayName: t.fanName || 'Demo Fan',
          totalAmount: 0,
          avatarUrl: null
        };
      }
      map[key].totalAmount += Number(t.amount || 0);
    });
    const ranks = Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, lim);
    const myKey = DEMO_FAN_PROFILE.uid;
    const myAmount = map[myKey] ? map[myKey].totalAmount : 0;
    callback(ranks, myAmount);
    return () => {};
  };

  MilestonesService.__demoFanPatched = true;
}

function patchFanPostsService(PostsService) {
  if (!PostsService || PostsService.__demoFanPatched) return;
  const usingSeedDemo = getFanVtuberId() === 'demo';
  if (usingSeedDemo) {
    PostsService.getPublishedPostsByMilestone = async () => [];
  }
  PostsService.__demoFanPatched = true;
}

export function initFanDemoSandbox({ seedData, PaymentService, MilestonesService, PostsService }) {
  if (!isDemoFanMode()) return { enabled: false };

  localStorage.setItem(DEMO_KEYS.role, 'fan');
  if (!localStorage.getItem(DEMO_KEYS.points)) {
    localStorage.setItem(DEMO_KEYS.points, String(DEMO_INITIAL_POINTS));
  }

  const vtuberId = getFanVtuberId();
  if (vtuberId === 'demo' && seedData && Array.isArray(seedData.milestones)) {
    ensureDemoSeedMilestones(seedData);
  }

  showDemoBanner('粉絲試玩模式', true);
  window._pmCurrentUserData = {
    displayName: DEMO_FAN_PROFILE.displayName,
    photoURL: DEMO_FAN_PROFILE.photoURL
  };
  window.__DEMO_FAN_PROFILE = getDemoFanProfile();
  patchFanPaymentService(PaymentService, seedData);
  patchFanMilestonesService(MilestonesService);
  patchFanPostsService(PostsService);
  trackDemoEvent('demo_fan_entered', { page: 'vtuber_profile' });

  window.DemoSandbox = {
    isFanDemoMode: isDemoFanMode,
    isDemoCreatorMode,
    isCreatorPreviewMode,
    getDemoFanProfile,
    getDemoFanSupportAmount,
    trackDemoEvent,
    showCompletionModal
  };

  return { enabled: true };
}

function patchCreatorPreviewServices({ vtuberService, MilestonesService, PostsService }) {
  const isPreview = isCreatorPreviewMode();
  if (!isPreview) return;

  const localProfile = readCreatorProfile();
  const localMilestones = () => readCreatorMilestones();
  const localPosts = () => readCreatorPosts();

  if (vtuberService && !vtuberService.__demoCreatorPreviewPatched) {
    const oldGetByHandle = vtuberService.getProfileByHandle.bind(vtuberService);
    vtuberService.getProfileByHandle = async (handle) => {
      if (handle === DEMO_CREATOR_PREVIEW_ID || handle === localProfile.handle || handle === 'demo') {
        return { ...localProfile, uid: DEMO_CREATOR_UID };
      }
      return oldGetByHandle(handle);
    };
    vtuberService.__demoCreatorPreviewPatched = true;
  }

  if (MilestonesService && !MilestonesService.__demoCreatorPreviewPatched) {
    MilestonesService.listenPublicMilestones = (_vtuberId, callback) => {
      const rows = localMilestones()
        .filter((m) => ['published', 'active', 'achieved', 'archived'].includes(m.status))
        .map((m) => ({
          ...m,
          vtuberId: DEMO_CREATOR_UID,
          createdAt: fakeTs(m.createdAtMs),
          updatedAt: fakeTs(m.updatedAtMs || m.createdAtMs),
          publishedAt: m.publishedAtMs ? fakeTs(m.publishedAtMs) : null,
          achievedAt: m.achievedAtMs ? fakeTs(m.achievedAtMs) : null
        }));
      callback(rows);
      return () => {};
    };

    MilestonesService.getPublicMilestones = async () =>
      localMilestones()
        .filter((m) => ['published', 'active', 'achieved', 'archived'].includes(m.status))
        .map((m) => ({
          ...m,
          vtuberId: DEMO_CREATOR_UID,
          createdAt: fakeTs(m.createdAtMs),
          updatedAt: fakeTs(m.updatedAtMs || m.createdAtMs),
          publishedAt: m.publishedAtMs ? fakeTs(m.publishedAtMs) : null
        }));

    MilestonesService.__demoCreatorPreviewPatched = true;
  }

  if (PostsService && !PostsService.__demoCreatorPreviewPatched) {
    PostsService.getPublishedPostsByMilestone = async (milestoneId, opts = {}) => {
      const limit = Number(opts.limit || 20);
      const rows = localPosts()
        .filter((p) => p.milestoneId === milestoneId && p.status === 'published')
        .sort((a, b) => Number(b.publishedAtMs || b.updatedAtMs || 0) - Number(a.publishedAtMs || a.updatedAtMs || 0))
        .slice(0, limit)
        .map((p) => ({
          ...p,
          createdAt: fakeTs(p.createdAtMs),
          updatedAt: fakeTs(p.updatedAtMs || p.createdAtMs),
          publishedAt: p.publishedAtMs ? fakeTs(p.publishedAtMs) : null
        }));
      return rows;
    };
    PostsService.__demoCreatorPreviewPatched = true;
  }

  showDemoBanner('創作者公開頁預覽模式：讀取本機試玩資料');
}

export function initVtuberProfileDemoSandbox({ seedData, PaymentService, MilestonesService, PostsService, vtuberService }) {
  if (isCreatorPreviewMode()) {
    patchCreatorPreviewServices({ vtuberService, MilestonesService, PostsService });
    window.DemoSandbox = {
      isFanDemoMode: isDemoFanMode,
      isDemoCreatorMode,
      isCreatorPreviewMode,
      getDemoFanProfile,
      getDemoFanSupportAmount,
      trackDemoEvent,
      showCompletionModal
    };
    return { enabled: true, mode: 'creator-preview' };
  }
  const fan = initFanDemoSandbox({ seedData, PaymentService, MilestonesService, PostsService });
  return { ...fan, mode: fan.enabled ? 'fan' : 'none' };
}

function readCreatorProfile() {
  const cached = readJSON(DEMO_KEYS.creatorProfile, null);
  if (cached) return cached;
  const initial = {
    uid: DEMO_CREATOR_UID,
    displayName: 'Demo Creator',
    role: 'vtuber',
    avatarUrl: '',
    handle: 'demo',
    catchphrase: 'Demo creator mode',
    bio: '這是本機試玩資料，不會寫入雲端。'
  };
  writeJSON(DEMO_KEYS.creatorProfile, initial);
  return initial;
}

function readCreatorMilestones() {
  return readJSON(DEMO_KEYS.creatorMilestones, []);
}

function saveCreatorMilestones(items) {
  writeJSON(DEMO_KEYS.creatorMilestones, items);
}

function readCreatorPosts() {
  return readJSON(DEMO_KEYS.creatorPosts, []);
}

function saveCreatorPosts(items) {
  writeJSON(DEMO_KEYS.creatorPosts, items);
}

function patchCreatorServices({ vtuberService, MilestonesService, PostsService, PaymentService }) {
  if (vtuberService && !vtuberService.__demoCreatorPatched) {
    vtuberService.getProfile = async () => readCreatorProfile();
    vtuberService.saveProfile = async (_uid, data) => {
      const next = { ...readCreatorProfile(), ...data, uid: DEMO_CREATOR_UID, role: 'vtuber' };
      writeJSON(DEMO_KEYS.creatorProfile, next);
      return true;
    };
    vtuberService.getProfileByHandle = async (handle) => {
      const p = readCreatorProfile();
      if (!handle || handle === p.handle || handle === 'demo') return { ...p, uid: DEMO_CREATOR_UID };
      return null;
    };
    vtuberService.__demoCreatorPatched = true;
  }

  if (MilestonesService && !MilestonesService.__demoCreatorPatched) {
    MilestonesService.getMilestones = async () =>
      readCreatorMilestones().map((m) => ({
        ...m,
        createdAt: fakeTs(m.createdAtMs),
        updatedAt: fakeTs(m.updatedAtMs || m.createdAtMs),
        publishedAt: m.publishedAtMs ? fakeTs(m.publishedAtMs) : null
      }));

    MilestonesService.createDraft = async (milestone) => {
      const now = Date.now();
      const list = readCreatorMilestones();
      const item = {
        id: `demo_ms_${now}_${Math.floor(Math.random() * 999)}`,
        vtuberId: DEMO_CREATOR_UID,
        title: milestone.title || '未命名里程碑',
        desc: milestone.desc || '',
        targetAmount: Number(milestone.goal || milestone.targetAmount || 0),
        currentAmount: 0,
        totalSupporters: 0,
        badgeUrl: milestone.badgeUrl || null,
        status: 'draft',
        createdAtMs: now,
        updatedAtMs: now
      };
      list.unshift(item);
      saveCreatorMilestones(list);
      trackDemoEvent('milestone_created_demo', { milestone_id: item.id });
      return { id: item.id };
    };

    MilestonesService.update = async (milestoneId, milestone) => {
      const now = Date.now();
      const list = readCreatorMilestones().map((m) =>
        m.id === milestoneId
          ? {
              ...m,
              ...milestone,
              targetAmount: Number(milestone.goal || milestone.targetAmount || m.targetAmount || 0),
              badgeUrl: milestone.badgeUrl || m.badgeUrl || null,
              updatedAtMs: now
            }
          : m
      );
      saveCreatorMilestones(list);
      return true;
    };

    MilestonesService.publish = async (milestoneId) => {
      const now = Date.now();
      const list = readCreatorMilestones().map((m) =>
        m.id === milestoneId ? { ...m, status: 'published', publishedAtMs: now, updatedAtMs: now } : m
      );
      saveCreatorMilestones(list);
      window.dispatchEvent(new CustomEvent('vup:demo-milestone-published', { detail: { milestoneId } }));
      return true;
    };

    MilestonesService.delete = async (milestoneId) => {
      const list = readCreatorMilestones().filter((m) => m.id !== milestoneId);
      saveCreatorMilestones(list);
      return true;
    };

    MilestonesService.listenPublicMilestones = (_vtuberId, callback) => {
      callback(
        readCreatorMilestones()
          .filter((m) => ['published', 'active', 'achieved', 'archived'].includes(m.status))
          .map((m) => ({ ...m, createdAt: fakeTs(m.createdAtMs), updatedAt: fakeTs(m.updatedAtMs || m.createdAtMs) }))
      );
      return () => {};
    };

    MilestonesService.__demoCreatorPatched = true;
  }

  if (PostsService && !PostsService.__demoCreatorPatched) {
    PostsService.createDraft = async (milestoneId, raw = {}) => {
      const now = Date.now();
      const list = readCreatorPosts();
      const post = {
        id: `demo_post_${now}_${Math.floor(Math.random() * 999)}`,
        milestoneId,
        vtuberId: DEMO_CREATOR_UID,
        title: raw.title || '未命名貼文',
        content: raw.content || '',
        visibility: raw.visibility || 'public',
        status: 'draft',
        attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
        createdAtMs: now,
        updatedAtMs: now,
        publishedAtMs: null
      };
      list.unshift(post);
      saveCreatorPosts(list);
      return { id: post.id, milestoneId };
    };

    PostsService.publish = async (milestoneId, postId) => {
      const now = Date.now();
      const list = readCreatorPosts().map((p) =>
        p.milestoneId === milestoneId && p.id === postId
          ? { ...p, status: 'published', publishedAtMs: now, updatedAtMs: now }
          : p
      );
      saveCreatorPosts(list);
      return true;
    };

    PostsService.delete = async (milestoneId, postId) => {
      const list = readCreatorPosts().filter((p) => !(p.milestoneId === milestoneId && p.id === postId));
      saveCreatorPosts(list);
      return true;
    };

    PostsService.getPostsByMilestone = async (milestoneId, opts = {}) => {
      const includeDrafts = opts.includeDrafts !== false;
      return readCreatorPosts()
        .filter((p) => p.milestoneId === milestoneId && (includeDrafts || p.status === 'published'))
        .map((p) => ({
          ...p,
          createdAt: fakeTs(p.createdAtMs),
          updatedAt: fakeTs(p.updatedAtMs || p.createdAtMs),
          publishedAt: p.publishedAtMs ? fakeTs(p.publishedAtMs) : null
        }));
    };

    PostsService.listCreatorPosts = async () => {
      const milestones = readCreatorMilestones();
      const msMap = Object.fromEntries(milestones.map((m) => [m.id, m.title]));
      return readCreatorPosts().map((p) => ({
        ...p,
        milestoneTitle: msMap[p.milestoneId] || '未命名里程碑',
        createdAt: fakeTs(p.createdAtMs),
        updatedAt: fakeTs(p.updatedAtMs || p.createdAtMs),
        publishedAt: p.publishedAtMs ? fakeTs(p.publishedAtMs) : null
      }));
    };

    PostsService.__demoCreatorPatched = true;
  }

  if (PaymentService && !PaymentService.__demoCreatorPatched) {
    PaymentService.getTransactions = async (vtuberId) =>
      readTransactions()
        .filter((t) => !vtuberId || t.vtuberId === vtuberId)
        .map((t) => ({ ...t, createdAt: fakeTs(t.createdAtMs) }));
    PaymentService.__demoCreatorPatched = true;
  }
}

function showEmailGate() {
  return new Promise((resolve) => {
    const id = 'demo-email-gate';
    const old = document.getElementById(id);
    if (old) old.remove();

    const wrap = document.createElement('div');
    wrap.id = id;
    wrap.className = 'demo-modal-overlay';
    wrap.innerHTML = `
      <div class="demo-modal-card demo-email-gate-card">
        <h3>VTuber 創作者 Demo</h3>
        <p>留下 Email 可在正式版上線時優先收到通知。你也可以先跳過。</p>
        <input id="demo-email-input" class="demo-email-input" type="email" placeholder="you@example.com" />
        <div class="demo-modal-actions">
          <button id="demo-email-submit" class="demo-btn demo-btn-primary">送出 Email 並進入</button>
          <button id="demo-email-skip" class="demo-btn demo-btn-secondary">先跳過</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    const finish = (payload) => {
      wrap.remove();
      resolve(payload);
    };

    wrap.querySelector('#demo-email-submit')?.addEventListener('click', () => {
      const email = (wrap.querySelector('#demo-email-input')?.value || '').trim();
      if (!email) {
        alert('請先輸入 Email，或按「先跳過」。');
        return;
      }
      localStorage.setItem(DEMO_KEYS.creatorEmail, email);
      localStorage.removeItem(DEMO_KEYS.creatorSkippedEmail);
      trackDemoEvent('email_gate_submitted', { role: 'creator' });
      finish({ skipped: false, email });
    });

    wrap.querySelector('#demo-email-skip')?.addEventListener('click', () => {
      localStorage.setItem(DEMO_KEYS.creatorSkippedEmail, '1');
      trackDemoEvent('email_gate_skipped', { role: 'creator' });
      finish({ skipped: true, email: null });
    });
  });
}

export async function initCreatorDemoSandbox({ vtuberService, MilestonesService, PostsService, PaymentService }) {
  if (!isDemoCreatorMode()) return { enabled: false };

  localStorage.setItem(DEMO_KEYS.role, 'creator');
  showDemoBanner('創作者試玩模式：資料僅存本機，不會影響正式環境');
  patchCreatorServices({ vtuberService, MilestonesService, PostsService, PaymentService });

  const gate = await showEmailGate();
  const profile = readCreatorProfile();
  trackDemoEvent('demo_creator_entered', { page: 'dashboard' });

  window.DemoSandbox = {
    isFanDemoMode: isDemoFanMode,
    isDemoCreatorMode,
    isCreatorPreviewMode,
    getDemoFanProfile,
    getDemoFanSupportAmount,
    trackDemoEvent,
    showCompletionModal
  };

  return {
    enabled: true,
    uid: DEMO_CREATOR_UID,
    profile,
    gate
  };
}
