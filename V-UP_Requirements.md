# V-UP 專案需求文件（AI 交接用）

> **用途**：提供給 AI 助理的完整需求紀錄，包含已確認的架構決策、資料庫 Schema 與實作規劃。
> **現況**：前端 HTML/CSS/JS 已完成，目前正進行前後端分離架構重構，目標整合 Firebase 後端。

---

## 一、專案背景

### 技術棧
- **前端**：純 HTML + Vanilla CSS + Vanilla JavaScript（無前端框架）
- **目標後端**：Firebase（Firestore 資料庫 + Firebase Auth 認證）
- **部署目標**：Firebase Hosting（Static Site）

### 現有檔案
```
V-UP/
├── index.html               ← 平台首頁（VTuber 探索頁）
├── vtuber_profile.html      ← VTuber 個人頁（目前硬寫 Sakura Nova 資料）
├── fan_profile.html         ← 粉絲個人頁
├── dashboard.html           ← VTuber 創作者後台
├── admin_dashboard.html     ← 平台管理後台
├── auth.html                ← 登入/註冊頁
├── styles.css               ← 全站共用樣式
├── vtuber_profile.css       ← VTuber 頁專用樣式（含 modal CSS）
├── fan_profile.css
├── dashboard.css
├── app.js                   ← 待重寫（目前為殭屍代碼）
└── js/                      ← 待建立的模組化 JS 資料夾
    ├── firebase-config.js
    ├── data/seed-data.js
    ├── services/
    └── pages/
```

### 設計風格（重要：禁止更動）
- 粉藍色主題（`--vt-pink-dark`, `--vt-blue`）
- Glassmorphism 效果
- 所有 CSS 樣式、動畫、視覺效果**必須完全保持不變**

---

## 二、核心需求

### 2-1. 整體架構目標
將現有的「資料全寫死在 HTML 裡」的架構，重構為前後端分離：
- 前端負責 UI 渲染（樣式不變）
- 後端由 Firebase（Firestore + Auth）提供資料
- 中間由 `js/services/` 服務層隔離，方便未來擴充

### 2-2. Demo 展示模式
- URL：`vtuber_profile.html?id=demo`
- 使用本地靜態資料（`js/data/seed-data.js`），不需要 Firebase 連線即可運作
- 以 Sakura Nova 的完整資料作為 Demo 內容（2 張進行中里程碑 + 3 張已歸檔）
- 可選：在頁面頂部顯示一個提示條「🎭 Demo 展示模式」

### 2-3. 路由設計
- `vtuber_profile.html?id=sakura_nova` → 從 Firestore 載入指定 VTuber
- `vtuber_profile.html?id=demo` → 使用靜態 seed data，不動 Firebase

---

## 三、Firestore 資料庫 Schema

### Collection: `vtubers`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | String | 唯一識別碼（如 `sakura_nova`），同時作為 URL `?id=` 的值 |
| `name` | String | 顯示名稱（如 `SAKURA NOVA`） |
| `subtitle` | String | 標語（如 `一起創造下個舞台`） |
| `bio` | String | 個人簡介文字 |
| `avatarUrl` | String | 大頭照路徑（Firebase Storage） |
| `bannerUrl` | String | 頁面頂部橫幅圖片路徑 |
| `socialLinks` | Map | `{ youtube: "url", twitter: "url", instagram: "url" }` |
| `tags` | Array | 標籤列表，如 `["Singer", "3D", "Idol"]` |
| `themeColor` | String | 主題色 Hex（如 `#ec4899`） |
| `createdAt` | Timestamp | 建立時間 |

---

### Collection: `milestones`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | String | 唯一識別碼（如 `ms_3d_stage`） |
| `vtuberId` | String | 外鍵，關聯的 VTuber |
| `title` | String | 里程碑標題 |
| `description` | String | 詳細描述 |
| `status` | String | `"active"` / `"achieved"` / `"archived"`（見下方三態說明） |
| `targetAmount` | Number | 目標金額（NTD） |
| `currentAmount` | Number | 目前累計金額（每筆交易後更新） |
| `totalSupporters` | Number | 不重複的贊助人數 |
| `badgeImageUrl` | String | 達成後粉絲獲得的徽章圖片 |
| `badgeTitle` | String | 達成後粉絲獲得的稱號（如 `金星贊助者`） |
| `isCollab` | Boolean | 是否為聯動企劃 |
| `collaborators` | Array | 僅 `isCollab=true` 時有值：`[{ name: "A", avatarUrl: "url" }, { name: "B", avatarUrl: "url" }]` |
| `achievedAt` | Timestamp | 達成 100% 的時間（active 時為 null） |
| `archivedAt` | Timestamp | 進入歸檔的時間（active/achieved 時為 null） |
| `createdAt` | Timestamp | 企劃建立時間 |

> **[計算欄位，不存入 DB]** 達成百分比：前端即時計算 `Math.floor(currentAmount / targetAmount * 100)`

#### Milestone 三態邏輯

```
status = "active"
  → 顯示為 ms-card（進度條 + Top 5 排行 + 贊助按鈕）

status = "achieved"（剛達成 100%）
  → 仍顯示在進行中區塊，ms-card 改為達成樣式
  ├─ 當下有其他 active ms → 維持 7 天後自動轉 archived
  └─ 當下無其他 active ms → 保留至有新的 ms 出現才轉 archived

status = "archived"（已歸檔）
  → 從 ms-card 區移除
  → 在 Achieved Grid 顯示為 achieved-card + timeline-marker
  → 點擊開啟 Review Modal（含 Top 10 排行、達成時間、贊助總人數、個人稱號）
```

| `status` | 顯示 UI 元件 | 排行榜 | 點擊行為 | 新增資料 |
|----------|------------|--------|---------|---------|
| `active` | `ms-card`（進度條） | Top 5 | 開啟 Payment Modal | — |
| `achieved` | `ms-card`（達成樣式） | Top 5 | 開啟 Payment Modal | — |
| `archived` | `achieved-card` + `timeline-marker` | Top 10（Review Modal 內） | 開啟 Review Modal | `achievedAt`、`totalSupporters`、`rmc-my-title-badge` |

---

### Sub-collection: `milestones/{milestoneId}/rankings`

文件 ID = fanUid

| 欄位 | 型別 | 說明 |
|------|------|------|
| `displayName` | String | 快照：粉絲名稱 |
| `avatarUrl` | String | 快照：粉絲頭像 |
| `totalAmount` | Number | 此里程碑的累計贊助金額 |
| `lastUpdatedAt` | Timestamp | 最後贊助時間 |

- **Active 顯示**：`orderBy("totalAmount", "desc").limit(5)` → Top 5
- **Review Modal**：`orderBy("totalAmount", "desc").limit(10)` → Top 10

---

### Sub-collection: `milestones/{milestoneId}/posts`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | String | 自動生成 |
| `title` | String | 帖子標題 |
| `content` | String | 帖子內文 |
| `mediaType` | String | `"image"` / `"audio"` / `"video"` / `"none"` |
| `mediaUrl` | String | 影片或音訊路徑 |
| `imageUrl` | String | 圖片路徑 |
| `isExclusive` | Boolean | 是否為贊助者限定（未解鎖用戶無法查看）|
| `createdAt` | Timestamp | 發布時間（前端轉為「n 天前」） |

---

### Collection: `fans`

文件 ID = Firebase Auth UID

| 欄位 | 型別 | 說明 |
|------|------|------|
| `uid` | String | 與 Firebase Auth UID 相同 |
| `displayName` | String | 顯示名稱 |
| `tagline` | String | 個人標語 |
| `avatarUrl` | String | 大頭照路徑 |
| `themeSettings` | Map | `{ primaryColor: "#hex", secondaryColor: "#hex" }` |
| `unlockedMilestones` | Array | 已付費解鎖的 milestoneId 列表 |
| `badges` | Array | `[{ badgeId, badgeImageUrl, earnedAt, isDisplayed }]` |
| `titles` | Array | `[{ titleText, milestoneId, earnedAt, isDisplayed }]` |
| `isPublic` | Boolean | 個人頁面是否公開 |
| `googleEmail` | String | 綁定的 Google 帳號 |
| `createdAt` | Timestamp | 建立時間 |

> **解鎖判斷**：頁面載入時比對 `unlockedMilestones` 與該頁 milestoneId，決定是否移除 `locked` CSS class。

---

### Collection: `transactions`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | String | 自動生成的交易流水號 |
| `fanUid` | String | 贊助者 UID |
| `fanDisplayName` | String | 快照：贊助當下的名稱 |
| `fanAvatarUrl` | String | 快照：贊助當下的頭像 |
| `milestoneId` | String | 贊助的里程碑 |
| `vtuberId` | String | 對應的 VTuber ID |
| `amount` | Number | 金額（NTD） |
| `message` | String | 用戶輸入的「想對 V 說的話」（顯示在 VTuber Dashboard 留言牆） |
| `paymentMethod` | String | `"credit"` / `"linepay"` / `"atm"` / `"cvs"` |
| `status` | String | `"pending"` / `"success"` / `"failed"` |
| `createdAt` | Timestamp | 交易時間 |

**Payment Modal UI 規則**：
- 已登入 → 顯示用戶頭像 + 名稱
- 未登入 → 隱藏金額輸入，顯示「推薦註冊」按鈕，點擊跳轉 `auth.html`
- `message` 填寫後，成功付費的訊息會出現在 VTuber Dashboard 的「最新贊助留言牆」

---

### Collection: `platform`（單一文件 `cms`）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `announcementText` | String | 跑馬燈文字 |
| `announcementEnabled` | Boolean | 是否顯示公告欄 |
| `heroTitle` | String | 首頁 Hero 大標題 |
| `heroSubtitle` | String | 首頁 Hero 副標題 |
| `updatedAt` | Timestamp | 最後更新時間 |

---

## 四、目標檔案結構

```
V-UP/
└── js/
    ├── firebase-config.js          ← Firebase 初始化（config 由使用者填入）
    ├── data/
    │   └── seed-data.js            ← Sakura Nova Demo 完整靜態資料
    ├── services/
    │   ├── auth.service.js         ← signIn / signOut / onAuthStateChanged
    │   ├── vtubers.service.js      ← getVtuber(id), listVtubers()
    │   ├── milestones.service.js   ← getMilestones(vtuberId), getRankings(id, limit)
    │   ├── posts.service.js        ← getPosts(milestoneId), createPost()
    │   ├── fans.service.js         ← getFanProfile(uid), updateFanProfile()
    │   └── payment.service.js      ← 接口定義，Phase 4 才實作
    └── pages/
        ├── vtuber-profile.page.js  ← vtuber_profile.html 的控制器
        ├── fan-profile.page.js     ← fan_profile.html 的控制器
        ├── dashboard.page.js       ← dashboard.html 的控制器
        └── index.page.js           ← index.html 的控制器
```

---

## 五、實作執行計畫

### Phase 1：基礎架構（不影響任何 UI）
1. 建立 `js/` 目錄結構（services、pages、data）
2. 建立所有 Service / Page Controller 空白骨架
3. 建立 `js/firebase-config.js` 骨架（config 待填入）
4. 將 `vtuber_profile.html` 內 L657–L1670 的 `<style>` 移入 `vtuber_profile.css`（目前 HTML 內仍殘留，需清理）
5. 重寫 `app.js`（原本參照不存在的 DOM 元素，全部清除）

### Phase 2：Auth 整合 + Demo Mode
1. 撰寫 `js/data/seed-data.js`（2 張 active + 3 張 archived 的 Sakura Nova 完整資料）
2. 實作 `?id=demo` 路由解析邏輯（seed data fallback，不需 Firebase）
3. `auth.html` 接入 Firebase Google Sign-In
4. `dashboard.html` 加 Auth Route Guard（未登入跳轉 `auth.html`）
5. `fan_profile.html` Auth 整合（真實 Firebase Auth 取代假的 `isLoggedIn: true`）

### Phase 3：Firestore 動態資料
1. 實作 `milestones.service.js`（三態查詢、7天規則、ranking Top 5/10）
2. 實作 `vtubers.service.js`
3. `vtuber-profile.page.js` 動態生成 ms-card / achieved-card HTML
4. `index.html` VTuber grid 動態化
5. Announcement Bar 從 `/platform/cms` 讀取

### Phase 4（金流，架構預留，不實作）
- `payment.service.js` 只定義接口：`initiate(milestoneId, amount, method, message)`、`getStatus(txId)`
- 現有的 `simulatePaymentAPI()` 保持模擬邏輯（console.log + alert），等 Phase 4 才替換

---

## 六、重要限制與注意事項

1. **UI 樣式鐵則**：任何重構都不能改變視覺外觀、動畫效果、色彩。只換資料，不換外殼。
2. **Milestone 達成 % 數**：不需要獨立的 DB 欄位，前端即時計算 `currentAmount / targetAmount * 100`。
3. **排行榜快照設計**：`rankings` 子集合使用「快照」存放 `displayName` 和 `avatarUrl`，避免每次讀取都需要 JOIN `fans` 集合。
4. **`app.js` 現況**：原始 `app.js` 的所有代碼都參照不存在的 DOM 元素（殭屍代碼），需要완전히 重寫。
5. **金流**：目前金流串接廠商尚未選定（候選：綠界 ECPay、LINE Pay、Stripe），所以 Phase 4 只建立接口架構，不實作。
6. **徽章/稱號等級門檻**：具體金額門檻（如 > 5000 NTD = 金星）尚未確認，待 Phase 3 實作 `fans.service.js` 時一起決定。

---

## 七、待確認事項（尚未決定）

- [ ] Firebase 專案建立（需使用者操作 Firebase Console，提供 config）
- [ ] 徽章稱號等級的具體金額門檻
- [ ] Dashboard 「最新贊助留言牆」的 UI 設計樣式
- [ ] 金流廠商選擇（影響 Phase 4 實作）
