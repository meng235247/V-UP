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
    'customization':  { title: '專屬頁面自訂 (Customization)', desc: '調整您的公開頁面視覺風格' },
    'settings':       { title: '帳號設定 (Settings)',        desc: '管理您的帳號資料與安全設定' },
};

document.addEventListener('DOMContentLoaded', () => {
    // Sidebar nav tab switch
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            const tab = item.dataset.tab;
            switchTab(tab);
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

    function addCollaboratorChip(value) {
        if (!collabList || !value) return;
        const exists = Array.from(collabList.querySelectorAll('.chip')).some(c => c.dataset.value === value);
        if (exists) { showToast('已加入此合作對象', 'info'); return; }
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.dataset.value = value;
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'chip-remove';
        removeBtn.title = '移除';
        removeBtn.innerText = '×';
        chip.appendChild(document.createTextNode(value));
        chip.appendChild(removeBtn);
        collabList.appendChild(chip);
        removeBtn.addEventListener('click', () => chip.remove());
    }

    if (collabAddBtn) {
        collabAddBtn.addEventListener('click', () => {
            const v = (collabSearch && collabSearch.value) ? collabSearch.value.trim() : '';
            if (!v) { showToast('請輸入合作對象名稱或 Email', 'error'); return; }
            addCollaboratorChip(v);
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
}

// ---- Milestone Modal ----
const milestoneModal = document.getElementById('milestone-modal');
function openNewMilestoneModal() {
    if (milestoneModal) milestoneModal.classList.add('open');
}
function closeNewMilestoneModal() {
    if (milestoneModal) milestoneModal.classList.remove('open');
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
        const collaborators = Array.from(collabEls).map(c => c.dataset.value);
        const award = document.querySelector('input[name="ms-award"]:checked')?.value === 'yes';
        const awardCount = award ? Number(document.getElementById('ms-award-count')?.value || 10) : 0;
        const featured = !!document.getElementById('ms-featured')?.checked;
        const hidden = !!document.getElementById('ms-hidden')?.checked;

        // read badge file if provided
        const badgeInputEl = document.getElementById('ms-badge-input');
        let badgeDataUrl = null;
        if (badgeInputEl && badgeInputEl.files && badgeInputEl.files[0]) {
            badgeDataUrl = await new Promise((res, rej) => {
                const fr = new FileReader();
                fr.onload = () => res(fr.result);
                fr.onerror = rej;
                fr.readAsDataURL(badgeInputEl.files[0]);
            });
        }

        const milestone = { title, goal, desc, isCollab, collaborators, award, awardCount, featured, hidden, badgeDataUrl, createdAt: new Date().toISOString() };

        // demo: persist locally
        const list = JSON.parse(localStorage.getItem('vup-milestones') || '[]');
        list.unshift(milestone);
        localStorage.setItem('vup-milestones', JSON.stringify(list));

        closeNewMilestoneModal();
        showToast(`里程碑「${title}」已建立，目標 ${Number(goal).toLocaleString()} 點`, 'success');
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
