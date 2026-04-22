# V-UP 專案協同開發補充說明

本文件補充本聊天室的工作內容，並針對協同開發 AI（或新進工程師）說明近期重點任務與注意事項。

---

## 近期重點任務

### 1. 多人合作里程碑（UI 初版）
- 目標：讓 vtuber 可在建立/編輯里程碑時，指定多位協作者（collaborators），並於 UI 顯示。
- 需求：
  - Firestore `milestones` 文件需新增 `collaborators: [uid]` 欄位。
  - UI 需有協作者搜尋/選擇（初版可用假資料）。
  - 里程碑列表與詳情頁需顯示所有協作者。
  - 權限檢查：僅協作者可編輯該里程碑。
- 相關檔案：
  - `dashboard.html`, `js/pages/vtuber-profile.page.js`, `js/services/milestones.service.js`

### 2. CRM 修正
- 目標：優化粉絲關係管理（CRM）頁，提升贊助人管理與查詢效率。
- 需求：
  - `dashboard.html` CRM 分頁顯示所有 `transactions`，可依 vtuber、金額、日期排序/篩選。
  - 新增快速搜尋、匯出報表功能。
  - UI/UX 優化（如 loading 狀態、空資料提示）。
- 相關檔案：
  - `dashboard.html`, `js/services/payment.service.js`

---

## 本聊天室工作內容摘要

- 已完成：
  - 本地 Emulator 啟動、測試帳號建立、Firestore 規則修正、上傳伺服器配置與測試。
  - 前端 .env 設定、測試腳本撰寫。
- 進行中：
  - 等待 UI/功能測試回饋。
- 建議：
  - 持續以 Emulator 為主，並善用 seed script 匯入測試資料。
  - 重要規則、流程請同步更新於 `plan.md`。

---

## 交接注意事項

- 重要規則、流程、資料結構請詳見 `plan.md`。
- 若有新功能/修正，請於 PR/commit message 註明對應任務（如「多人合作里程碑」、「CRM 修正」）。
- 測試帳號、seed script、emulator 啟動指令請見 README 或 `plan.md`。
- 若遇 emulator 或權限問題，優先檢查 `.env`、`firestore.rules`、seed 資料。

---

*本文件由 AI 協助產生，請依實際需求補充/修正。*