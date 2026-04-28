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

      // 取得 VTuber 顯示名稱
      if (resolvedVtuberId && !vtName) {
        try {
          const vDoc = await getDoc(doc(db, 'vtubers', resolvedVtuberId));
          if (vDoc.exists()) {
            vtName = vDoc.data().displayName || vDoc.data().name || resolvedVtuberId;
          }
        } catch (e) { console.warn('Failed to fetch vtuberName', e); }
      }

      // 如果從交易紀錄中仍找不到里程碑標題，且知道 vtuberId，則直接從里程碑文件獲取
      if (resolvedVtuberId && b.milestoneId && !mTitle) {
        try {
          const mDoc = await getDoc(doc(db, 'vtubers', resolvedVtuberId, 'milestones', b.milestoneId));
          if (mDoc.exists()) {
            mTitle = mDoc.data().title || b.milestoneId;
          }
        } catch (e) { console.warn('Failed to fetch milestoneTitle', e); }
      }

      return {
        id: b.id || `fb_badge_${i}`,
        imgSrc: b.badgeUrl || b.imageUrl || null,
        iconClass: b.icon || (!b.badgeUrl && !b.imageUrl ? 'fa-solid fa-medal' : null),
        style: b.style || 'bg-pink-light',
        title: b.name || b.badgeName || '預設徽章',
        origin: mTitle || '贊助成就',
        date: b.awardedAt ? (new Date(b.awardedAt).toLocaleDateString('zh-TW')) : (b.earnedAt ? (b.earnedAt.toDate ? b.earnedAt.toDate().toLocaleDateString('zh-TW') : b.earnedAt) : '最近'),
        desc: b.desc || b.description || '感謝您一直以來的支持！',
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
      <a href="vtuber_profile.html?id=${v.handle}" class="v-link">前往專頁</a>
    </div>
  `).join('');
}

/**
 * 輔助：批次解析 VTuber 名稱
 */
async function resolveVtuberNames(txList) {
  const ids = [...new Set(txList.map(t => t.vtuberId).filter(Boolean))];
  await Promise.all(ids.map(async (id) => {
    if (vtuberNameCache[id]) return;
    try {
      const snap = await getDoc(doc(db, 'vtubers', id));
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
 * 儲存介面設定（名稱、簽名檔、頭像上傳）
 */
window.handleInterfaceSettingsUpdate = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const newName = el('theme-name').value;
  const newTagline = el('theme-tagline').value;
  const avatarInput = el('theme-avatar');
  
  const userDocRef = doc(db, 'users', user.uid);
  const updates = {
    displayName: newName,
    tagline: newTagline,
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

// 等 DOM 載入完再初始化
initFanProfile();
