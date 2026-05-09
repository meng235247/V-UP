# V-UP! 試玩版製作計畫書
> 目標：不串接真實金流，讓創作者與粉絲能各自完整體驗平台流程，並系統性收集市場驗證資料

---

## 一、 整體架構設計

### 兩條獨立體驗路徑

```
Landing Page (index.html)
    │
    ├── [我是粉絲] ──→  vtuber_profile.html?id=demo&mode=fan
    │                   → 全流程引導 → 模擬贊助 → 完成 Toast → Google Form
    │
    └── [我是 VTuber] ──→  EMAIL GATE Modal (新增)
                          → 填入 email 後繼續
                          → dashboard.html?mode=demo
                          → 全流程引導 → 設定里程碑 → 完成 Toast → Google Form
```

### 核心技術原則：**純前端、零後端依賴、LocalStorage 模擬狀態**

| 機制 | 技術選擇 | 理由 |
|------|----------|------|
| Demo 狀態偵測 | `URLSearchParams + localStorage` | 最簡單，不需改動任何後端 |
| 付款模擬 | localStorage 扣 V點，進度條動畫 | 完全沙盒，永遠不碰 Firebase |
| Email 收集 | Google Form iframe / 轉跳 | 零開發成本，資料自動入表單 |
| 使用引導 | 輕量 Tooltip 系統（純 JS+CSS） | 不引入 Shepherd.js 等大型 library |
| 用戶行為追蹤 | Google Analytics 4 (gtag.js) | 免費、零後端、現成 |

---

## 二、 粉絲體驗流程劇本

### 入口：`vtuber_profile.html?id=demo&mode=fan`

#### Step 0：Demo Banner（頁面頂部固定欄）
```
🎮 試玩模式 | 你有 500 V點可以使用 | 無需帳號 · 無需真實付款
```
> **技術**：偵測 `?mode=fan` → 顯示 `#demo-toolbar`，同時從 localStorage 讀取/初始化 `demoPoints: 500`

#### Step 1：引導氣泡 #1（進入頁面後 800ms）
```
💡 歡迎來到拜風的應援頁！
她正在為「第一首原創曲」募集製作費。
看看她現在進行到哪裡了 ↓
[好，我看看]
```
> Tooltip 指向里程碑進度條區塊

#### Step 2：引導氣泡 #2（用戶點擊後）
```
✨ 你有 500 V點
點擊「應援」按鈕，把你的支持送給她！
[我要應援！]
```
> Tooltip 指向「應援」按鈕，點擊後啟動 Payment Modal

#### Step 3：Payment Modal（沙盒化）
- 顯示金額選項：100 / 300 / 500 V點
- **隱藏**所有真實金流欄位（信用卡、LINE Pay 圖示僅供展示，標示「正式上線後支援」）
- 確認按鈕文字：「使用 V點 應援！」
- 按下後：localStorage 扣點 → 進度條動畫播放

#### Step 4：應援成功動畫
- 進度條跳動 +N%，撒花粒子效果（CSS animation）
- 畫面閃爍「達成 +X V點！你推動了這份夢想」

#### Step 5：完成 Toast / Modal（3秒後自動彈出或動畫結束後）
```
✨ 你剛剛體驗了 V-UP! 的應援流程！

這個體驗跟平常「超級留言閃過就消失」有什麼不同嗎？
你覺得這樣的平台有意義嗎？

[📝 花 2 分鐘填寫意見（Google Form）]  [繼續試玩]
```

---

## 三、 創作者體驗流程劇本

### 入口：Landing Page 點擊「我是 VTuber」

#### Step 0：Email Gate Modal（★老師建議，在進入 Dashboard 前）

**Modal 設計**：
```
┌─────────────────────────────────────┐
│  🌟 VTuber 創作者專屬體驗            │
│                                     │
│  你即將進入創作者後台試玩版          │
│  包含：里程碑設定、AI 企劃、粉絲管理  │
│                                     │
│  留下 Email，我們在正式上線時       │
│  優先通知你！（絕不發垃圾信）        │
│                                     │
│  [________Email 輸入框________]     │
│  [🚀 進入後台體驗]                  │
│                                     │
│  <先跳過，直接看看> (文字按鈕，灰色) │
└─────────────────────────────────────┘
```

**技術實作**：
```javascript
// email-gate.js
function handleEmailGate(email) {
  // 1. 送至 Google Form (隱藏提交)
  submitToGoogleForm(email, 'creator_email_gate');
  // 2. 本地記錄
  localStorage.setItem('demo_creator_email', email);
  localStorage.setItem('demo_creator_mode', 'true');
  // 3. 跳轉
  window.location.href = 'dashboard.html?mode=demo';
}
// 「跳過」也記錄行為
function skipEmailGate() {
  localStorage.setItem('demo_skipped_email', 'true');
  gtag('event', 'email_gate_skipped', { role: 'creator' });
  window.location.href = 'dashboard.html?mode=demo';
}
```

#### Step 1：Dashboard Demo Banner
```
🎬 創作者後台試玩模式 | 所有操作不會真實儲存 | 盡情探索！
```

#### Step 2：引導氣泡序列（Dashboard 內）

| 氣泡編號 | 觸發時機 | 指向位置 | 文案 |
|----------|----------|----------|------|
| #1 | 進入後 1秒 | 側邊欄「里程碑」 | 「這裡是你設定企劃的地方，點進去看看吧」|
| #2 | 進入里程碑頁 | 「新增里程碑」按鈕 | 「設定一個你真正想完成的目標！」|
| #3 | 里程碑表單開啟 | AI 按鈕 | 「不知道要做什麼企劃？AI 幫你想！」|
| #4 | 填完表單後 | 「發佈」按鈕 | 「按下發佈，你的粉絲就能看到這個目標」|
| #5 | 發佈後 | 分享連結 | 「這個連結就是你的應援頁，分享給粉絲吧！」|

#### Step 3：完成 Toast
```
🎉 你已完成了創作者後台的完整體驗！

如果這個平台正式上線，你有興趣使用嗎？
留下你的想法，幫助我們做得更好。

[📝 填寫 2 分鐘創作者意見表單]  [繼續探索]
```

---

## 四、 引導 Tooltip 系統技術實作

### 設計原則：**輕量、自製、不引入大型 library**

```javascript
// demo-guide.js — 通用引導系統

const DemoGuide = {
  steps: [],
  currentStep: 0,

  init(steps) {
    this.steps = steps;
    this.renderOverlay();
    setTimeout(() => this.showStep(0), 800);
  },

  showStep(index) {
    if (index >= this.steps.length) return this.end();
    const step = this.steps[index];
    const target = document.querySelector(step.target);
    if (!target) return this.showStep(index + 1);

    // 高亮目標元素
    target.classList.add('demo-highlight');
    // 渲染 Tooltip
    this.renderTooltip(step, target);
    // 追蹤
    gtag('event', 'guide_step_viewed', { step: index, label: step.id });
  },

  renderTooltip(step, targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const tip = document.getElementById('demo-tooltip');
    tip.innerHTML = `
      <div class="tip-content">
        <p>${step.text}</p>
        <button onclick="DemoGuide.next()">${step.btnText || '好的 →'}</button>
        ${step.skippable ? '<button class="skip" onclick="DemoGuide.end()">跳過引導</button>' : ''}
      </div>`;
    // 計算位置（目標元素下方）
    tip.style.top = (rect.bottom + 12) + 'px';
    tip.style.left = rect.left + 'px';
    tip.style.display = 'block';
  },

  next() {
    document.querySelectorAll('.demo-highlight')
      .forEach(el => el.classList.remove('demo-highlight'));
    this.showStep(++this.currentStep);
  },

  end() {
    document.getElementById('demo-tooltip').style.display = 'none';
    document.getElementById('demo-overlay').style.display = 'none';
    gtag('event', 'guide_completed');
  }
};
```

---

## 五、 Analytics 事件追蹤規劃 (GA4)

### 安裝方式（最簡單：在 `<head>` 加兩行）

```html
<!-- 加入 index.html / vtuber_profile.html / dashboard.html 的 <head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### 核心事件清單

| 事件名稱 | 觸發時機 | 追蹤目的 |
|----------|----------|----------|
| `demo_fan_entered` | 粉絲點擊「試玩」進入 | 衡量試玩入口點擊率 |
| `demo_creator_entered` | 創作者點擊「我是VTuber」 | 衡量創作者興趣 |
| `email_gate_submitted` | Creator 填入 email | **關鍵轉化指標** |
| `email_gate_skipped` | 點擊「先跳過」 | 衡量 email gate 阻力 |
| `guide_step_viewed` | 每個引導氣泡被看到 | 分析哪步掉人最多 |
| `guide_completed` | 完成整個引導 | 引導完成率 |
| `demo_payment_opened` | 打開付款 Modal | 衡量贊助意圖 |
| `demo_payment_completed` | 完成模擬贊助 | **最核心的 Aha Moment** |
| `feedback_form_clicked` | 點擊表單連結 | 衡量回饋意願 |
| `feedback_form_skipped` | 關閉 Toast 不填 | 衡量轉化損失 |
| `milestone_created_demo` | Creator 完成里程碑設定 | 衡量創作者流程完成率 |

### 漏斗分析（Funnel）

```
Landing Page 到訪
    ↓ [目標: 40%]
點擊試玩入口
    ↓ [目標: 70%]
完成引導 Step 1
    ↓ [目標: 60%]
打開付款 Modal         ← 粉絲 AHA MOMENT 關鍵步驟
    ↓ [目標: 80%]
完成模擬贊助
    ↓ [目標: 50%]
點擊填寫表單
```

---

## 六、 Google Form 設計（兩份分開）

### 表單 A：粉絲版（填答時間 < 2 分鐘）

1. 你是學生還是工作中？（單選）
2. 平常你有在贊助/打賞 VTuber 嗎？（1-5分）
3. 這個「應援進度條」的體驗，和你平常打超級留言有什麼不同感覺？（開放填寫）
4. 如果這個平台正式上線，你願意使用嗎？（1-5分）
5. 你最想看到什麼功能？（開放填寫）

### 表單 B：創作者版（加入 Email 欄位）

1. 你目前有在哪些平台創作？（多選）
2. 你目前月收入大約多少來自粉絲支持？（選項式）
3. 現在最困擾你的事是什麼？（開放）
4. 這個「里程碑設定後台」的體驗，你覺得夠用嗎？（1-5分）
5. 如果平台正式上線，你願意試用嗎？（單選：「願意」/ 「需要更多資訊」/ 「不太有興趣」）
6. 留下 Email（可選，如未在前面留下）

---

## 七、 檔案修改清單與工作分配

| 檔案 | 改動類型 | 核心內容 | 難度 |
|------|----------|----------|------|
| `index.html` | 修改 | 「我是VTuber」按鈕觸發 Email Gate Modal | ⭐ |
| `js/demo/email-gate.js` | **新增** | Email Gate Modal 邏輯 + Google Form 隱藏提交 | ⭐⭐ |
| `js/demo/demo-guide.js` | **新增** | 通用引導 Tooltip 系統 | ⭐⭐ |
| `js/demo/demo-sandbox.js` | **新增** | `isDemoMode` 偵測 + localStorage 點數 + 付款攔截 | ⭐⭐⭐ |
| `css/demo.css` | **新增** | Tooltip 樣式、Demo Banner、高亮效果 | ⭐ |
| `vtuber_profile.html` | 修改 | 引入 demo.css / demo-sandbox.js，加 Demo Banner | ⭐ |
| `dashboard.html` | 修改 | 引入 demo-guide.js，加 Demo Banner | ⭐ |
| `js/services/payment.service.js` | 修改 | 在頂部加 `isDemoMode` 判斷，攔截付款流程 | ⭐⭐ |

---

## 八、 實作優先順序

| 優先 | 任務 | 預估工時 |
|------|------|----------|
| P0 | `demo-sandbox.js`：isDemoMode 偵測 + localStorage 點數 + 付款攔截 | 2-3h |
| P0 | Demo Banner UI (粉絲版 + 創作者版) | 0.5h |
| P0 | 付款成功 → 完成 Toast → Google Form 連結 | 1h |
| P1 | `demo-guide.js`：引導 Tooltip 系統 | 3-4h |
| P1 | Email Gate Modal（創作者入口） | 2h |
| P1 | GA4 事件安裝與測試 | 1h |
| P2 | 粉絲引導氣泡腳本（完整 5 步） | 2h |
| P2 | 創作者引導氣泡腳本（完整 5 步） | 2h |

---

## 九、 Open Questions

> [!IMPORTANT]
> 以下需要確認後才能開始實作

1. **Google Form 連結**：表單是否由組員負責建立？還是你這邊先用 placeholder 預留欄位？
2. **GA4 帳號**：是否需要我協助設定 GA4 Property？還是已經有帳號？
3. **Email Gate 的「跳過」設計**：老師的建議是「一定要填才能進」還是「可以跳過但有提示」？（影響阻力設計）
4. **引導氣泡**：是否需要在手機版也支援？（需要額外的 RWD 定位邏輯）
5. **開始實作順序確認**：建議先從 P0 的 `demo-sandbox.js` 開始，確認你是否同意這個順序？
