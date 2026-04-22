## Plan: 里程碑與贊助功能完善

TL;DR - 我建議以本地 Emulator 為主要開發環境（可匯出/匯入資料以保留狀態），分三個短期階段（基礎上傳與模型、貼文與公開/限定邏輯、模擬贊助與即時更新），同時補上 E2E 自動化與測試資料 seed。這份計畫包含具體步驟、優先依賴、要修改/新增的關鍵檔案與驗收標準。

**Steps**
1. 基礎設置（環境、Storage、Model） *depends on: none*
   - 啟用 Storage emulator 並在 `firebase.json` / `js/firebase-config.js` 加入連線設定。
   - 新增 `js/services/storage.service.js`（上傳、進度回報、取得 downloadURL、檔案驗證）。
   - Firestore 模型擴充：`vtubers.{uid}.bannerUrl`、`milestones.{id}.badgeUrl`、`posts.{id}.attachments`。
   - 時間預估：0.5 - 1 天

2. 檔案上傳 UI（徽章、banner、貼文媒體） *parallel with step 3*
   - vtuber dashboard / 建站介面新增檔案上傳表單、預覽、驗證（大小/格式）。
   - 在公開頁面顯示上傳後的圖片（badge, banner）並優化載入（lazy, srcset if needed）。
   - 相關修改檔案：`vtuber_profile.html`、`dashboard.html`、`js/pages/vtuber-profile.page.js`、`js/services/vtuber.service.js`。
   - 時間預估：1 - 2 天

3. 貼文（限定貼文）與多人合作里程碑（UI 初版） *parallel with step 2*
   - 擴充 `posts` 文件：`{ attachments: [{type, url, storagePath}], visibility: 'public'|'supporters', allowedUids }`。
   - 在發佈介面加入上傳媒體的選項、以及 visibility 選擇（公開 / 贊助者限定）。
   - 多人合作：在建立里程碑時新增 `collaborators: [uid]` 欄位；臨時實作：搜尋欄回傳一位假合作對象（e.g. `VTuber Two`）作測試用。
   - 時間預估：1.5 - 2 天

4. 模擬贊助流程與即時更新（關鍵） *depends on 1-3*
   - 設計 `transactions` collection 或 `payments` 模型（字段：fanUid, vtuberId, milestoneId, amount, message, status, createdAt）。
   - 實作 client-side 模擬付款：`simulatePayment()` 會建立 transaction 並在一個 Firestore transaction 中更新 `milestones.{id}.currentAmount`、`milestones.{id}.totalSupporters` 以及排名資料（原子更新以保持一致性）。
   - 實作 onSnapshot 監聽 client-side（milestone progress + leaderboard + 解鎖限定貼文的權限變更），以呈現即時回饋。
   - 在 dashboard 回填贊助人名單、留言與金額，並於公開頁面自動解鎖對應的限定貼文。
   - 時間預估：2 - 3 天

5. 粉絲關係管理頁（顯示及排序/篩選）
   - 在 `dashboard.html` 的 CRM 分頁顯示 `transactions`（可依 vtuber、金額、日期排序/篩選），並新增快速搜尋/匯出按鈕，以支援贊助人管理與匯出報表。
   - 時間預估：1 天

6. Dashboard 小修（登出按鈕等）
   - 在 `dashboard.html` 增加 `Logout` 呼叫 `authService.logout()`，並在 navbar 顯示使用者資訊。
   - 時間預估：半天

7. 測試、自動化與資料 seed
   - 撰寫 E2E 測試（Cypress 建議）覆蓋：登入(多帳號)、上傳 badge/banner、建立里程碑（多人合作）、模擬贊助並驗證進度/排行榜/解鎖貼文。
   - 使用現有 `scripts/seed-auth-user.js` 與 `scripts/seed-user-doc.js` 批次 seed vtuber+fans+demo 里程碑資料。
   - 時間預估：2 - 3 天（含測試與修正）

8. 管理後台（建議遞延）
   - 建議暫緩完整管理後台實作，先把重心放在前述使用者互動流程與支付模擬上；同時設計簡單的 API 規格與權限模型供後續實作。
   - 時間預估（設計）：半天

**Relevant files**
- `js/firebase-config.js` — 連線 emulator / storage 設定
- `js/services/vtuber.service.js` — vtuber profile 更新/讀取
- `js/services/milestones.service.js` — 里程碑 CRUD 與聚合更新
- `js/services/posts.service.js` — 貼文、attachments
- `js/services/storage.service.js` (new) — 上傳/取得 URL/進度
- `js/pages/vtuber-profile.page.js` — 公開頁資料渲染
- `vtuber_profile.html`, `dashboard.html`, `fan_profile.html` — UI 改動
- `scripts/seed-auth-user.js`, `scripts/seed-user-doc.js` — 測試資料 seed

**Verification**
1. Manual checks
   - 啟動 emulator（Auth, Firestore, Storage）並匯入 seed data；以 `vupexplosion@gmail.com`、`vtuber1@example.test`、`vtuber2@example.test` 登入，確認：banner/badge 圖片正確顯示、建立里程碑可上傳 badge、發佈限定貼文後粉絲贊助可解鎖並立即在 UI 顯示。
2. Automated checks
   - Cypress tests: login → upload banner → create milestone (collab) → simulate donation → assert progress、leaderboard、restricted post visibility。
3. Data integrity
   - 使用 Firestore transaction 或 FieldValue.increment 保證數值更新一致；針對並行贊助進行壓力測試。

**Decisions / Recommendations**
- 環境：建議**繼續以 Emulator 為主要開發/測試環境**（原因：可完全本地模擬 Auth/Firestore/Storage/Functions，零成本並安全），並使用 `--export` / `--import` 保存狀態：
  - 啟動並保存： `npx -y firebase-tools@latest emulators:start --only auth,firestore,storage --export=./emulator-data`
  - 匯入啟動： `npx -y firebase-tools@latest emulators:start --only auth,firestore,storage --import=./emulator-data`
- 若要做整合測試，建議建立一個 **staging Firebase project**（和 production 分離），僅在整合測試或 UAT 時連回 staging。
- 真實付款：先用模擬流程（Firestore transaction + optional callable function stub）驗證流程與 UI，等流程穩定再接入真實支付（Stripe/PayPal）並在上線前做安全審查。

**Further Considerations**
1. Storage 安全規則與檔案掃毒（mime-type/副檔名/大小限制）
2. 優化圖片（自動縮圖、WebP、CDN）以降低延遲
3. Firestore 複合索引（按需建立）以支援 leaderboard 與查詢排序
4. 權限檢查：限定貼文必須在 Security Rules 與前端雙重檢查

---

*Plan saved to session memory.*