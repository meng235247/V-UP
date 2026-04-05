/**
 * V-Up! 在地化 AI 創作助理 (100% 離線版本)
 * 本服務完全在瀏覽器本地運行，絕不發送網路請求，確保資安與隱私。
 */

const OFFLINE_TEMPLATES = {
    post_social: [
        "今天的直播真的超級開心！看著彈幕滿滿的愛心，真的覺得能成為 VTuber 太好了 ✨ 謝謝你們一直支持著我的夢想！",
        "感謝各位騎士的守護，你們的存在就是我前進的動力。未來的路上，我們也要一直在一起喔 🌸",
        "剛結束活動，心裡還是暖暖的... 謝謝今天來參加的朋友們，大家早點休息，夢裡見～"
    ],
    post_hype: [
        "【重大公告】我們的目標已經近在咫尺！🔥 這是大家共同守護的奇蹟，讓我們一起衝過終點線吧！",
        "夢想正在發光！看著進度一點一滴推進，真的非常感動。還沒加入的朋友，現在就是最好的時機！",
        "呼叫所有粉絲！我們正在創造歷史，這個里程碑的解鎖將開啟全新的篇章。衝啊！！"
    ],
    milestone_desc: [
        "這項企劃的核心在於提升互動體驗，讓每一位支持者都能感受到身歷其境的陪伴感。您的參與是邁向更專業化升級的關鍵。",
        "這不僅是一個目標，更是我們共同成長的證明。此項目的達成將優化硬體設備，為未來的長久陪伴打下基礎。",
        "透過此企劃，我希望能帶給大家更高品質的視覺饗宴。每一份支持都將轉化為成長的養分，謝謝你們。"
    ],
    donation_thanks: [
        "非常感謝在「{TITLE}」企劃中的慷慨支持！目前進度已達到 {PERCENT}%，離終點又近了一步，太感動了！✨",
        "哇！收到來自粉絲的強力應援！在 `{TITLE}` 企劃中，我們即將迎來新的里程碑，進度目前為 {PERCENT}%！",
        "這是一場與大家的共同冒險。感謝支持「{TITLE}」，目前我們已經完成了 {PERCENT}% 的目標，我會繼續努力的！"
    ]
};

/**
 * 核心：智慧離線建議引擎
 * @param {string} type - 模板類型
 * @param {object} context - 語境參數 { title: "企劃名", percent: 80 }
 */
async function getAISuggestion(type, context = {}) {
    // 模擬 AI 思考的轉圈圈感 (其實是在地運算)
    await new Promise(resolve => setTimeout(resolve, 800));

    const templates = OFFLINE_TEMPLATES[type] || OFFLINE_TEMPLATES['post_social'];
    const randomIndex = Math.floor(Math.random() * templates.length);
    let result = templates[randomIndex];

    // 進行「智慧型組詞」：偵測目前企劃標題與進度
    if (context.title) {
        result = result.replace(/{TITLE}/g, context.title);
    } else {
        result = result.replace(/{TITLE}/g, "目前重要企劃");
    }

    if (context.percent !== undefined) {
        result = result.replace(/{PERCENT}/g, context.percent);
    } else {
        result = result.replace(/{PERCENT}/g, "突破性");
    }

    return result;
}

/**
 * UI 顯示建議彈窗 (由 dashboard.js 呼叫)
 */
function showAISuggestionModal(targetInputId, suggestion) {
    const modal = document.getElementById('ai-modal');
    const content = document.getElementById('ai-suggestion-content');
    if (!modal || !content) return;

    content.textContent = suggestion;
    modal.dataset.target = targetInputId;
    modal.classList.add('open');
}

/**
 * 採用建議：將內容填入對應輸入框
 */
function applyAISuggestion() {
    const modal = document.getElementById('ai-modal');
    const content = document.getElementById('ai-suggestion-content');
    const targetId = modal.dataset.target;
    const targetInput = document.getElementById(targetId);

    if (targetInput) {
        targetInput.value = content.textContent;
        // 如果填入的是貼文，可以觸發一些 UI 反饋
        if (targetId === 'vt-post-input') {
            targetInput.style.borderColor = 'var(--primary)';
        }
    }
    closeAIModal();
}

function closeAIModal() {
    document.getElementById('ai-modal').classList.remove('open');
}
