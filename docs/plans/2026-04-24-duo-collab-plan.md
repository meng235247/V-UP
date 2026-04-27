# V-UP 雙人協作計畫（里程碑 4 → 上線）

> **這份文件是兩位開發者和各自 AI Agent 的唯一工作指引。**  
> 請各自在開始前完整閱讀。有疑問先看「常見救援」章節，再問 AI。

---

## 背景：目前進度

- ✅ Firebase Auth + Firestore Emulator 本地環境已正常運作
- ✅ `milestones.service.js`、`posts.service.js`、`payment.service.js` 已有基本骨架
- ✅ `firestore.rules` 已涵蓋 milestones / posts / transactions 規則
- ✅ `storage.service.js` 目前是本地 Upload Server（Base64 + port 5176）
- ⬜ `fan_profile.html` 幾乎是空殼（只有 auth 跳轉）
- ⬜ 贊助流程尚未真正寫入 Firestore / 更新進度條
- ⬜ 徽章、稱號、解鎖限定貼文邏輯尚未接通
- ⬜ 贊助後排行榜欄位更新（粉絲累積金額顯示）尚未串接 ← 計畫新增
- ⬜ 贊助後限定貼文解鎖（允許粉絲讀取 supporters-only 貼文）尚未串接 ← 計畫新增
- ⬜ Firebase 線上雲端尚未連線（現在 `.env` 是 `demo-key`）
- ⬜ 網站尚未部署
@
---

## 分工總覽

| | **Person A（你）** | **Person B（協助者）** |
|---|---|---|
| **負責範圍** | 後端邏輯 + Firebase 上雲 + 部署 | 前端 UI → fan_profile 頁面 |
| **主要檔案** | `js/services/payment.service.js`、`js/pages/vtuber-profile.page.js`、`firestore.rules`、`.env`、`netlify.toml` | `fan_profile.html`、`fan_profile.css`、`js/pages/fan-profile.page.js` |
| **Git 分支** | `feat/backend-firebase` | `feat/fan-profile-ui` |
| **合併順序** | A 先 merge main，B 再 merge | |

> ⚠️ **兩人絕對不可以同時修改同一個檔案。** 分工表即邊界，不要越線。

---

## Person A 任務清單

### A-Task 0：建立分支

```powershell
git checkout main
git pull
git checkout -b feat/backend-firebase
```

---

### A-Task 1：模擬贊助流程（真正寫入 Firestore）

**要修改的檔案：** `js/services/payment.service.js`

**目前問題：** `initiate()` 只有 console.log，不寫入資料庫。

**步驟 1 — 更新 import（檔案頂部）：**

```js
import { db, auth } from '../firebase-config.js';
import {
  collection, doc, runTransaction,
  serverTimestamp, updateDoc, arrayUnion,
  getDocs, query, where, orderBy
} from 'firebase/firestore';
```

**步驟 2 — 替換 `initiate()`：**

```js
initiate: async (milestoneId, amount, method, message) => {
  const user = auth.currentUser;
  if (!user) throw new Error('請先登入');
  if (!milestoneId || !(Number(amount) > 0)) throw new Error('參數錯誤');

  const milestoneRef = doc(db, 'milestones', milestoneId);
  const txRef = doc(collection(db, 'transactions'));
  let vtuberId = '';
  let milestoneTitle = '';

  await runTransaction(db, async (t) => {
    const ms = await t.get(milestoneRef);
    if (!ms.exists()) throw new Error('里程碑不存在');
    const msData = ms.data();
    vtuberId = msData.vtuberId;
    milestoneTitle = msData.title || '';

    t.update(milestoneRef, {
      currentAmount: (msData.currentAmount || 0) + Number(amount),
      totalSupporters: (msData.totalSupporters || 0) + 1,
      updatedAt: serverTimestamp()
    });

    t.set(txRef, {
      fanUid: user.uid,
      fanName: user.displayName || '匿名粉絲',
      vtuberId,
      milestoneId,
      milestoneTitle,
      amount: Number(amount),
      method: method || 'simulated',
      message: message || '',
      status: 'pending',
      createdAt: serverTimestamp()
    });
  });

  // 模擬付款成功
  await updateDoc(txRef, { status: 'success', confirmedAt: serverTimestamp() });
  
  // 組合獲得的徽章
  const newBadge = {
    milestoneId: milestoneId,
    name: milestoneTitle || '贊助者',
    icon: '🏅',
    awardedAt: new Date().toISOString()
  };

  await updateDoc(doc(db, 'users', user.uid), {
    unlockedMilestones: arrayUnion(milestoneId),
    supportedVtubers: arrayUnion(vtuberId),
    badges: arrayUnion(newBadge),
    updatedAt: serverTimestamp()
  });

  return { txId: txRef.id, status: 'success' };
},
```

**驗收：** 在本地 emulator 登入粉絲帳號，點贊助，開 http://127.0.0.1:4000 確認 `transactions` 有新紀錄、`milestones.currentAmount` 增加。

---

### A-Task 2：onSnapshot 即時更新里程碑進度

**要修改的檔案：** `js/pages/vtuber-profile.page.js`

**在頁面初始化函數中，找到讀取 milestones 的地方，加入以下：**

```js
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase-config.js';

// 新增此函數，在頁面 init 時呼叫
function listenMilestoneProgress(vtuberId, renderFn) {
  const q = query(
    collection(db, 'milestones'),
    where('vtuberId', '==', vtuberId),
    where('status', 'in', ['published', 'active', 'achieved'])
  );
  // 回傳 unsubscribe，在頁面關閉時呼叫
  return onSnapshot(q, (snap) => {
    const milestones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderFn(milestones);
  }, (err) => {
    console.warn('[onSnapshot] milestone error:', err);
  });
}
```

將原本的 `getMilestones()` 或 `getPublicMilestones()` 呼叫改為呼叫 `listenMilestoneProgress()`，並在 `window.addEventListener('beforeunload', () => unsubscribe())` 清理。

**驗收：** 開兩個瀏覽器分頁，一個看公開頁面，另一個模擬贊助，確認第一個分頁進度條自動更新。

---

### A-Task 2b：贊助後排行榜即時更新（粉絲累積金額）⬅ 新增

> **背景**：`vtuber_profile.html` 右方排行榜目前只在頁面載入時讀取一次。贊助後排行榜需要自動反映粉絲的累積金額。

**設計思路：**
- 每筆成功交易寫入 `transactions` 集合（已由 A-Task 1 完成）。
- 後端彙整：在 `milestones.service.js` 新增 `getRankingsLive(milestoneId, limit)` 函數，使用 `onSnapshot` 監聽 `transactions`，依 `milestoneId` 過濾，在客戶端彙整每位粉絲的 `totalAmount`，排序後取前 N 名回傳。
- 前端：在 `vtuber-profile.page.js` 的每個 milestone card 中，呼叫 `getRankingsLive()` 並在 callback 中重繪排行榜。

**要修改的檔案：** `js/services/milestones.service.js`

在 `MilestonesService` 物件中新增：

```js
/**
 * 即時監聽里程碑排行榜（依 transactions 彙整粉絲累積金額）
 * @param {string} milestoneId
 * @param {number} limit - 顯示前幾名
 * @param {function} callback - (rankList) => void
 *   rankList 每項：{ fanUid, displayName, totalAmount }
 * @returns unsubscribe function
 */
listenRankings: (milestoneId, limit = 10, callback) => {
  const { onSnapshot, collection, query, where } = await import('firebase/firestore');
  // 注意：service 頂部已 import，此處用靜態 import
  const q = query(
    collection(db, 'transactions'),
    where('milestoneId', '==', milestoneId),
    where('status', '==', 'success')
  );
  return onSnapshot(q, (snap) => {
    // 依 fanUid 彙整
    const map = {};
    snap.docs.forEach(d => {
      const tx = d.data();
      if (!map[tx.fanUid]) {
        map[tx.fanUid] = { fanUid: tx.fanUid, displayName: tx.fanName || '匿名', totalAmount: 0 };
      }
      map[tx.fanUid].totalAmount += (tx.amount || 0);
    });
    const sorted = Object.values(map)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit);
    callback(sorted);
  }, (err) => {
    console.warn('[listenRankings] error:', err);
    callback([]);
  });
},
```

> ⚠️ **注意**：此函數已使用靜態 import（頂部已有），請勿在函數體內使用 `await import()`。需把上方 snippet 中的 `await import` 改為直接呼叫已 import 的函數。請確認 `milestones.service.js` 頂部已有：
> ```js
> import { onSnapshot, collection, query, where } from 'firebase/firestore';
> ```

**要修改的檔案：** `js/pages/vtuber-profile.page.js`

在 `renderMilestones()` 中每個 milestone card 建立完畢後（目前的 `(async () => getRankings...)()` 區塊），替換為呼叫 `listenRankings()`：

```js
// 改為即時監聽排行榜（取代舊的一次性 getRankings）
const unsubRank = MilestonesService.listenRankings(m.id, 10, (rankList) => {
  const rl = card.querySelector(`#rank-list-${m.id}`);
  if (!rl) return;
  if (!rankList.length) {
    rl.innerHTML = '<div class="rank-item"><div class="r-info"><span class="r-name">尚無贊助紀錄</span></div></div>';
    return;
  }
  rl.innerHTML = rankList.map((r, i) => `
    <div class="rank-item">
      <span class="r-rank">${i + 1}</span>
      <img src="https://i.pravatar.cc/100?u=${r.fanUid}" class="r-avatar" alt="${r.displayName}">
      <div class="r-info">
        <span class="r-name">${r.displayName}</span>
        <span class="r-amt">${Number(r.totalAmount).toLocaleString()} NTD</span>
      </div>
    </div>
  `).join('');
});
// 頁面卸載時清理
window.addEventListener('beforeunload', unsubRank, { once: true });
```

**驗收：**
1. 登入粉絲帳號後贊助一個里程碑。
2. 確認該里程碑右方排行榜**自動出現或更新**粉絲名稱與累積金額。
3. 再次贊助（同一里程碑），確認金額**累加**（不是出現兩筆重複紀錄）。

---

### A-Task 2c：贊助後限定貼文解鎖 ⬅ 新增

> **背景**：`vtuber-profile.page.js` 的 `renderMilestonePosts()` 目前判斷是否顯示鎖定狀態的邏輯是：
> ```js
> const allowList = Array.isArray(post.allowedUids) ? post.allowedUids : [];
> const canReadSupporterPost = !!viewerUid && (
>   (vtuberUid && viewerUid === vtuberUid)
>   || allowList.includes(viewerUid)
>   || post.viewerUnlocked === true
> );
> ```
> 此邏輯依賴 `post.allowedUids`（包含粉絲 UID 的白名單），但目前 `PaymentService.initiate()` 只更新了 `users/{uid}.unlockedMilestones`，並**沒有把粉絲 UID 寫入每篇限定貼文的 `allowedUids` 陣列**。

**解法：兩層解鎖判斷（推薦）**

解鎖判斷改為：  
①先看 `users/{uid}.unlockedMilestones` 是否包含此 `milestoneId` → 包含即為贊助者  
②不需要逐篇更新 `posts.allowedUids`（可選保留作白名單的備用機制）

**步驟 1 — 在 `vtuber-profile.page.js` 中，`init()` 函數內加入粉絲解鎖狀態讀取：**

```js
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase-config.js';

// 在 init() 函數頂部取得目前登入者的已解鎖里程碑
let viewerUnlockedMilestones = [];
if (auth.currentUser) {
  try {
    const userSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (userSnap.exists()) {
      viewerUnlockedMilestones = userSnap.data().unlockedMilestones || [];
    }
  } catch (e) {
    console.warn('[VtuberProfilePage] failed to load viewer unlock list', e);
  }
}
// 掛在全域 page controller 上，供 renderMilestonePosts 使用
VtuberProfilePage._viewerUnlockedMilestones = viewerUnlockedMilestones;
```

**步驟 2 — 修改 `renderMilestonePosts()` 中的解鎖判斷邏輯（約第 385 行）：**

```js
// 原有：
// const canReadSupporterPost = !!viewerUid && (
//   (vtuberUid && viewerUid === vtuberUid)
//   || allowList.includes(viewerUid)
//   || post.viewerUnlocked === true
// );

// 更新為（新增第三個條件）：
const unlockedMilestones = VtuberProfilePage._viewerUnlockedMilestones || [];
const canReadSupporterPost = !!viewerUid && (
  (vtuberUid && viewerUid === vtuberUid)          // VTuber 本人
  || allowList.includes(viewerUid)                 // 舊白名單（保留相容）
  || post.viewerUnlocked === true                  // 伺服器回傳旗標（保留相容）
  || unlockedMilestones.includes(milestoneId)      // ← 新增：贊助者解鎖判斷
);
```

**步驟 3 — 贊助完成後觸發 UI 刷新（在 `vtuber_profile.html` 的 `simulatePaymentAPI` 成功 callback 中新增）：**

```js
await window.PaymentService.initiate(currentMilestoneId, amount, selectedMethod, msg);

// ← 新增：更新本地解鎖狀態並重繪此里程碑的貼文
if (window.VtuberProfilePage) {
  if (!window.VtuberProfilePage._viewerUnlockedMilestones) {
    window.VtuberProfilePage._viewerUnlockedMilestones = [];
  }
  // 將剛剛贊助的里程碑加入本地快取（避免重新讀取 Firestore）
  if (!window.VtuberProfilePage._viewerUnlockedMilestones.includes(currentMilestoneId)) {
    window.VtuberProfilePage._viewerUnlockedMilestones.push(currentMilestoneId);
  }
  // 重新渲染此里程碑的貼文（解除鎖定）
  const milestoneCard = document.querySelector(`.ms-card[data-milestone-id="${currentMilestoneId}"]`);
  if (milestoneCard) {
    import('./js/services/posts.service.js').then(({ default: PostsService }) => {
      PostsService.getPublishedPostsByMilestone(currentMilestoneId, { limit: 12, tryIncludeSupporters: true })
        .then(posts => window.VtuberProfilePage.renderMilestonePosts(milestoneCard, currentMilestoneId, posts));
    });
  }
}
```

**驗收：**
1. 用粉絲帳號開啟 `vtuber_profile.html?id=auroramizu`。
2. 確認限定貼文顯示「贊助解鎖 🔒」按鈕（尚未贊助）。
3. 完成贊助後，同一頁面的限定貼文應**自動切換為「展開閱讀」**，不需要手動重整。
4. 登出再登入（重新整理），確認已贊助的粉絲仍然可以看到解鎖狀態（從 Firestore `users.unlockedMilestones` 讀取）。

---

### A-Task 3：Firebase 線上雲端（最重要）

> ⚠️ **請在 A-Task 1, 2 本地測試通過後才做此步驟。**

**步驟 1 — 取得真實 Firebase 設定：**
- 前往 https://console.firebase.google.com → 選 `v-up-1eeb3`
- 齒輪 → 專案設定 → 您的應用程式 → 複製 `firebaseConfig`

**步驟 2 — 更新 `.env`（本機，不 commit）：**

```
VITE_FIREBASE_API_KEY=（貼上真實 API Key）
VITE_FIREBASE_AUTH_DOMAIN=v-up-1eeb3.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=v-up-1eeb3
VITE_FIREBASE_STORAGE_BUCKET=v-up-1eeb3.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=（真實值）
VITE_FIREBASE_APP_ID=（真實值）
VITE_FIREBASE_MEASUREMENT_ID=（真實值）
VITE_USE_EMULATOR=false
VITE_UPLOAD_SERVER_URL=
```

**步驟 3 — 部署 Firestore Rules：**

```powershell
npx firebase-tools deploy --only firestore:rules --project v-up-1eeb3
```

**步驟 4 — 在 Firebase Console 建立複合索引（若查詢失敗時）：**

| Collection | Fields |
|---|---|
| `milestones` | `vtuberId` ASC, `status` ASC, `publishedAt` DESC |
| `transactions` | `vtuberId` ASC, `createdAt` DESC |
| `transactions` | `fanUid` ASC, `createdAt` DESC |

**步驟 5 — 確認 Firebase Auth 已啟用：**
- Firebase Console → Authentication → Sign-in method → 電子郵件/密碼 → 啟用

**步驟 6 — 線上測試：**
```powershell
npm run dev
# 開瀏覽器登入，確認沒有 auth/invalid-api-key 錯誤
```

---

### A-Task 4：Netlify 部署

**步驟 1 — 新增 `netlify.toml`（專案根目錄）：**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**步驟 2 — 確認 `package.json` 有 build 指令（若沒有則加）：**

```json
"build": "vite build"
```

**步驟 3 — 前往 https://netlify.com 建立帳號（若無）並連結 GitHub：**
- Add new site → Import from Git → GitHub → 選 `meng235247/V-UP`
- Branch: `main`
- Build command: `npm run build`
- Publish directory: `dist`

**步驟 4 — 在 Netlify 設定環境變數：**
- Site Settings → Environment Variables
- 加入所有 `VITE_*` 真實值（`VITE_USE_EMULATOR` 設為 `false`）

**步驟 5 — 觸發部署，確認網址正常。**

---

### A-Task 5：Commit 並合回 main

```powershell
git add js/services/payment.service.js js/pages/vtuber-profile.page.js netlify.toml
git commit -m "feat: simulate payment + onSnapshot realtime + cloud + netlify deploy"
git checkout main
git pull
git merge feat/backend-firebase
git push
# 通知 Person B 可以 merge 了
```

---

## Person B 任務清單（fan_profile UI）

### ⚙️ 環境前置（協助者必做）

#### 確認 Node.js
```powershell
node -v
```
若無版本號 → 前往 https://nodejs.org 下載 LTS 版安裝。

#### 確認 Java（Firebase Emulator 需要）
```powershell
java -version
```
若無 → 前往 https://adoptium.net/temurin/releases/?version=21  
下載 **Windows x64 JDK 21 .msi** 安裝，重開 PowerShell 確認。

#### Clone 並安裝
```powershell
git clone https://github.com/meng235247/V-UP.git
cd V-UP
npm install
npm run local:reset
```
成功後開 http://127.0.0.1:5173/fan_profile.html

#### 建立分支
```powershell
git checkout -b feat/fan-profile-ui
```

---

### B-Task 1：fan_profile.html 加入 HTML 結構

**要修改的檔案：** `fan_profile.html`

找到頁面 `<main>` 標籤內部，加入以下區塊（保留原有 `<script>` 標籤，只加 HTML）：

```html
<!-- 粉絲個人資料卡 -->
<section class="fan-hero">
  <img id="fan-avatar" src="image/default-avatar.png" alt="頭像" class="fan-avatar">
  <div class="fan-info">
    <h1 id="fan-name">載入中...</h1>
    <p id="fan-title" class="fan-title"></p>
  </div>
</section>

<!-- 徽章區 -->
<section class="fan-section">
  <h2>我的徽章</h2>
  <div id="fan-badges-grid" class="badges-grid">
    <p class="empty-hint">尚無徽章，快去贊助你喜愛的 VTuber！</p>
  </div>
</section>

<!-- 贊助過的創作者 -->
<section class="fan-section">
  <h2>支持過的創作者</h2>
  <div id="fan-supported-list" class="supported-list">
    <p class="empty-hint">尚未贊助任何創作者。</p>
  </div>
</section>

<!-- 贊助紀錄 -->
<section class="fan-section">
  <h2>贊助紀錄</h2>
  <table class="tx-table">
    <thead>
      <tr><th>日期</th><th>里程碑</th><th>金額</th><th>狀態</th></tr>
    </thead>
    <tbody id="fan-tx-tbody">
      <tr><td colspan="4" class="empty-hint">尚無贊助紀錄。</td></tr>
    </tbody>
  </table>
</section>
```

---

### B-Task 2：fan_profile.css 加入樣式

**要修改的檔案：** `fan_profile.css`（在檔案末尾加入）

```css
/* === Fan Hero === */
.fan-hero {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 2rem;
  background: var(--card-bg, #1a1a2e);
  border-radius: 16px;
  margin-bottom: 2rem;
}
.fan-avatar {
  width: 80px; height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--accent, #e91e8c);
}
.fan-title { color: var(--accent, #e91e8c); font-size: 0.9rem; font-weight: 600; margin: 0.25rem 0 0; }

/* === Sections === */
.fan-section { margin-bottom: 2rem; }
.fan-section h2 { font-size: 1.1rem; margin-bottom: 1rem; border-bottom: 1px solid var(--border, #2d2d4e); padding-bottom: 0.5rem; }

/* === Badges === */
.badges-grid { display: flex; flex-wrap: wrap; gap: 1rem; }
.badge-card {
  background: var(--card-bg, #1a1a2e);
  border: 1px solid var(--border, #2d2d4e);
  border-radius: 12px;
  padding: 0.75rem 1.25rem;
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.85rem;
}
.badge-icon { font-size: 1.4rem; }

/* === Supported === */
.supported-list { display: flex; flex-wrap: wrap; gap: 1rem; }
.supported-card {
  background: var(--card-bg, #1a1a2e);
  border: 1px solid var(--border, #2d2d4e);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  display: flex; align-items: center; gap: 0.75rem;
  text-decoration: none; color: inherit;
  transition: border-color 0.2s;
}
.supported-card:hover { border-color: var(--accent, #e91e8c); }

/* === Transactions === */
.tx-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.tx-table th { text-align: left; padding: 0.75rem; border-bottom: 2px solid var(--border, #2d2d4e); color: var(--text-muted, #888); }
.tx-table td { padding: 0.75rem; border-bottom: 1px solid var(--border, #2d2d4e); }
.status-success { color: #4caf50; }
.status-pending { color: #ff9800; }
.empty-hint { color: var(--text-muted, #888); font-size: 0.9rem; }
```

---

### B-Task 3：fan-profile.page.js 完整替換

**要修改的檔案：** `js/pages/fan-profile.page.js`

完整替換為：

```js
import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

function renderHero(user, userDoc) {
  const el = (id) => document.getElementById(id);
  if (el('fan-name')) el('fan-name').textContent = user.displayName || userDoc?.displayName || '未命名粉絲';
  if (el('fan-avatar')) el('fan-avatar').src = user.photoURL || userDoc?.photoURL || 'image/default-avatar.png';
  if (el('fan-title')) el('fan-title').textContent = userDoc?.title || userDoc?.honorTitle || '';
}

function renderBadges(badges = []) {
  const grid = document.getElementById('fan-badges-grid');
  if (!grid) return;
  if (!badges.length) { grid.innerHTML = '<p class="empty-hint">尚無徽章，快去贊助你喜愛的 VTuber！</p>'; return; }
  grid.innerHTML = badges.map(b =>
    `<div class="badge-card"><span class="badge-icon">${b.icon || '🏅'}</span><span>${b.name || '徽章'}</span></div>`
  ).join('');
}

async function renderSupportedVtubers(vtuberIds = []) {
  const list = document.getElementById('fan-supported-list');
  if (!list) return;
  if (!vtuberIds.length) { list.innerHTML = '<p class="empty-hint">尚未贊助任何創作者。</p>'; return; }
  const cards = await Promise.all(vtuberIds.map(async (vid) => {
    try {
      const snap = await getDoc(doc(db, 'vtubers', vid));
      const data = snap.exists() ? snap.data() : {};
      const handle = data.handle || vid;
      const name = data.displayName || data.name || handle;
      return `<a class="supported-card" href="vtuber_profile.html?id=${handle}"><span>🎙</span><span>${name}</span></a>`;
    } catch { return ''; }
  }));
  list.innerHTML = cards.join('');
}

function renderTransactions(txList = []) {
  const tbody = document.getElementById('fan-tx-tbody');
  if (!tbody) return;
  if (!txList.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty-hint">尚無贊助紀錄。</td></tr>'; return; }
  tbody.innerHTML = txList.map(tx => {
    const date = tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString('zh-TW') : '—';
    return `<tr>
      <td>${date}</td>
      <td>${tx.milestoneTitle || tx.milestoneId || '—'}</td>
      <td>NT$ ${tx.amount || 0}</td>
      <td class="status-${tx.status}">${tx.status === 'success' ? '成功' : '處理中'}</td>
    </tr>`;
  }).join('');
}

async function initFanProfile() {
  onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = 'auth.html'; return; }

    // 1. 即時監聽 User Document (更新徽章、頭像、支援的 VTuber)
    onSnapshot(doc(db, 'users', user.uid), async (snap) => {
      if (snap.exists()) {
        const userDocData = snap.data();
        renderHero(user, userDocData);
        renderBadges(userDocData.badges || []);
        await renderSupportedVtubers(userDocData.supportedVtubers || []);
      }
    });

    // 2. 即時監聽 Transactions (贊助紀錄)
    const q = query(collection(db, 'transactions'), where('fanUid', '==', user.uid), orderBy('createdAt', 'desc'));
    onSnapshot(q, (snap) => {
      renderTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => {
      console.warn('無法讀取 transactions，可能缺少索引', e);
      renderTransactions([]);
    });
  });
}

initFanProfile();
```

---

### B-Task 4：Commit 並 push

```powershell
git add fan_profile.html fan_profile.css js/pages/fan-profile.page.js
git commit -m "feat: fan_profile UI - badges, supported vtubers, sponsorship history"
git push origin feat/fan-profile-ui
```

---

### B-Task 5：等 Person A 合完後合回 main

```powershell
# 確認 Person A 已 push 到 main 再執行
git checkout main
git pull
git checkout feat/fan-profile-ui
git merge main   # 若有衝突，請你的 AI 協助
git checkout main
git merge feat/fan-profile-ui
git push
```

---

## 緊急救援

| 問題 | 解法 |
|---|---|
| 改壞了，什麼都跑不動 | `git checkout .`（丟棄所有未 commit 修改） |
| 已 commit 想退回 | `git reset --hard HEAD~1` |
| 只恢復特定檔案 | `git checkout -- fan_profile.html` |
| 本地 emulator 跑不起來 | `npm run local:reset` |
| Java 找不到 | 安裝 https://adoptium.net/temurin/releases/?version=21 |
| auth/invalid-api-key | 確認 `.env` 的 `VITE_USE_EMULATOR=true`（本地）且用 `npm run dev` 啟動 |
| Firestore 索引錯誤 | 複製錯誤訊息中的連結，在 Firebase Console 建立索引 |

---

## 合作禁止事項

- ❌ 直接 push 到 main（一律用 feature branch）
- ❌ 修改自己負責範圍以外的檔案
- ❌ 在沒有本地測試通過的情況下 merge
- ❌ 把真實 `.env` / API Key commit 到 git

---

## 完成後的後續規劃

1. **資安強化**：Firestore Rules 加強 transactions 不可被粉絲自改 status
2. **Storage 上雲**：把 `storage.service.js` 的 local upload server 換成 Firebase Storage
3. **UI 進化**：fan_profile 加入徽章動畫、里程碑進度追蹤
4. **生成式 AI**：dashboard 加入 AI 生成里程碑文案功能

---

*計畫版本：2026-04-24 | Person A 先做，Person B 並行*
