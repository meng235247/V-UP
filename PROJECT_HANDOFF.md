# V-UP! 專案交接文件 (Project Handoff)

這份文件記錄了 **V-UP! (VTuber 創作者專業後台與粉絲互動平台)** 截至目前的專案狀態、系統架構、已完成的工作項目以及未來的開發規劃。提供給新的 AI 助手或開發人員快速了解專案全貌。

---

## 1. 專案概述 (Project Overview)
**V-UP!** 是一個為 VTuber 及虛擬創作者量身打造的平台，採用**前後端分離**的架構運作。
重點目標包含：讓創作者（VTuber）能夠制定專屬的公開展示頁面、建立募資與互動的「里程碑 (Milestones)」；讓粉絲 (Fans) 能夠透過平台進行贊助、查看創作者限定的動態；並具備一個供平台管理員稽核的後台系統。

### 技術棧 (Tech Stack)
* **前端 (Frontend)**: 原生 HTML5, CSS3 (Vanilla), JavaScript (ES6+ Module)
* **後端與資料庫 (Backend & DB)**: Firebase (Authentication, Firestore Database, Firebase Hosting - 待建置)
* **建置工具 (Build Tool)**: Vite (透過環境變數管理 API Key)
* **架構模式**: 模組化服務 API (`js/services/*.service.js`)，將 Firebase 操作封裝，不讓 HTML 直接處理複雜邏輯。

---

## 2. 核心架構與頁面定義 (Architecture & Pages)
本專案有三種主要的用戶身分：`fan` (粉絲), `vtuber` (創作者), `admin` (管理員)。

* **`index.html`** - 平台首頁（首頁展示與入口）。
* **`auth.html` / `admin_login.html`** - 註冊與登入入口。會透過 `auth.service.js` 分發不同 Role 到對應後台。
* **`dashboard.html`** - VTuber 專屬後台。讓創作者修改個人資料、設定 Handle 專屬網址、建立里程碑及查看數據。
* **`vtuber_profile.html`** - 創作者的「對外公開頁面」。透過網址參數 `?id={handle}` 或是 `?id={uid}` 動態渲染不同創作者的資料。
* **`fan_profile.html`** - 粉絲專屬的錢包與個人設定區。
* **`admin_dashboard.html`** - 平台總管理員後台（包含 KYC 稽核、全站安控、金流日誌等）。

---

## 3. 已完成的工作 (What has been done)
在過去的開發階段中，我們主要進行了 **UI/UX 建置** 以及 **Firebase 基礎架構的P0/P1等級重構與防護**：

### 🎨 UI & 網頁邏輯
1. **主視覺定調**：從原本的單一色系更新為現代感強烈的「粉紅-粉藍」漸層設計，並優化了所有的按鈕、卡片、與 Modal 對話框。
2. **Dashboard 按鈕邏輯解耦**：後台的各項設定（個人資料、帳號密碼、銀行帳戶、通知偏好）已拆分為各獨立的 `save*()` 函數，避免互相覆蓋寫入。
3. **動態個人網址**：實作了創作者自訂「頻道識別碼 (Handle)」功能。網址可讀性從 `?id=Uxo...` 變成 `?id=sakuranova`。

### 🔒 Firebase 與安全性 (P0/P1 修復)
1. **認證邏輯化**：完全實裝 Firebase Authentication (包含使用者集合 `users/{uid}` 中記錄 `role`)。
2. **Handle 反查系統建立**：在 Firestore 建立 `handles/{handle}` 集合。當創作者在後台儲存 Handle 時，系統會自動比對並清除舊的 Handle 索引，以防止孤兒資料產生。
3. **環境變數加密**：成功將 `firebase-config.js` 的硬編碼轉換為透過 `.env` 的 `import.meta.env` 來讀取，並設定 `.gitignore` 以防止外洩。
4. **存取權限控管 (Security Rules)**：
   撰寫了嚴謹的 `firestore.rules`，規定 `vtuber_profiles` 只能由本人修改，但供所有人讀取；`handles` 開放全站邏輯讀寫等。
5. **管理員路由守衛**：為 `admin_dashboard.html` 實作了強制的 Auth Guard，若非 `admin` 強行進入會被踢回首頁。

---

## 4. 接下來要做什麼 (What's Next - Phase 2 & Beyond)
新開的對話請從**第二階段 (Phase 2)** 開始著手開發。

* **Phase 2: 里程碑系統 (Milestone System)**
  - 需要在 Firestore 中建置 `milestones` 集合。
  - 需要設計 `milestone.service.js` 來封裝 CRUD 邏輯。
  - **後台 (dashboard.html)**：實作 Milestone Modal 的建立功能；將死水的介面變成從 DB 渲染自己的列表。
  - **公開頁面 (vtuber_profile.html)**：根據 URL 傳遞的 UID，讀取並顯示該創作者的所有活躍與歷史里程碑進度條。

* **Phase 3: 粉絲互動與限定動態 (Posts & Interactions)**
  - 實施動態發布功能，並實作權限（只有已贊助該里程碑目標的粉絲可以解鎖隱藏內容）。

* **Phase 4: 金流串接與銀行帳戶 (Payments & Payouts)**
  - 開發虛擬點數經濟，整合綠界 (ECPay) 或 Line Pay Webhook。
  - 讓 `dashboard.html` 內的「銀行提款設定」擁有真正的 API 介接邏輯。

---

## 5. 注意事項與開發規範 (Guidelines & Precautions)

1. **架構穩定性**
   - 本專案採用「純前端與 Firebase 溝通」的做法。任何操作 Firestore 的邏輯 **必須** 寫在 `js/services/*.service.js` 裡面，HTML 檔案中透過 `<script type="module">` `import` 它們出來使用，保持乾淨的架構。
   
2. **Firebase Rules 安全**
   - 開發時若增添新的 Collection (如 `milestones`)，請務必記得在新功能驗證完畢後，同步更新 `firestore.rules`。
   
3. **UI 操作一致性**
   - 若要新增任何儲存按鈕，需複製現有邏輯：按下 `[儲存]` 按鈕後，要有 spinner 旋轉動畫並禁用按鈕，待 Async 執行結束再復原與顯示 Toast 通知，不可直接使用 blocking 的 `alert()` 破壞體驗。
   
4. **Handle 判斷邏輯**
   - 現在的 `vtuber_profile.html` 同時接受 Handle 查詢跟 UID fallback。在未來開發「點擊前往創作者頁面」的功能時，都應該優先使用創作者設定的 `handle` 組裝網址。

5. **環境變數提醒**
   - 本地測試請確認命令列執行 `npm run dev` 啟動 Vite 伺服器，否則 `import.meta.env` 無法作用。不要使用單純的 Live Server 啟動。

---

## 6. 本地 Emulator 與索引建議 (Local testing & Indexes)

若你在本機開發或驗證 Firestore 規則，建議使用 Firebase Emulator Suite：

- 啟動 Emulator（Firestore + Auth）:
```bash
npx -y firebase-tools@latest emulators:start --only firestore,auth
```

- 若要在單次執行中啟動 emulators 並執行測試腳本（例如 `scripts/test-firestore-rules.js`），可使用：
```bash
npx -y firebase-tools@latest emulators:exec "node scripts/test-firestore-rules.js" --only firestore,auth
```

- 本專案的 `js/firebase-config.js` 已加入 emulator 偵測：當網頁在 `localhost` 或 localStorage `useEmulator` 設為 `true` 時，會自動連到 `localhost:8080/9099`（或依 emulator 設定調整）。若 emulator 使用不同 port，請調整或在 localStorage 設定對應 host。

- **Composite index 建議**：在公開頁面我們使用類似的查詢：
   - where('vtuberId', '==', vtuberId) + where('status', 'in', [...]) + orderBy('publishedAt', 'desc')
   這類組合在正式 Firestore 環境可能需要建立複合索引。若在生產查詢時遇到 `FAILED_PRECONDITION` 或索引錯誤，請依錯誤訊息至 Firebase Console 建立以下索引（範例）：

   - Fields: `vtuberId` (Ascending), `status` (Ascending), `publishedAt` (Descending)

   Firebase Console 會在錯誤訊息中提供建立索引的建議，複製該建議來建立即可。

以上為本地測試與部署前需注意的重點，若要我為你自動生成 `firestore.indexes.json` 範本，我可以基於目前的查詢自動產出一個初始檔案供上傳到 Console 或 `firebase deploy --only firestore:indexes`。

---

> **給新 AI 助手的提示**：閱讀完此份文件後，可直接透過 `view_file` 檢視 `dashboard.html` 與 `vtuber.service.js` 了解現有代碼風格，並向用戶詢問是否立刻開始進行 **Phase 2 (Milestone System)** 的開發準備。
