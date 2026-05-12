# Demo 版本交接文件（2026-05-13）

## 1) 本次聊天室已完成內容（可直接沿用）

### A. Demo 基礎架構
- 新增 [css/demo.css](/D:/code/vup/V-UP/css/demo.css)：Demo banner、Email Gate、完成彈窗、引導氣泡樣式。
- 新增 [js/demo/demo-sandbox.js](/D:/code/vup/V-UP/js/demo/demo-sandbox.js)：
  - 建立 fan / creator demo 模式偵測。
  - 以 `localStorage` 保存 demo 狀態（點數、交易、里程碑、貼文、創作者資料）。
  - Demo 付款流程（不寫入 Firebase）。
  - Creator demo 的 local upload（`FileReader -> dataURL`）。
  - 提供 `creator-preview` 公開頁預覽模式。
- 新增 [js/demo/demo-guide.js](/D:/code/vup/V-UP/js/demo/demo-guide.js)：
  - 引導氣泡流程控制（可指定 target、等待事件、延遲、auto scroll）。

### B. Creator Demo（Dashboard）
- 修改 [dashboard.html](/D:/code/vup/V-UP/dashboard.html)：
  - 支援 `?mode=demo` 免登入進入 Dashboard（僅 demo）。
  - Email Gate 允許跳過（但仍保留填寫視覺強調）。
  - 公開頁按鈕在 demo 下改為：
    - `vtuber_profile.html?id=demo_creator_local&mode=creator-preview`
  - 掛上 creator demo 引導流程。

### C. Fan Demo（VTuber 公開頁）
- 修改 [vtuber_profile.html](/D:/code/vup/V-UP/vtuber_profile.html)：
  - 載入 demo sandbox + demo guide。
  - fan demo 付款後觸發 `vup:demo-payment-completed` 事件，更新進度條。
  - demo 下付款預設金額會優先補到里程碑差額，較容易觸發達標動畫。
  - 打賞後 completion modal（表單按鈕保留占位，開新分頁）。
  - 引導流程加入 `waitForEvent`、`waitAfterEventMs`，避免打賞動畫未完成就跳下一步。

### D. 正式版相容修正
- 修改 [js/pages/vtuber-profile.page.js](/D:/code/vup/V-UP/js/pages/vtuber-profile.page.js)：
  - active 卡片區排除 `archived` 里程碑。
  - `archived` 只在過往紀錄（achieved/history 區）顯示。
  - 在 demo fan 無 Firebase auth 時，排行榜可顯示 demo 使用者區塊。

---

## 2) 目前工作區狀態（尚未收斂）

`git status --short`：

- `M dashboard.html`
- `M js/pages/vtuber-profile.page.js`
- `M vtuber_profile.html`
- `?? css/`
- `?? js/demo/`

建議交接者先開新 branch 再處理最後修正與測試。

---

## 3) 尚未完成 / 需優先修正事項（依優先順序）

## P0（先做）
1. 修正 fan demo 排行榜「我的打賞金額」計算
- 檔案：[js/demo/demo-sandbox.js](/D:/code/vup/V-UP/js/demo/demo-sandbox.js)
- 問題點：`listenRankings` callback 目前 `myAmount` 傳的是第一名金額（`ranks[0]`），不是 demo 使用者自己的累積金額。
- 影響：排行榜下方「你已打賞」顯示錯誤。
- 建議：改為用 `demo_fan_local` 對應 key 計算 `myAmount` 後再傳 callback。

2. 確認 fan demo 達標後「限定內容解鎖」有可見結果
- 檔案：
  - [vtuber_profile.html](/D:/code/vup/V-UP/vtuber_profile.html)
  - [js/pages/vtuber-profile.page.js](/D:/code/vup/V-UP/js/pages/vtuber-profile.page.js)
  - [js/demo/demo-sandbox.js](/D:/code/vup/V-UP/js/demo/demo-sandbox.js)
- 現況：已有 `_viewerUnlockedMilestones` push，但若該 milestone 沒有 published posts，使用者感知可能仍像「沒解鎖」。
- 建議方向（二擇一）：
  - A. demo 模式補一筆本地示範 post（不碰 Firebase）。
  - B. 若已解鎖但無貼文，顯示「已解鎖（Demo 無更多內容）」的明確 UI。

## P1（次要但要補）
3. Creator demo 里程碑 badge 圖片上傳 end-to-end 驗證
- 檔案：
  - [dashboard.html](/D:/code/vup/V-UP/dashboard.html)
  - [js/demo/demo-sandbox.js](/D:/code/vup/V-UP/js/demo/demo-sandbox.js)
- 現況：已將 upload 改為 dataURL 並在 create/update 寫入 `badgeUrl`，但尚未完整驗證「建立/編輯/發布後公開頁顯示」。
- 驗證步驟見第 5 節。

4. 新增 fan 個人頁 demo 模式（需求已提）
- 檔案： [js/pages/fan-profile.page.js](/D:/code/vup/V-UP/js/pages/fan-profile.page.js)
- 現況：目前此頁強依賴 Firebase auth，未登入會導 `auth.html`。
- 需求：`fan_profile.html?mode=demo` 下使用本地 mock 資料，不影響正式版、不中 Firebase。
- 建議最小實作：
  - 加 `isFanProfileDemoMode()` 判斷。
  - demo 模式下略過 `onAuthStateChanged` redirect。
  - 用 localStorage mock：使用者資訊、支持紀錄、徽章、稱號、最近交易。
  - 復用現有 render 函式，避免 fork 一套 UI。

---

## 4) 使用者已確認的需求決策（實作時請遵守）

1. Creator demo 可 `?mode=demo` 完全免登入（但僅限 demo 版）。
2. Demo 資料以本地保存優先（不需我們提供雲端儲存）。
3. 表單按鈕需開新分頁。
4. GA4 優先使用 `gtag`（目前 demo sandbox 也是走 `window.gtag('event', ...)`）。
5. RWD 驗收斷點：`390 / 768 / 1024 / 1440`。
6. 暫時不要重置按鈕。
7. 首頁入口暫不改，等 demo 完成後再手動替換（由 PM/你手動處理）。
8. 正式版不受 demo 影響是最高優先。

---

## 5) 建議驗收流程（交接同伴照這份跑）

1. 啟動專案後測 Creator Demo
- URL：`dashboard.html?mode=demo`
- 檢查：
  - 可免登入進入。
  - Email Gate 可填可跳。
  - 建立里程碑可上傳 badge 圖，發布後仍顯示。
  - 「查看公開頁」導向 `mode=creator-preview`。

2. 測 Fan Demo（本地 seed）
- URL：`vtuber_profile.html?id=demo&mode=fan`
- 檢查：
  - 引導氣泡會對到目標元件，必要時會自動捲動。
  - 打賞後有達標動畫（若達標）。
  - 打賞後可看見「已解鎖」效果或清楚提示。
  - 排行榜可看到 demo 使用者（名稱與頭貼），且金額是「自己累積」。

3. 測 Fan Demo（讀 Firebase 指定 VTuber）
- URL：`vtuber_profile.html?id=ryusei&mode=fan`
- 期待：
  - 頁面資料讀 ryusei（Firebase）。
  - demo 打賞不寫入 Firebase（只影響本地 demo 事件與狀態）。

4. 測正式版回歸
- URL：正式 `vtuber_profile.html?id=<real-handle>`
- 檢查：
  - `archived` 不會再出現在 active 里程碑卡片。
  - `archived` 只在過往紀錄區。

5. 若已完成 fan 個人頁 demo
- URL：`fan_profile.html?mode=demo`
- 檢查：
  - 未登入可進入。
  - 所有資料由本地 mock 顯示。
  - 不觸發 Firebase 寫入。

---

## 6) 技術注意事項 / 風險

1. 專案部分檔案已有編碼亂碼（非本次新增）；請避免大規模改文案，優先只改功能邏輯。
2. [js/pages/vtuber-profile.page.js](/D:/code/vup/V-UP/js/pages/vtuber-profile.page.js) 內有既有模板字串亂碼與個別 `alt` 字串異常，修時要小心不要擴大影響範圍。
3. Demo 與正式共用頁面，所有 demo 邏輯務必以 `mode` 條件包住。
4. 若要補事件追蹤，統一透過 `trackDemoEvent()`，避免分散呼叫。

---

## 7) 建議交接者的執行順序（可直接照做）

1. 先修 P0-1（排行榜 myAmount）。
2. 再修 P0-2（解鎖可見性）。
3. 驗證 Creator badge 上傳閉環（P1-3）。
4. 補 fan_profile demo（P1-4）。
5. 跑一次 build，並做第 5 節全流程驗收。
6. 最後整理變更說明與風險，交回主線整合。

