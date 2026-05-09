# V-UP! 驗證衝刺 — 最終統合計畫書
> 版本：1.1 | 日期：2026-05-09 | 狀態：施工中 | ✅ Netlify 部署已完成

---

## ⚡ 先回答關鍵技術問題：VTuber 要不要開放登入？

### 問題分析

| 情境 | 優點 | 缺點 |
|------|------|------|
| **全部不保存（純 localStorage）** | 零 Firebase 消耗、開發最快、不用管帳號 | VTuber 無法「分享自己的頁面給粉絲看」 |
| **VTuber 開放登入 + 保存** | 可分享真實連結、更有說服力 | 耗 Firebase 配額、需處理帳號安全、開發複雜度倍增 |

### 📌 建議結論：**驗證階段 — 統一不保存，但給 VTuber「假分享連結」**

**理由：**
1. Firebase Spark 方案：Firestore 每日讀取 50,000 次、Hosting 1GB — 驗證期流量小，但**一旦讓創作者真正登入並分享，粉絲湧入讀取可能超過免費額度**
2. 驗證目標是「証明概念有市場」，不是「讓功能真正運作」
3. **最聰明的做法**：VTuber 體驗後台時，給一個**預建好的靜態 Demo 粉絲頁連結**（`vtuber_profile.html?id=demo&vtuber=baifu`），這個連結他們可以分享給朋友體驗，但資料是硬編碼的 seed data，不是他們真正輸入的內容

**結果：**
- VTuber 填的里程碑資料 → 關閉瀏覽器就消失（localStorage），**符合你的預期**
- 但他們能分享一個「看起來真實的粉絲頁」給朋友 → **達到驗證目的**
- Firebase 零消耗 ✅

> 如未來驗證通過，正式版才開放登入 + 真實儲存 + 真實分享連結

---

## 一、 全局任務總覽

### 四大工作包

| 工作包 | 主責 | 預估工時 |
|--------|------|----------|
| **A. Index 重構（文案 + 新 Sections）** | **你** | 6-8h |
| **B. Demo 沙盒系統（粉絲 + 創作者）** | **你** | 8-10h |
| **C. UI/UX 改善** | **組員** | 6-8h |
| **D. GA4 開通 + 表單建立** | **共同（各30min）** | 1h |

---

## 二、 分工詳細計畫

---

### 工作包 A：Index 重構（你負責）

> 參考：`index_content_redesign_plan.md` 的完整文案規劃

#### A1. 新增「痛點比較」Section（P0）
**檔案**：`index.html`
**位置**：插入在 Hero 與 Why V-UP 之間

```html
<!-- 新增 Section：痛點比較 -->
<section class="compare-section" id="compare">
  <div class="container">
    <h2>你知道嗎？你在 YouTube 丟的 1000 元，她只拿到 700 元</h2>
    <!-- 對比表格 + 結語 -->
  </div>
</section>
```

#### A2. How It Works 加入金流支付說明（P0）
**檔案**：`index.html` — `#how` section 粉絲 Step 2
- 加入：「LINE Pay / 信用卡 / 超商，秒付完」的圖示說明
- 加入小字：「正式上線支援多元支付，試玩版使用 V點模擬」

#### A3. VTuber 卡片補齊（P0）
**檔案**：`index.html` — `.vtuber-grid`
- **川雲爪日**：補充故事引言、更新里程碑描述
- **拜風**：補頭像 placeholder、設定里程碑文案、進度條改為 5%（非 0%）、加故事引言

#### A4. 新增「金流 FAQ」Section（P1）
**檔案**：`index.html`
**位置**：插入在 Demo CTA 之前

#### A5. Why V-UP 文案改寫（P1）
**檔案**：`index.html` — `#why` section
- 從「功能列表」改為「身份認同」語氣（參考 `index_content_redesign_plan.md` 第五節）

---

### 工作包 B：Demo 沙盒系統（你負責）

#### B1. 核心沙盒模組（P0，最先做）
**新增檔案**：`js/demo/demo-sandbox.js`

```javascript
// demo-sandbox.js — 所有 Demo 邏輯的核心

const DemoSandbox = {
  DEMO_POINTS_KEY: 'vup_demo_points',
  DEMO_ROLE_KEY: 'vup_demo_role',
  INITIAL_POINTS: 500,

  // 初始化（從 URL 讀取 mode 參數）
  init() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode'); // 'fan' | 'creator'
    if (!mode) return;
    
    if (!localStorage.getItem(this.DEMO_POINTS_KEY)) {
      localStorage.setItem(this.DEMO_POINTS_KEY, this.INITIAL_POINTS);
    }
    localStorage.setItem(this.DEMO_ROLE_KEY, mode);
    this.injectDemoBanner(mode);
    this.patchPaymentService(); // 攔截真實付款
  },

  // 注入頂部 Demo 工具列
  injectDemoBanner(role) {
    const points = localStorage.getItem(this.DEMO_POINTS_KEY);
    const banner = document.createElement('div');
    banner.id = 'demo-banner';
    banner.innerHTML = `
      <span>🎮 試玩模式</span>
      <span id="demo-points-display">V點：<strong>${points}</strong></span>
      <span>無需帳號 · 無需真實付款</span>`;
    document.body.prepend(banner);
  },

  // 攔截 payment.service.js 的付款行為
  patchPaymentService() {
    window.__DEMO_MODE__ = true; // payment.service.js 讀這個旗標
  },

  // 模擬扣點（供 Payment Modal 呼叫）
  deductPoints(amount) {
    const current = parseInt(localStorage.getItem(this.DEMO_POINTS_KEY));
    const next = Math.max(0, current - amount);
    localStorage.setItem(this.DEMO_POINTS_KEY, next);
    document.getElementById('demo-points-display').innerHTML =
      `V點：<strong>${next}</strong>`;
    return next;
  },

  // 顯示完成 Toast
  showCompletionModal(role) {
    const FORM_URL_FAN = 'https://forms.gle/YOUR_FAN_FORM_URL';
    const FORM_URL_CREATOR = 'https://forms.gle/YOUR_CREATOR_FORM_URL';
    const url = role === 'creator' ? FORM_URL_CREATOR : FORM_URL_FAN;
    // 注入 Modal HTML...
    gtag('event', 'demo_completed', { role });
  }
};

DemoSandbox.init();
```

**修改檔案**：`js/services/payment.service.js`
- 在付款函式最頂部加：
```javascript
// Demo Mode 攔截
if (window.__DEMO_MODE__) {
  DemoSandbox.deductPoints(amount);
  // 觸發進度條動畫
  triggerProgressAnimation(amount);
  return Promise.resolve({ success: true, demo: true });
}
```

#### B2. Email Gate Modal（P0）
**新增檔案**：`js/demo/email-gate.js`
- 觸發時機：`index.html` 「我是 VTuber」按鈕 `onclick`
- 表單填寫後：隱藏提交至 Google Form → 跳轉 `dashboard.html?mode=creator`
- 「先跳過」按鈕：直接跳轉（記錄 `gtag` 事件）

#### B3. 引導 Tooltip 系統（P1）
**新增檔案**：`js/demo/demo-guide.js`
- 粉絲版腳本（5步）引入 `vtuber_profile.html`
- 創作者版腳本（5步）引入 `dashboard.html`
- 詳細實作見 `demo_build_plan.md` 第四節

#### B4. Demo CSS（P0）
**新增檔案**：`css/demo.css`
```css
#demo-banner {
  position: sticky; top: 0; z-index: 9999;
  background: linear-gradient(90deg, #1e1b4b, #312e81);
  color: white; padding: 8px 20px;
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.87rem; font-weight: 600;
}
.demo-highlight { 
  outline: 3px solid #f472b6; 
  border-radius: 8px; 
  animation: pulse-highlight 1.5s infinite;
}
@keyframes pulse-highlight {
  0%, 100% { outline-color: #f472b6; }
  50% { outline-color: #70ddf1; }
}
/* Tooltip 樣式... */
```

---

### 工作包 C：UI/UX 改善（組員負責）

> Netlify 部署已完成 ✅，以下為剩餘 UI/UX 任務

| 任務 | 具體內容 | 你的參與度 |
|------|----------|------------|
| **C1. RWD 修正** | 確保所有頁面在手機版正常顯示 | 無需參與 |
| **C2. 動畫優化** | 進度條跳動、撒花粒子效果優化 | 可協助提供 CSS 片段 |
| **C3. 深色模式一致性** | 確保 `data-theme="dark"` 下所有新 Section 正常 | 無需參與 |
| **C4. 各頁 `<head>` 加 GA4 snippet** | 三個頁面都加上 gtag.js（等 G-ID 到手） | 無需參與 |

> **注意**：C4 依賴 D1（GA4 帳號）的 Measurement ID，需等 D1 完成後才能做

---

### 工作包 D：GA4 + 表單（共同，各30分鐘）

#### D1. GA4 帳號建立（組員做，5分鐘）
1. 前往 [analytics.google.com](https://analytics.google.com)
2. 建立 Property → 選「網站」→ 填入 Netlify 網址
3. 取得 `G-XXXXXXXXXX` Measurement ID
4. 把這個 ID 告訴你 → 你填入 `demo-sandbox.js` 的 gtag config

#### D2. Google Form 建立（組員做，30分鐘）
- **表單A（粉絲版）**：5個問題（見 `demo_build_plan.md` 第六節）
- **表單B（創作者版）**：6個問題 + Email 欄位
- 取得兩個短網址 → 你填入 `demo-sandbox.js` 的 `FORM_URL_*` 常數

> **「較晚才做」策略**：先用 `#` placeholder 佔位，讓 Demo 流程可以跑通，等組員表單完成後再替換 URL，只需改兩個字串常數。

---

## 三、 施工順序甘特圖

```
Day 1（今天）
  你：
    ├── B4 demo.css 骨架       (30min)
    ├── B1 demo-sandbox.js     (2h)  ← 最優先！
    └── B2 email-gate.js       (1.5h)
  
  組員：
    ├── D1 開 GA4 帳號         (10min)  ← Netlify 已完成，這是現在最優先
    └── D2 建立兩份 Google Form (30min)

Day 2
  你：
    ├── A3 兩個 VTuber 卡片補齊 (1h)
    ├── A1 新增痛點比較 Section (1.5h)
    └── A2 How It Works 加支付說明 (30min)
  
  組員：
    ├── C1 全站 RWD 修正
    └── C5 各頁加 GA4 snippet（拿到 G-ID 後）

Day 3
  你：
    ├── B3 引導 Tooltip 系統    (3-4h)
    └── A4+A5 FAQ + Why V-UP 改寫 (1.5h)
  
  組員：
    └── C2+C3 動畫與深色模式優化

Day 4（測試與收尾）
  共同：
    ├── 完整走一遍粉絲 Demo 流程
    ├── 完整走一遍創作者 Demo 流程
    ├── 修 Bug
    └── 將 Form URL 填入常數，部署上線
```

---

## 四、 各檔案修改總表

| 檔案 | 操作 | 負責 | 優先 |
|------|------|------|------|
| `css/demo.css` | 新增 | 你 | P0 |
| `js/demo/demo-sandbox.js` | 新增 | 你 | P0 |
| `js/demo/email-gate.js` | 新增 | 你 | P0 |
| `js/services/payment.service.js` | 修改（加旗標判斷） | 你 | P0 |
| `index.html` | 修改（多處） | 你 | P0/P1 |
| `vtuber_profile.html` | 修改（引入 demo scripts） | 你 | P1 |
| `dashboard.html` | 修改（引入 demo scripts） | 你 | P1 |
| `js/demo/demo-guide.js` | 新增 | 你 | P1 |
| 所有 HTML `<head>` | 修改（加 GA4） | 組員 | P1（等 D1 完成） |
| Google Form | 新建 | 組員 | P1（可晚） |
| ~~Netlify 設定~~ | ~~確認~~ | ~~組員~~ | ✅ 已完成 |

---

## 五、 決策摘要（已定案）

| 議題 | 決策 |
|------|------|
| 金流 | 驗證階段純沙盒（localStorage），不接真實金流 |
| VTuber 登入 | ❌ 不開放登入，避免 Firebase 額度消耗 |
| VTuber 分享 | ✅ 給預建靜態 Demo 連結（seed data），可分享給朋友體驗 |
| VTuber 關閉後保存 | ❌ 不保存，關閉即清除（localStorage only） |
| 表單時機 | 先用 placeholder，晚點換真實 URL |
| 抽成費率 | 5-8% 平台費 + 3% 金流費，行銷主打「90% 歸創作者」 |
| 主要金流商 | 初期單一選用綠界 ECPay |

---

## 六、 最小可上線 Checklist（可向老師展示的最低門檻）

- [x] ~~部署在 Netlify，網址可分享~~ ✅ 已完成
- [ ] `demo-sandbox.js` 完成，`?mode=fan` 進入有 Demo Banner
- [ ] 付款 Modal 在 Demo 模式下顯示 V點扣除動畫
- [ ] 完成後 Toast 有連結（即使是 placeholder）
- [ ] Email Gate Modal 存在（即使 form 還沒建好）
- [ ] Index 的 VTuber 卡片補齊（不再有「請填寫」占位文字）

---

## 七、 依賴關係與彈性分析（給忙碌的兩人）

### 🔒 必須固定順序的任務鏈

這些任務有「上游完成才能做下游」的硬性依賴，**不能亂序、不能同時平行**：

```
鏈 1：Demo 核心流程（你負責，必須循序）
  B4 css/demo.css 骨架
      ↓（Banner 的樣式要先存在）
  B1 demo-sandbox.js
      ↓（沙盒邏輯必須先好）
  payment.service.js 修改
      ↓（付款攔截要在沙盒之後）
  B3 demo-guide.js Tooltip 系統
      ↓（引導要在完整流程跑通之後才寫腳本）
  最終 End-to-End 測試

鏈 2：GA4 安裝（跨人依賴，注意！）
  D1 組員：開 GA4 帳號 → 取得 G-XXXXXXXXXX
      ↓（ID 沒拿到，下面兩個都做不了）
  C4 組員：各頁 <head> 加 gtag.js snippet
  + 你：demo-sandbox.js 裡填入 gtag('config', 'G-XXXXXXXXXX')

鏈 3：Google Form URL（最晚的依賴）
  D2 組員：建立 Form → 取得短網址
      ↓（URL 沒拿到，只能先放 placeholder）
  你：把兩個常數 FORM_URL_FAN / FORM_URL_CREATOR 換掉
```

### 🟢 可以任意換人、平行進行的任務

這些任務**彼此獨立**，誰有空誰做，中途換人也沒問題（只要改的是不同檔案）：

| 任務 | 為什麼可以彈性 |
|------|--------------|
| **A1 痛點比較 Section** | 純 HTML/CSS，不依賴任何 JS 模組 |
| **A2 How It Works 文案修改** | 只改現有文案，不新增功能 |
| **A3 VTuber 卡片補齊** | 只改靜態 HTML 內容，完全獨立 |
| **A4 金流 FAQ Section** | 純 HTML/CSS，不依賴任何 JS |
| **A5 Why V-UP 文案改寫** | 只改現有文案 |
| **C1 RWD 修正** | 純 CSS，獨立於所有 JS 功能 |
| **C2 動畫優化** | 獨立 CSS/JS，不影響業務邏輯 |
| **C3 深色模式一致性** | 純 CSS 變數修正 |
| **B2 Email Gate Modal** | 新增獨立檔案，不修改現有任何 JS |

### ⚠️ 換人時唯一要注意的事

**同時修改同一個檔案 = Git 衝突風險**

| 高風險組合（避免同時改） | 低風險（安全平行） |
|--------------------------|-------------------|
| 你改 `index.html` + 組員也改 `index.html` | 你改 `demo-sandbox.js` + 組員改 `styles.css` |
| 你改 `payment.service.js` + 組員也改它 | 你改 `js/demo/` 新檔案 + 組員改 `vtuber_profile.html` |

**建議協作方式**：
```
index.html 的修改 → 統一由「你」負責整理後推 PR
               → 組員的 UI 改動如果需要動 index.html，
                 先跟你說，再由你整合一起推
```

### 📋 最彈性的工作切割建議

如果某天其中一人突然有空，可以隨時撿起來做的任務清單：

**你有閒暇時**（按建議順序）：
1. A3 VTuber 卡片補齊（30min，最快見效）
2. A1/A2/A4/A5 Index 文案系列（順序不限）
3. B2 Email Gate Modal（90min，獨立）

**組員有閒暇時**（按建議順序）：
1. D1 開 GA4 帳號（10min，解鎖後續）
2. D2 建立 Google Form（30min，可晚點做）
3. C1 RWD 修正（任何時候都可以）
4. C4 加 GA4 snippet（等 D1 完成後）
