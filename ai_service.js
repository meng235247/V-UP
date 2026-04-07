/**
 * V-Up! AI 小幫手 (Gemini API 串接版本)
 * 提供非同步串流的智慧建議與企畫協助。
 */

// 1. 核心：Gemini API 呼叫 (支援 Streaming)
async function callGeminiAPI(prompt, onChunk = null) {
    const apiKey = localStorage.getItem('vup_gemini_api_key');
    
    // 如果沒有 Key，使用增強版範本作為 Fallback
    if (!apiKey) {
        console.warn("⚠️ [AI Service] 無 API Key，提供智能範本回應");
        const fallbackMsg = getEnhancedTemplateResponse(prompt);
        if (onChunk) {
            let i = 0;
            return new Promise((resolve) => {
                onChunk("小幫手思考中..."); // Initial processing text
                setTimeout(() => {
                    const interval = setInterval(() => {
                        onChunk(fallbackMsg.substring(0, i));
                        i += 2; // Speed up
                        if (i > fallbackMsg.length) {
                            onChunk(fallbackMsg);
                            clearInterval(interval);
                            resolve(fallbackMsg);
                        }
                    }, 15);
                }, 500); // simulate network delay
            });
        } else {
            await new Promise(r => setTimeout(r, 1000));
            return fallbackMsg;
        }
    }

    try {
        const url = onChunk 
            ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`
            : `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (onChunk) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullText = "";
            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                
                for (let i = 0; i < lines.length - 1; i++) {
                    const line = lines[i].trim();
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '');
                        if (dataStr === '[DONE]') continue;
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.candidates && data.candidates[0].content.parts[0].text) {
                                fullText += data.candidates[0].content.parts[0].text;
                                onChunk(fullText);
                            }
                        } catch (e) {
                            // ignore parse errors for incomplete chunks
                        }
                    }
                }
                buffer = lines[lines.length - 1];
            }
            return fullText;
        } else {
            const data = await response.json();
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                return data.candidates[0].content.parts[0].text;
            }
            throw new Error("API 回傳格式錯誤");
        }
    } catch (err) {
        console.error("❌ [AI Service] Gemini API 呼叫失敗:", err);
        return "抱歉，目前在與 AI 同步時遇到一點問題。不過別擔心，您可以先使用側邊欄的快捷建議！";
    }
}

// 2. 智慧建議觸發點 (由 UI 呼叫，由 dashboard.js bridge)
async function triggerAI(type, targetId) {
    const targetInput = document.getElementById(targetId);
    if (!targetInput) return;

    const context = {
        title: document.getElementById('ms-title')?.value || document.getElementById('vt-ms-title')?.value || "目前的重大企劃",
        donor: "親愛的粉絲",
        percent: 80 
    };

    const originalBtn = event?.currentTarget;
    const originalText = originalBtn ? originalBtn.innerHTML : '';
    if (originalBtn) {
        originalBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 思考中...';
        originalBtn.disabled = true;
    }

    let prompt = "";
    if (type === 'post_social') prompt = `你是一個專業的 VTuber 經紀人。請幫我寫一段溫馨且吸引人的社群貼文，內容關於：${targetInput.value || '日常分享'}。風格要親切且帶有動感表情符號。`;
    if (type === 'milestone_desc') prompt = `幫我寫一段募資里程碑的介紹。企劃標題是「${context.title}」。請強調這對 VTuber 成長的重要性，並用感人的口吻邀請粉絲支持。`;
    if (type === 'donation_thanks') prompt = `幫我寫一段感謝粉絲「${context.donor}」大額贊助的感謝文，目前的企劃進度是 ${context.percent}%。`;

    // 打開 Modal 並準備接收 stream
    const modal = document.getElementById('ai-modal');
    const content = document.getElementById('ai-suggestion-content');
    if (modal && content) {
        content.textContent = '小幫手連線中...';
        content.classList.add('ai-streaming');
        modal.classList.add('open');
        modal.dataset.target = targetId;
    }

    // 呼叫 API 並透過 Streaming 更新 UI
    let generatedText = "";
    await callGeminiAPI(prompt, (chunk) => {
        if (content) {
            content.textContent = chunk;
            generatedText = chunk; // keep the latest
        }
    });

    if (content) {
        content.classList.remove('ai-streaming');
        // Ensure final text is there
        if (generatedText) content.textContent = generatedText;
    }

    if (originalBtn) {
        originalBtn.innerHTML = originalText || '<i class="fas fa-magic"></i> AI 幫我寫 ✨';
        originalBtn.disabled = false;
    }
}

// 2.5 專屬對話視窗功能 (For #panel-ai-assistant)
async function sendAIChat() {
    const inputField = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('ai-send-btn');
    const messagesBox = document.getElementById('ai-chat-messages');
    
    if (!inputField || !inputField.value.trim()) return;
    
    const userText = inputField.value.trim();
    inputField.value = '';
    
    if (sendBtn) sendBtn.disabled = true;

    // 加入使用者訊息
    const userMsgHTML = `
        <div class="message user-message">
            <div class="msg-content">${userText}</div>
        </div>
    `;
    messagesBox.insertAdjacentHTML('beforeend', userMsgHTML);
    messagesBox.scrollTop = messagesBox.scrollHeight;

    // 加入 AI 回應佔位
    const msgId = 'msg-' + Date.now();
    const aiMsgHTML = `
        <div class="message ai-message">
            <div class="msg-content ai-streaming" id="${msgId}">思考處理中...</div>
        </div>
    `;
    messagesBox.insertAdjacentHTML('beforeend', aiMsgHTML);
    messagesBox.scrollTop = messagesBox.scrollHeight;
    
    const targetElement = document.getElementById(msgId);

    // Call API with Streaming
    await callGeminiAPI(userText, (chunk) => {
        if (targetElement) {
            targetElement.textContent = chunk;
            messagesBox.scrollTop = messagesBox.scrollHeight;
        }
    });

    if (targetElement) {
        targetElement.classList.remove('ai-streaming');
    }

    if (sendBtn) sendBtn.disabled = false;
    inputField.focus();
}

function askAIChat(promptText) {
    const inputField = document.getElementById('ai-chat-input');
    if (inputField) {
        inputField.value = promptText;
        sendAIChat();
    }
}


// 3. 增強型離線範本 (Fallback)
function getEnhancedTemplateResponse(prompt) {
    if (prompt.includes('感謝')) return "今天的直播真的超級開心！看著彈幕滿滿的愛心，真的覺得能成為 VTuber 太好了 ✨ 謝謝你們一直支持著我的夢想！你們的每一份贊助都是我前進的巨大動力！";
    if (prompt.includes('企劃') || prompt.includes('靈感')) return "這項企劃的核心在於提升互動體驗，讓每一位支持者都能感受到身歷其境的陪伴感。您可以嘗試舉辦『粉絲同樂大賽』或『5萬訂閱耐久回饋歌回』，一定棒極了！";
    if (prompt.includes('休息公告')) return "【公告】親愛的粉絲們，最近因為連續直播稍微有點疲勞，因此明後兩天我會好好休息充電一下😴！希望大家也能趁這個機會照顧好自己，期待週四滿血復活和你們見面！愛你們喔 💕";
    if (prompt.includes('會員招募推廣')) return "✨ 想要解鎖專屬的可愛貼圖，並參加我們每個月一次的『限定會員遊戲夜』嗎？現在加入頻道會員，不只有帥氣的徽章，還能直接參與我接下來的秘密企劃討論喔！趕快點擊加入按鈕成為我的星空騎士吧！💎";
    return "哈囉！我是您的 V-Up! 小幫手。看起來目前尚未設定 API Key，但我依然可以協助您！請在設定頁面填入金鑰以獲得更精準的 AI 建議喔！";
}

// 4. 原有 UI 控制邏輯
function applyAISuggestion() {
    const modal = document.getElementById('ai-modal');
    const content = document.getElementById('ai-suggestion-content');
    const targetId = modal.dataset.target;
    const targetInput = document.getElementById(targetId);

    if (targetInput) {
        targetInput.value = content.textContent;
    }
    closeAIModal();
}

function closeAIModal() {
    const modal = document.getElementById('ai-modal');
    if (modal) modal.classList.remove('open');
}

// 暴露給全域
window.callGeminiAPI = callGeminiAPI;
window.triggerAI = triggerAI;
window.sendAIChat = sendAIChat;
window.askAIChat = askAIChat;
window.applyAISuggestion = applyAISuggestion;
window.closeAIModal = closeAIModal;
