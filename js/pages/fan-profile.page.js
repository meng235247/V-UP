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
  doc, getDoc, collection, query, where,
  onSnapshot, orderBy
} from 'firebase/firestore';

// ─── Helpers ────────────────────────────────────────────────────────────────

const el = (id) => document.getElementById(id);

/**
 * 更新 Hero 區塊：名稱、頭像、Email
 */
function renderHero(user, userDocData) {
  const displayName = userDocData?.displayName || user.displayName || '未命名粉絲';
  const photoURL    = userDocData?.photoURL    || user.photoURL    || 'https://api.dicebear.com/7.x/notionists/svg?seed=Felix';

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
}

/**
 * 更新「收藏成就勳章」區塊（outer-badges-grid）
 * 將 Firestore badges 陣列和現有 ALL_BADGES（靜態）合併：
 *   - 有對應 milestoneId 的才顯示為已解鎖
 *   - 其餘 ALL_BADGES 保持原邏輯
 */
function renderFirebaseBadges(firestoreBadges = []) {
  if (!firestoreBadges.length) return; // 沒有資料就保留靜態 mock

  const grid = el('outer-badges-grid');
  if (!grid) return;

  grid.innerHTML = '';

  firestoreBadges.forEach(b => {
    const div = document.createElement('div');
    div.className = 'badge-icon bg-pink-light';
    div.title = `${b.name || '徽章'} (${b.milestoneId || ''})`;
    div.innerHTML = `<span style="font-size:2rem;">${b.icon || '🏅'}</span>`;
    grid.appendChild(div);
  });
}

/**
 * 更新「獲得稱號」區塊（outer-titles-grid）
 */
function renderFirebaseTitles(titles = []) {
  if (!titles.length) return;

  const grid = el('outer-titles-grid');
  if (!grid) return;

  grid.innerHTML = '';
  titles.forEach(t => {
    const span = document.createElement('span');
    span.className = 'title-tag';
    span.innerHTML = `<i class="fa-solid fa-flag text-blue"></i> ${t}`;
    grid.appendChild(span);
  });
}

/**
 * 更新統計數字
 */
function renderStats(userDocData) {
  const supportedCount = (userDocData?.supportedVtubers || []).length;
  const badgeCount     = (userDocData?.badges || []).length;

  const vtuberCountEl = el('stat-vtuber-count');
  const badgeCountEl  = el('stat-badge-count');

  if (vtuberCountEl && supportedCount > 0) {
    vtuberCountEl.innerHTML = `${supportedCount} <small>位</small>`;
  }
  if (badgeCountEl && badgeCount > 0) {
    badgeCountEl.textContent = `${badgeCount}`;
  }
}

/**
 * 更新「陪伴成長的 VTuber 們」區塊（vtuber-flex-container）
 */
async function renderSupportedVtubers(vtuberIds = []) {
  const container = el('vtuber-flex-container');
  if (!container || !vtuberIds.length) return;

  // 取得各 VTuber 的資料
  const cards = await Promise.all(vtuberIds.map(async (vid) => {
    try {
      const snap = await getDoc(doc(db, 'vtubers', vid));
      const data = snap.exists() ? snap.data() : {};
      const handle = data.handle || vid;
      const name   = data.displayName || data.name || handle;
      const avatar = data.avatarUrl || data.photoURL || 'image/v_head_ryusei.jpg';
      return { handle, name, avatar };
    } catch {
      return { handle: vid, name: vid, avatar: 'image/v_head_ryusei.jpg' };
    }
  }));

  container.innerHTML = cards.map(v => `
    <div class="vtuber-circle-card">
      <img src="${v.avatar}" alt="${v.name}" class="w-full h-auto"
           onerror="this.src='image/v_head_ryusei.jpg'">
      <span class="v-name">${v.name}</span>
      <a href="vtuber_profile.html?id=${v.handle}" class="v-link">前往專頁</a>
    </div>
  `).join('');
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
    return;
  }

  tbody.innerHTML = txList.map(tx => {
    const date   = tx.createdAt?.toDate
      ? tx.createdAt.toDate().toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      : '—';
    const statusHtml = tx.status === 'success'
      ? '<span class="status-success"><i class="fa-solid fa-check"></i> 成功扣款</span>'
      : '<span style="color:#f59e0b;"><i class="fa-solid fa-clock"></i> 處理中</span>';

    return `
      <tr>
        <td class="col-date" data-label="日期時間">${date}</td>
        <td class="col-bold" data-label="對象">${tx.vtuberId || '—'}</td>
        <td data-label="項目">${tx.milestoneTitle || tx.milestoneId || '—'}</td>
        <td class="col-red" data-label="花費(NTD)">- ${Number(tx.amount || 0).toLocaleString()}</td>
        <td data-label="狀態">${statusHtml}</td>
      </tr>
    `;
  }).join('');
}

// ─── 主初始化 ────────────────────────────────────────────────────────────────

function initFanProfile() {
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
      renderFirebaseBadges(data.badges || []);
      renderFirebaseTitles(data.honorTitles || []);
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

    // 2. 即時監聽 Transactions
    const txQuery = query(
      collection(db, 'transactions'),
      where('fanUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    onSnapshot(txQuery, (snap) => {
      renderTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn('[fan-profile] Transactions onSnapshot error (可能缺少索引):', err);
      // 索引未建時，不清除現有 mock 資料
    });
  });
}

// 等 DOM 載入完再初始化（fan_profile.html 有 DOMContentLoaded → initPage()，
// 我們需要在它之後執行，所以用 module script 的時序（module 比 DOMContentLoaded 晚）
initFanProfile();
