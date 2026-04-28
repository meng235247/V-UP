// ============================================
//  V-Up! Creator Studio — Dashboard Logic
// ============================================

// ---- Apply saved theme ----
(function() {
    const t = localStorage.getItem('vup-theme') || '';
    document.documentElement.dataset.theme = t;
    const btn = document.getElementById('theme-btn');
    if (btn) btn.querySelector('i').className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
})();

function toggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? '' : 'dark';
    root.dataset.theme = next;
    localStorage.setItem('vup-theme', next);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// ---- Tab Panels ----
const TAB_CONFIG = {
    'overview':       { title: '總覽數據 (Overview)',       desc: '追蹤您的募資進度與粉絲互動狀況' },
    'milestones':     { title: '里程碑管理 (Milestones)',   desc: '建立與管理您的所有募資項目' },
    'crm':            { title: '粉絲關係管理 (CRM)',         desc: '查看並聯繫您的核心支持者' },
    'posts':          { title: '限定內容發布 (Posts)',       desc: '向贊助粉絲發布專屬內容' },
    'share':          { title: '擴散分享 (Share & Spread)',  desc: '讓更多人看見您的專屬頁面' },
    'customization':  { title: '專屬頁面自訂 (Customization)', desc: '調整您的公開頁面視覺風格' },
    'settings':       { title: '帳號設定 (Settings)',        desc: '管理您的帳號資料與安全設定' },
};

document.addEventListener('DOMContentLoaded', () => {
    // Sidebar nav tab switch
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', e => {
            if (item.getAttribute('href') && item.getAttribute('href') !== '#') {
                return; // Let standard links navigate normally
            }
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const tab = item.dataset.tab;
            if (tab) switchTab(tab);
        });
    });

    // Notification bell
    const bell = document.getElementById('bell-btn');
    if (bell) {
        bell.addEventListener('click', () => {
            showToast('您有 3 則未讀通知：新增贊助 ×2、里程碑達成 ×1', 'info');
        });
    }

    // Table action buttons — edit
    document.querySelectorAll('.btn-table-action.edit').forEach(btn => {
        btn.addEventListener('click', () => openNewMilestoneModal());
    });

    // Table action buttons — leaderboard
    document.querySelectorAll('.btn-table-action.rank').forEach(btn => {
        btn.addEventListener('click', () => showToast('排行榜功能即將上線，敬請期待！', 'info'));
    });

    // Send thank you batch
    const sendBtn = document.getElementById('send-thanks-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            sendBtn.disabled = true;
            sendBtn.textContent = '發送中…';
            setTimeout(() => {
                showToast('已向 3 位粉絲發送感謝信函 ✉️', 'success');
                sendBtn.disabled = false;
                sendBtn.textContent = '發送感謝信函 (批次)';
            }, 1200);
        });
    }

    // --- Milestone modal interactive controls ---
    const collabToggle = document.getElementById('ms-collab-toggle');
    const collabArea = document.getElementById('ms-collab-area');
    const collabAddBtn = document.getElementById('ms-collab-add-btn');
    const collabSearch = document.getElementById('ms-collab-search');
    const collabList = document.getElementById('ms-collab-list');

    if (collabToggle) {
        collabToggle.addEventListener('change', (e) => {
            if (collabArea) collabArea.style.display = e.target.checked ? 'block' : 'none';
        });
    }

    function addCollaboratorChip(collabObj) {
        if (!collabList || !collabObj || !collabObj.uid) return;
        const exists = Array.from(collabList.querySelectorAll('.chip')).some(c => c.dataset.uid === collabObj.uid);
        if (exists) { showToast('已加入此合作對象', 'info'); return; }
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.dataset.uid = collabObj.uid;
        chip.dataset.name = collabObj.name || collabObj.uid;
        if (collabObj.avatarUrl) chip.dataset.avatar = collabObj.avatarUrl;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'chip-remove';
        removeBtn.title = '移除';
        removeBtn.innerText = '×';
        chip.appendChild(document.createTextNode(chip.dataset.name));
        chip.appendChild(removeBtn);
        collabList.appendChild(chip);
        removeBtn.addEventListener('click', () => chip.remove());
    }

    if (collabAddBtn) {
        collabAddBtn.addEventListener('click', () => {
            const v = (collabSearch && collabSearch.value) ? collabSearch.value.trim() : '';
            if (!v) { showToast('請輸入合作對象名稱或 Email', 'error'); return; }
            
            // Mock 搜尋邏輯
            let mockResult = { uid: v, name: v, avatarUrl: '' }; // fallback
            if (v.toLowerCase().includes('vtuber2')) {
                mockResult = { uid: 'vtuber2', name: 'VTuber Two', avatarUrl: 'image/v_head_ryusei.jpg' };
            } else if (v.toLowerCase().includes('ume')) {
                mockResult = { uid: 'ume_123', name: 'UME', avatarUrl: 'image/v_head_ryusei.jpg' };
            }

            addCollaboratorChip(mockResult);
            if (collabSearch) collabSearch.value = '';
        });
    }

    // award radio toggle
    document.querySelectorAll('input[name="ms-award"]').forEach(r => {
        r.addEventListener('change', (e) => {
            const wrap = document.getElementById('ms-award-count-wrap');
            if (wrap) wrap.style.display = e.target.value === 'yes' ? 'block' : 'none';
        });
    });

    // badge preview
    const badgeInput = document.getElementById('ms-badge-input');
    const badgePreview = document.getElementById('ms-badge-preview');
    const badgePlaceholder = document.getElementById('ms-badge-placeholder');
    if (badgeInput) {
        badgeInput.addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f) { if (badgePreview) { badgePreview.src = ''; badgePreview.style.display='none'; } if (badgePlaceholder) badgePlaceholder.style.display='inline'; return; }
            const fr = new FileReader();
            fr.onload = function(ev) { if (badgePreview) { badgePreview.src = ev.target.result; badgePreview.style.display='block'; } if (badgePlaceholder) badgePlaceholder.style.display='none'; }
            fr.readAsDataURL(f);
        });
    }

    // submit binding (button)
    const msSubmitBtn = document.getElementById('ms-submit-btn');
    if (msSubmitBtn) msSubmitBtn.addEventListener('click', () => submitMilestone());

});

function switchTab(tabId) {
    const cfg = TAB_CONFIG[tabId];
    if (!cfg) return;
    document.getElementById('page-title-h1').textContent = cfg.title;
    document.getElementById('page-title-desc').textContent = cfg.desc;

    // Show/hide panels
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel-' + tabId);
    if (panel) panel.classList.add('active');
    else showToast(`「${cfg.title}」頁面開發中，敬請期待！`, 'info');

    if (tabId === 'posts') {
        if (typeof window.refreshPostMilestoneOptions === 'function') window.refreshPostMilestoneOptions();
        if (typeof window.renderPosts === 'function') window.renderPosts();
    }

    if (tabId === 'crm') {
        if (typeof window.renderCRM === 'function') window.renderCRM();
    }

    if (tabId === 'share') {
        if (typeof window.initShareTab === 'function') window.initShareTab();
    }
}

// ---- Share Tab Logic ----
window.initShareTab = async () => {
    const handleInput = document.getElementById('vt-handle');
    const shareUrlInput = document.getElementById('share-url-input');
    const qrImg = document.getElementById('share-qrcode-img');
    
    // Get handle from settings input or default
    const handle = (handleInput && handleInput.value) || 'yume';
    // Use current location for base URL
    const baseUrl = window.location.origin + window.location.pathname.replace('dashboard.html', 'vtuber_profile.html?id=');
    const fullUrl = baseUrl + handle;
    
    if (shareUrlInput) shareUrlInput.value = fullUrl;
    if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fullUrl)}`;
    }
};

window.copyShareLink = () => {
    const input = document.getElementById('share-url-input');
    if (!input) return;
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value).then(() => {
        showToast('公開頁面連結已複製！', 'success');
    });
};

window.copyTemplateText = (index) => {
    const textEl = document.getElementById(`template-${index}`);
    if (!textEl) return;
    navigator.clipboard.writeText(textEl.textContent).then(() => {
        showToast('文案已複製，快去分享吧！', 'success');
    });
};

window.downloadQRCode = () => {
    const img = document.getElementById('share-qrcode-img');
    if (!img) return;
    const link = document.createElement('a');
    link.href = img.src;
    link.download = 'V-UP_Share_QRCode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('開始下載專屬 QR Code', 'info');
};

// CRM Global State
let crmSortKey = 'createdAt';
let crmSortOrder = 'desc';

window.handleCRMSort = (key) => {
    if (crmSortKey === key) {
        crmSortOrder = crmSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        crmSortKey = key;
        crmSortOrder = 'desc';
    }
    
    // Update icons
    document.querySelectorAll('#crm-table th.sortable i').forEach(i => i.className = 'fas fa-sort');
    const ths = document.querySelectorAll('#crm-table th.sortable');
    ths.forEach(th => {
        if (th.getAttribute('onclick')?.includes(key)) {
            const icon = th.querySelector('i');
            if (icon) icon.className = crmSortOrder === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
        }
    });
    
    if (typeof window.applyCRMFilters === 'function') window.applyCRMFilters();
};

window.toggleCRMComment = (btn) => {
    const text = btn.previousElementSibling;
    if (text.classList.contains('expanded')) {
        text.classList.remove('expanded');
        btn.textContent = '查看更多';
    } else {
        text.classList.add('expanded');
        btn.textContent = '收合';
    }
};

// ---- Render Milestones List ----
window.renderMilestones = async function() {
    const panel = document.getElementById('panel-milestones');
    if (!panel) return;
    // show loading state
    panel.innerHTML = `<div class="dashboard-section" style="text-align:center; padding:60px 30px;">載入中…</div>`;
    try {
        const list = await MilestonesService.getMilestones();
        const visibleList = list || [];
        if (!visibleList || visibleList.length === 0) {
            panel.innerHTML = `
                <div class="dashboard-section" style="text-align:center; padding:60px 30px;">
                    <div style="font-size:3rem; margin-bottom:16px;">🎯</div>
                    <h2 style="margin-bottom:8px;">里程碑管理</h2>
                    <p class="text-muted" style="margin-bottom:24px;">在這裡建立、編輯和追蹤您所有的募資里程碑項目</p>
                    <div style="display:flex; justify-content:center; gap:12px;">
                        <button class="btn-primary" onclick="openNewMilestoneModal()"><i class="fas fa-plus"></i>
                            建立第一個里程碑</button>
                        <button class="btn-outline ai-sparkle-btn" onclick="openMilestoneAIModal()">
                            <i class="fas fa-wand-magic-sparkles"></i> AI 生成提案
                        </button>
                    </div>
                </div>`;
            return;
        }

        // render list
        const rows = visibleList.map(m => {
            const goalVal = Number(m.goal || m.targetAmount || m.target || 0) || 0;
            const progress = goalVal && m.currentAmount ? Math.min(100, Math.round((m.currentAmount / goalVal) * 100)) : 0;
            return `
            <div class="card" style="padding:1rem; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;">
                <div style="flex:1">
                    <div style="font-weight:700; font-size:1.05rem;">${escapeHtml(m.title || '（無標題）')}</div>
                    <div style="color:var(--text-muted); font-size:0.9rem; margin-top:6px;">狀態：${m.status || 'draft'} · 目標：<span class="font-mono">${Number(m.goal || 0).toLocaleString()}</span></div>
                    <div style="margin-top:8px; width:220px;">
                        <div class="progress-bar-bg" style="height:8px; background:var(--bg-subtle); border-radius:6px;">
                            <div class="progress-bar-fill" style="width:${progress}%; height:8px; background:var(--primary); border-radius:6px;"></div>
                        </div>
                    </div>
                </div>
                    <div class="ms-actions">
                        <button class="btn-outline" onclick="openEditMilestone('${m.id}')"><i class="fas fa-edit"></i> 編輯</button>
                        ${m.status === 'draft' ? `<button class="btn-danger" onclick="deleteMilestone('${m.id}', this)"><i class="fas fa-trash"></i> 刪除</button><button class="btn-primary" onclick="publishMilestone('${m.id}', this)"><i class="fas fa-upload"></i> 發布</button>` : ''}
                    </div>
            </div>`;
        }).join('');

        panel.innerHTML = `
            <div class="dashboard-section">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h2 style="margin:0;">我的里程碑</h2>
                    <div style="display:flex; gap:10px;">
                        <button class="btn-outline ai-sparkle-btn" onclick="openMilestoneAIModal()">
                            <i class="fas fa-wand-magic-sparkles"></i> AI 生成提案
                        </button>
                        <button class="btn-primary" onclick="openNewMilestoneModal()"><i class="fas fa-plus"></i> 新增里程碑</button>
                    </div>
                </div>
                <div id="milestones-list">${rows}</div>
            </div>`;
    } catch (err) {
        console.error('[Dashboard] renderMilestones error:', err);
        panel.innerHTML = `<div class="dashboard-section" style="text-align:center; padding:40px 20px;">讀取里程碑失敗，請稍後再試。</div>`;
    }
};
// -- Custom confirm modal helper (returns Promise<boolean>)
function openConfirmModal(message, title = '確認操作', okLabel = '確定', cancelLabel = '取消') {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const msg = document.getElementById('confirm-modal-message');
        const ttl = document.getElementById('confirm-modal-title');
        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');
        if (!modal || !msg || !okBtn || !cancelBtn) return resolve(false);
        msg.textContent = message;
        ttl.textContent = title;
        okBtn.textContent = okLabel;
        cancelBtn.textContent = cancelLabel;
        modal.classList.add('open');

        function cleanup(result) {
            modal.classList.remove('open');
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            document.removeEventListener('keydown', onKey);
            resolve(result);
        }

        function onOk() { cleanup(true); }
        function onCancel() { cleanup(false); }
        function onKey(e) { if (e.key === 'Escape') cleanup(false); }

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        document.addEventListener('keydown', onKey);
    });
}

function closeConfirmModal() {
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    if (cancelBtn) { try { cancelBtn.click(); return; } catch (e) {} }
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.classList.remove('open');
}

// (undo toast removed — deletions are now permanent/hard-delete)

window.publishMilestone = async function(id, btn) {
    const ok = await openConfirmModal('確定要發布該里程碑？發布後將對外公開。', '確認發布', '發布', '取消');
    if (!ok) return;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 發布中'; }
    try {
        await MilestonesService.publish(id);
        showToast('里程碑已發布', 'success');
        // refresh list
        await window.renderMilestones();
    } catch (err) {
        console.error('[Dashboard] publishMilestone error:', err);
        showToast('發布失敗，請稍後再試', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-upload"></i> 發布'; }
    }
};

window.deleteMilestone = async function(id, btn) {
    const ok = await openConfirmModal('確定要刪除此里程碑草稿？此操作無法復原。', '確認刪除', '刪除', '取消');
    if (!ok) return;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 刪除中'; }
    try {
        // fetch title for delete message
        let title = '里程碑草稿';
        try {
            const all = await MilestonesService.getMilestones();
            const m = (all || []).find(x => x.id === id);
            if (m && m.title) title = `「${m.title}」`;
        } catch (e) { /* ignore */ }
        await MilestonesService.delete(id);
        showToast(`${title} 已刪除。`, 'success');
        await window.renderMilestones();
    } catch (err) {
        console.error('[Dashboard] deleteMilestone error:', err);
        showToast('刪除失敗，請稍後再試', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-trash"></i> 刪除'; }
    }
};

// utility: simple escape for inserted text
function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"]+/g, function(ch) {
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]);
    });
}

// Open modal and prefill fields for editing (basic, creates a new draft on save)
window.openEditMilestone = async function(id) {
    try {
        const list = await MilestonesService.getMilestones();
        const m = list.find(x => x.id === id);
        if (!m) return showToast('找不到該里程碑', 'error');

        // Prefill modal fields
        document.getElementById('ms-title').value = m.title || '';
        document.getElementById('ms-goal').value = m.goal || m.targetAmount || '';
        document.getElementById('ms-desc').value = m.desc || '';
        document.getElementById('ms-featured').checked = !!m.featured;
        document.getElementById('ms-hidden').checked = !!m.hidden;

        // collaborators
        const collabList = document.getElementById('ms-collab-list');
        if (collabList) {
            collabList.innerHTML = '';
            // 支持從舊的 collaborators string array 或新的 collaboratorsMeta 回填
            const metaList = m.collaboratorsMeta || (m.collaborators || []).map(uid => ({ uid, name: uid }));
            metaList.forEach(c => {
                const chip = document.createElement('span');
                chip.className = 'chip';
                chip.dataset.uid = c.uid;
                chip.dataset.name = c.name || c.uid;
                if (c.avatarUrl) chip.dataset.avatar = c.avatarUrl;
                
                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'chip-remove';
                removeBtn.title = '移除';
                removeBtn.innerText = '×';
                chip.appendChild(document.createTextNode(chip.dataset.name));
                chip.appendChild(removeBtn);
                collabList.appendChild(chip);
                removeBtn.addEventListener('click', () => chip.remove());
            });
        }

        // badge preview
        if (m.badgeDataUrl) {
            const badgePreview = document.getElementById('ms-badge-preview');
            const badgePlaceholder = document.getElementById('ms-badge-placeholder');
            if (badgePreview) { badgePreview.src = m.badgeDataUrl; badgePreview.style.display = 'block'; }
            if (badgePlaceholder) badgePlaceholder.style.display = 'none';
        }

        // set editing state and open modal without resetting fields
        window._editingMilestoneId = id;
        const modalTitle = document.getElementById('ms-modal-title'); if (modalTitle) modalTitle.textContent = '編輯里程碑募資項目';
        const msSubmitBtnEl = document.getElementById('ms-submit-btn'); if (msSubmitBtnEl) msSubmitBtnEl.innerHTML = '<i class="fas fa-check"></i> 更新里程碑';
        if (milestoneModal) milestoneModal.classList.add('open');
        setTimeout(() => { const t = document.getElementById('ms-title'); if (t) t.focus(); }, 60);
    } catch (err) {
        console.error('[Dashboard] openEditMilestone error:', err);
        showToast('無法載入里程碑資料', 'error');
    }
};

// ---- Milestone Modal ----
const milestoneModal = document.getElementById('milestone-modal');
function openNewMilestoneModal() {
    if (!milestoneModal) return;
    // clear editing state and reset form fields for new milestone
    window._editingMilestoneId = null;
    const msTitle = document.getElementById('ms-title'); if (msTitle) msTitle.value = '';
    const msGoal = document.getElementById('ms-goal'); if (msGoal) msGoal.value = '';
    const msDesc = document.getElementById('ms-desc'); if (msDesc) msDesc.value = '';
    const msCollabToggle = document.getElementById('ms-collab-toggle'); if (msCollabToggle) { msCollabToggle.checked = false; const area = document.getElementById('ms-collab-area'); if (area) area.style.display='none'; }
    const collabList = document.getElementById('ms-collab-list'); if (collabList) collabList.innerHTML = '';
    const msFeatured = document.getElementById('ms-featured'); if (msFeatured) msFeatured.checked = false;
    const msHidden = document.getElementById('ms-hidden'); if (msHidden) msHidden.checked = false;
    const badgePreview = document.getElementById('ms-badge-preview'); if (badgePreview) { badgePreview.src=''; badgePreview.style.display='none'; }
    const badgePlaceholder = document.getElementById('ms-badge-placeholder'); if (badgePlaceholder) badgePlaceholder.style.display='inline';
    const modalTitle = document.getElementById('ms-modal-title'); if (modalTitle) modalTitle.textContent = '新增里程碑募資項目';
    const msSubmitBtnEl = document.getElementById('ms-submit-btn'); if (msSubmitBtnEl) msSubmitBtnEl.innerHTML = '<i class="fas fa-check"></i> 建立里程碑';
    milestoneModal.classList.add('open');
    setTimeout(() => { const t = document.getElementById('ms-title'); if (t) t.focus(); }, 60);
}
function closeNewMilestoneModal() {
    if (milestoneModal) milestoneModal.classList.remove('open');
    // clear editing state when modal closed
    window._editingMilestoneId = null;
}
async function submitMilestone() {
    try {
        const title = document.getElementById('ms-title')?.value?.trim();
        const goalVal = document.getElementById('ms-goal')?.value;
        const goal = Number(goalVal);
        if (!title || !goal) { showToast('請填寫里程碑標題與目標點數', 'error'); return; }

        const desc = document.getElementById('ms-desc')?.value?.trim() || '';
        const isCollab = !!document.getElementById('ms-collab-toggle')?.checked;
        const collabEls = document.querySelectorAll('#ms-collab-list .chip');
        const collaborators = Array.from(collabEls).map(c => c.dataset.uid);
        const collaboratorsMeta = Array.from(collabEls).map(c => ({
            uid: c.dataset.uid,
            name: c.dataset.name,
            avatarUrl: c.dataset.avatar || null
        }));
        const award = document.querySelector('input[name="ms-award"]:checked')?.value === 'yes';
        const awardCount = award ? Number(document.getElementById('ms-award-count')?.value || 10) : 0;
        const featured = !!document.getElementById('ms-featured')?.checked;
        const hidden = !!document.getElementById('ms-hidden')?.checked;

        const msSubmitBtnEl = document.getElementById('ms-submit-btn');
        const originalBtnHtml = msSubmitBtnEl ? msSubmitBtnEl.innerHTML : null;
        if (msSubmitBtnEl) { msSubmitBtnEl.disabled = true; msSubmitBtnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 儲存中...'; }

        // read badge file if provided — prefer uploading via storageService and store badgeUrl
        const badgeInputEl = document.getElementById('ms-badge-input');
        let badgeUrl = null;
        if (badgeInputEl && badgeInputEl.files && badgeInputEl.files[0]) {
            const file = badgeInputEl.files[0];
            if (window.storageService && typeof window.storageService.uploadFile === 'function') {
                try {
                    badgeUrl = await window.storageService.uploadFile(file);
                } catch (err) {
                    console.error('[Dashboard] badge upload failed', err);
                    showToast('徽章上傳失敗，請稍後再試', 'error');
                    return;
                }
            } else {
                // fallback to embedding data URL
                badgeUrl = await new Promise((res, rej) => {
                    const fr = new FileReader();
                    fr.onload = () => res(fr.result);
                    fr.onerror = rej;
                    fr.readAsDataURL(file);
                });
            }
        }

        const milestone = { title, goal, desc, isCollab, collaborators, collaboratorsMeta, award, awardCount, featured, hidden, badgeUrl };

        try {
            if (window._editingMilestoneId) {
                await MilestonesService.update(window._editingMilestoneId, milestone);
                closeNewMilestoneModal();
                showToast(`里程碑「${title}」已更新`, 'success');
                window._editingMilestoneId = null;
            } else {
                await MilestonesService.createDraft(milestone);
                closeNewMilestoneModal();
                showToast(`里程碑「${title}」已建立（草稿），目標 ${Number(goal).toLocaleString()} 點`, 'success');
            }
            // refresh list
            if (typeof renderMilestones === 'function') renderMilestones();
            if (typeof window.refreshPostMilestoneOptions === 'function') window.refreshPostMilestoneOptions();
        } catch (err) {
            console.error('[Dashboard] submitMilestone error:', err);
            showToast('建立或更新里程碑時發生錯誤，請稍後再試', 'error');
        } finally {
            if (msSubmitBtnEl) { msSubmitBtnEl.disabled = false; msSubmitBtnEl.innerHTML = originalBtnHtml || '<i class="fas fa-check"></i> 建立里程碑'; }
        }
    } catch (err) {
        console.error(err);
        showToast('建立里程碑時發生錯誤', 'error');
    }
}

window.addEventListener('click', e => { if (milestoneModal && e.target === milestoneModal) closeNewMilestoneModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNewMilestoneModal(); });

// ---- Toast ----
function showToast(msg, type = 'info') {
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        t.className = 'ds-toast';
        document.body.appendChild(t);
    }
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${msg}`;
    t.className = `ds-toast ds-toast-${type} show`;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ==== KPI Overview Logic ====
window.renderDashboardOverview = async (uid) => {
    if (!uid) return;
    try {
        if (!window.PaymentService) {
            console.warn('[renderDashboardOverview] PaymentService not ready');
            return;
        }

        // 取得該 VTuber 的所有交易紀錄
        const txs = await window.PaymentService.getTransactions(uid);
        
        // 取得該 VTuber 的里程碑
        const milestones = await window.MilestonesService.getMilestones(uid);

        // 1. 本月總點數 (以 30 天內為準，或是當月)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyTxs = txs.filter(tx => {
            const date = tx.createdAt?.toDate ? tx.createdAt.toDate() : null;
            return date && date >= startOfMonth && tx.status === 'success';
        });
        const monthlyTotal = monthlyTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        
        // 2. 活躍贊助粉絲 (不重複 UID)
        const activeFans = new Set(txs.filter(tx => tx.status === 'success').map(tx => tx.fanUid));
        
        // 3. 已發放限定證明 (總成功贊助次數)
        const totalBadges = txs.filter(tx => tx.status === 'success').length;
        
        // 4. 更新 KPI UI
        updateKpiUI(monthlyTotal, activeFans.size, totalBadges);
        
        // [Task 5 Step 2] 更新 Active Milestones Table
        renderActiveMilestonesTable(milestones);

        // [Task 5 Step 3] 更新 Recent Top Fans List
        renderRecentTopFansList(txs);
        
    } catch (err) {
        console.error('[Dashboard] renderDashboardOverview error:', err);
    }
};

function updateKpiUI(monthlyTotal, activeFansCount, totalBadges) {
    const pointsEl = document.getElementById('kpi-monthly-points');
    if (pointsEl) {
        pointsEl.innerHTML = `${monthlyTotal.toLocaleString()} <span class="trend positive"><i class="fas fa-arrow-up"></i> 100%</span>`;
    }
    
    const fansEl = document.getElementById('kpi-active-fans');
    if (fansEl) {
        fansEl.innerHTML = `${activeFansCount.toLocaleString()} <span class="trend positive"><i class="fas fa-arrow-up"></i> 🆕</span>`;
    }
    
    const badgesEl = document.getElementById('kpi-issued-badges');
    if (badgesEl) {
        badgesEl.innerHTML = `${totalBadges.toLocaleString()} <span class="trend neutral">-</span>`;
    }
    
    const viewsEl = document.getElementById('kpi-page-views');
    if (viewsEl) {
        const estimatedViews = activeFansCount > 0 ? (activeFansCount * 5.5).toFixed(1) : '0';
        viewsEl.innerHTML = `${estimatedViews}K <span class="trend positive"><i class="fas fa-arrow-up"></i> 8.4%</span>`;
    }
}

function renderActiveMilestonesTable(milestones) {
    const tbody = document.getElementById('active-milestones-tbody');
    if (!tbody) return;
    
    // 過濾進行中的 (已發布且未過期的，或簡單過濾 published)
    const active = milestones.filter(m => m.status === 'published' || m.status === 'active');
    
    if (active.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">尚無進行中的里程碑</td></tr>';
        return;
    }

    tbody.innerHTML = active.slice(0, 5).map(m => {
        const goal = Number(m.targetAmount || m.goal || 0);
        const current = Number(m.currentAmount || 0);
        const progress = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
        
        // 根據類型選擇圖示
        let icon = 'fa-bullseye';
        if (m.type === 'recording') icon = 'fa-microphone';
        if (m.type === 'model') icon = 'fa-vr-cardboard';
        if (m.type === 'event') icon = 'fa-calendar-star';
        
        return `
            <tr>
                <td>
                    <div class="table-item-title">
                        <div class="item-icon-small"><i class="fas ${icon}"></i></div>
                        <span>${escapeHtml(m.title)}</span>
                    </div>
                </td>
                <td>
                    <div class="table-progress">
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill" style="width:${progress}%;"></div>
                        </div>
                        <span class="progress-percent">${progress}%</span>
                    </div>
                </td>
                <td class="font-mono">${current.toLocaleString()}</td>
                <td class="font-mono text-muted">${goal.toLocaleString()}</td>
                <td>
                    <button class="btn-table-action edit" title="編輯項目" onclick="window.showToast('里程碑編輯功能開發中', 'info')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-table-action rank" title="查看排行榜" onclick="window.showToast('排行榜功能開發中', 'info')">
                        <i class="fas fa-list-ol"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderRecentTopFansList(txs) {
    const list = document.getElementById('recent-top-fans-list');
    if (!list) return;

    // 取得所有成功的交易
    const successfulTxs = txs.filter(tx => tx.status === 'success');
    
    // 依 fanUid 分組統計總金額
    const fanGroups = {};
    successfulTxs.forEach(tx => {
        const uid = tx.fanUid || 'guest-' + tx.fanName; // 處理匿名或無 UID 情況
        if (!fanGroups[uid]) {
            fanGroups[uid] = {
                name: tx.fanName || '匿名粉絲',
                totalAmount: 0,
                lastDate: tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(0)
            };
        }
        fanGroups[uid].totalAmount += (Number(tx.amount) || 0);
        const txDate = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(0);
        if (txDate > fanGroups[uid].lastDate) {
            fanGroups[uid].lastDate = txDate;
        }
    });

    const topFans = Object.values(fanGroups)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 3);

    if (topFans.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">尚無贊助紀錄</div>';
        return;
    }

    const icons = ['fa-user-astronaut', 'fa-user-ninja', 'fa-user-secret'];

    list.innerHTML = topFans.map((fan, idx) => {
        const timeStr = formatTimeAgo(fan.lastDate);
        
        return `
            <div class="fan-list-item">
                <div class="fan-avatar"><i class="fas ${icons[idx] || 'fa-user'}"></i></div>
                <div class="fan-details">
                    <span class="fan-name">${escapeHtml(fan.name)}</span>
                    <span class="fan-time text-muted">${timeStr}</span>
                </div>
                <div class="fan-contribution text-primary">+ ${Number(fan.totalAmount || 0).toLocaleString()} 點</div>
            </div>
        `;
    }).join('');
}

function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return '剛才';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} 分鐘前`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} 小時前`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} 天前`;
    
    return date.toLocaleDateString();
}

// ==== CRM Logic ====
let crmData = [];
let crmMilestoneMap = {};

window.renderCRM = async () => {
    const tbody = document.getElementById('crm-tbody');
    const milestoneSelect = document.getElementById('crm-filter-milestone');
    
    if (!tbody) return;
    
    try {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">載入資料中...</td></tr>`;
        
        if (!window.currentUid) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">尚未登入</td></tr>`;
            return;
        }

        if (!window.PaymentService) {
            console.warn('[renderCRM] PaymentService is not loaded yet');
            return;
        }

        const txs = await window.PaymentService.getTransactions(window.currentUid);
        const milestones = await window.MilestonesService.getMilestones(window.currentUid);
        
        crmMilestoneMap = {};
        let milestoneOptions = '<option value="">所有里程碑</option>';
        milestones.forEach(m => {
            crmMilestoneMap[m.id] = m.title || `里程碑 ${m.id}`;
            milestoneOptions += `<option value="${m.id}">${crmMilestoneMap[m.id]}</option>`;
        });
        
        if (milestoneSelect && milestoneSelect.options.length <= 1) {
            milestoneSelect.innerHTML = milestoneOptions;
        }

        crmData = txs.map(tx => ({
            ...tx,
            milestoneTitle: crmMilestoneMap[tx.milestoneId] || tx.milestoneId || '無特定里程碑',
            fanName: tx.fanName || tx.fanUid || '匿名粉絲'
        }));
        
        applyCRMFilters();
    } catch (err) {
        console.error('[renderCRM] error:', err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: red;">無法載入 CRM 資料</td></tr>`;
    }
};

window.applyCRMFilters = () => {
    const searchVal = document.getElementById('crm-search')?.value.toLowerCase() || '';
    const filterMs = document.getElementById('crm-filter-milestone')?.value || '';
    const tbody = document.getElementById('crm-tbody');
    
    if (!tbody) return;

    let filtered = crmData.filter(tx => {
        const matchSearch = tx.fanName.toLowerCase().includes(searchVal) || 
                            (tx.message && tx.message.toLowerCase().includes(searchVal)) || 
                            tx.fanUid?.toLowerCase().includes(searchVal);
        const matchMs = filterMs ? tx.milestoneId === filterMs : true;
        return matchSearch && matchMs;
    });

    filtered.sort((a, b) => {
        let valA = a[crmSortKey];
        let valB = b[crmSortKey];

        // Handle timestamps
        if (crmSortKey === 'createdAt') {
            valA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            valB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        } else if (crmSortKey === 'amount') {
            valA = Number(a.amount) || 0;
            valB = Number(b.amount) || 0;
        } else {
            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();
        }

        if (valA < valB) return crmSortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return crmSortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #64748b;">暫無符合條件的贊助紀錄</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(tx => {
        const dateStr = tx.createdAt && tx.createdAt.toDate ? tx.createdAt.toDate().toLocaleString('zh-TW', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit'
        }) : '未知日期';
        
        let statusTag = '';
        if (tx.status === 'success') statusTag = '<span class="tag t-blue" style="font-size:0.75rem;">成功</span>';
        else if (tx.status === 'pending') statusTag = '<span class="tag t-purple" style="font-size:0.75rem;">處理中</span>';
        else statusTag = `<span class="tag" style="background:#e2e8f0;font-size:0.75rem;">${tx.status||'不明'}</span>`;

        return `
            <tr>
                <td>${tx.fanName}</td>
                <td>${tx.milestoneTitle}</td>
                <td class="text-primary font-mono">${Number(tx.amount || 0).toLocaleString()}</td>
                <td>${dateStr}</td>
                <td>${statusTag}</td>
                <td class="crm-comment-cell">
                    ${tx.message ? `
                        <div class="crm-comment-text">${tx.message}</div>
                        ${tx.message.length > 40 ? '<button class="btn-text-link" onclick="toggleCRMComment(this)">查看更多</button>' : ''}
                    ` : '<span style="color:#cbd5e1;">無留言</span>'}
                </td>
            </tr>
        `;
    }).join('');
};

document.addEventListener('DOMContentLoaded', () => {
    // CRM Events
    document.getElementById('crm-search')?.addEventListener('input', applyCRMFilters);
    document.getElementById('crm-filter-milestone')?.addEventListener('change', applyCRMFilters);
    
    document.getElementById('btn-export-crm')?.addEventListener('click', () => {
        if (window.PaymentService && typeof window.PaymentService.exportToCSV === 'function') {
            const searchVal = document.getElementById('crm-search')?.value.toLowerCase() || '';
            const filterMs = document.getElementById('crm-filter-milestone')?.value || '';
            
            let filtered = crmData.filter(tx => {
                const matchSearch = tx.fanName.toLowerCase().includes(searchVal) || 
                                    (tx.message && tx.message.toLowerCase().includes(searchVal)) || 
                                    tx.fanUid?.toLowerCase().includes(searchVal);
                const matchMs = filterMs ? tx.milestoneId === filterMs : true;
                return matchSearch && matchMs;
            });
            filtered.sort((a, b) => {
                let valA = a[crmSortKey];
                let valB = b[crmSortKey];
                if (crmSortKey === 'createdAt') {
                    valA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                    valB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                } else if (crmSortKey === 'amount') {
                    valA = Number(a.amount) || 0;
                    valB = Number(b.amount) || 0;
                } else {
                    valA = String(valA || '').toLowerCase();
                    valB = String(valB || '').toLowerCase();
                }
                if (valA < valB) return crmSortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return crmSortOrder === 'asc' ? 1 : -1;
                return 0;
            });
            window.PaymentService.exportToCSV(filtered, 'V-UP_Sponsors_Report.csv');
        } else {
            showToast('匯出服務未準備好', 'error');
        }
    });
});

// ============================================
//  AI Suggestion Functions
// ============================================

window.openMilestoneAIModal = function() {
    const modal = document.getElementById('milestone-ai-modal');
    if (modal) modal.style.display = 'flex';
};

window.closeMilestoneAIModal = function() {
    const modal = document.getElementById('milestone-ai-modal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('ms-ai-results').style.display = 'none';
        document.getElementById('ms-ai-prompt').value = '';
    }
};

window.generateMilestoneSuggestions = function() {
    const btn = document.getElementById('ms-ai-generate-btn');
    const results = document.getElementById('ms-ai-results');
    const prompt = document.getElementById('ms-ai-prompt').value;

    if (!prompt.trim()) {
        showToast('請輸入一些想法 or 靈感', 'warning');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI 思考中...';

    // Mock AI Delay
    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sparkles"></i> 重新生成提案';
        results.style.display = 'block';
        
        // Insights are now pre-rendered, we could update them here with specific data if needed.
        
        results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 1500);
};

window.selectAISuggestion = function(title, goal, desc) {
    closeMilestoneAIModal();
    if (typeof window.openNewMilestoneModal === 'function') {
        window.openNewMilestoneModal();
        
        // Fill the new milestone form
        document.getElementById('ms-title').value = title;
        document.getElementById('ms-goal').value = goal;
        document.getElementById('ms-desc').value = desc;
        
        showToast('已套用 AI 建議方案，您可以繼續修改細節。', 'success');
    }
};

window.openPostAIModal = function() {
    const modal = document.getElementById('post-ai-modal');
    if (modal) modal.style.display = 'flex';
};

window.closePostAIModal = function() {
    const modal = document.getElementById('post-ai-modal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('post-ai-results').style.display = 'none';
        document.getElementById('post-ai-prompt').value = '';
    }
};

window.generatePostSuggestions = function() {
    const btn = document.getElementById('post-ai-generate-btn');
    const results = document.getElementById('post-ai-results');
    const prompt = document.getElementById('post-ai-prompt').value;

    if (!prompt.trim()) {
        showToast('請告訴 AI 您想發布什麼樣的內容', 'warning');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI 撰寫中...';

    // Mock AI Delay
    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sparkles"></i> 重新生成草稿';
        results.style.display = 'block';

        // Insights are now pre-rendered, we could update them here with specific data if needed.

        results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 1500);
};

window.selectAIPost = function(content) {
    const input = document.getElementById('vt-post-input');
    if (input) {
        input.value = content;
        closePostAIModal();
        showToast('已套用 AI 貼文草稿。', 'success');
    }
};


