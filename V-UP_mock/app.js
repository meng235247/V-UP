// Tab Switching Logic
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons and panes
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
        
        // Add active class to clicked button and target pane
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        const targetPane = document.getElementById(targetId);
        targetPane.style.display = 'block';
        setTimeout(() => targetPane.classList.add('active'), 50);
    });
});

// Expandable Fan Ranking Logic
const mockRanks = [
    { rank: 4, name: '喵喵拳', amount: '2,100', icon: 'fa-cat' },
    { rank: 5, name: '星辰之光', amount: '1,850', icon: 'fa-star' },
    { rank: 6, name: '初雪', amount: '1,500', icon: 'fa-snowflake' },
    { rank: 7, name: 'VTuber單推人', amount: '1,200', icon: 'fa-heart' },
    { rank: 8, name: '閃耀的寶石', amount: '1,000', icon: 'fa-gem' },
    { rank: 9, name: '雲端漫步者', amount: '800', icon: 'fa-cloud' },
    { rank: 10, name: '默默守護', amount: '500', icon: 'fa-shield-alt' }
];

let ranksExpanded = false;

function toggleRanks(milestoneId) {
    const container = document.getElementById(`more-ranks-${milestoneId}`);
    const btn = container.nextElementSibling;
    
    if (!ranksExpanded) {
        // Generate remaining ranks dynamically
        container.innerHTML = mockRanks.map(r => `
            <li class="rank-item" style="animation: fadeInDown 0.3s ease forwards; opacity: 0; animation-delay: ${ (r.rank-3)*0.05 }s">
                <span class="rank-badge">${r.rank}</span>
                <div class="fan-info">
                    <div class="fan-avatar"><i class="fas ${r.icon}"></i></div>
                    <span class="fan-name">${r.name}</span>
                </div>
                <span class="fan-amount">${r.amount} 點</span>
            </li>
        `).join('');
        btn.innerHTML = '收起榜單 <i class="fas fa-chevron-up"></i>';
        ranksExpanded = true;
    } else {
        container.innerHTML = '';
        btn.innerHTML = '展開完整榜單 <i class="fas fa-chevron-down"></i>';
        ranksExpanded = false;
    }
}

// Editable Marquee Logic
const marqueeModal = document.getElementById('marquee-modal');
const marqueeText = document.getElementById('marquee-text');
const marqueeInput = document.getElementById('marquee-input');
const editMarqueeBtn = document.getElementById('edit-marquee-btn');

editMarqueeBtn.addEventListener('click', () => {
    marqueeModal.style.display = 'flex';
});

function closeMarqueeModal() {
    marqueeModal.style.display = 'none';
}

function saveMarquee() {
    const newText = marqueeInput.value.trim();
    if (newText) {
        // Replicate text twice for seamless continuous scrolling illusion
        marqueeText.innerHTML = `${newText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${newText}`;
    }
    closeMarqueeModal();
}

// Editable Image Logic (Avatar & Banner)
const avatarUpload = document.getElementById('avatar-upload');
const avatarImg = document.getElementById('vtuber-avatar-img');
const postAvatarImg = document.getElementById('post-avatar-img');

avatarUpload.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            avatarImg.src = e.target.result;
            // Also update avatar in the exclusive post to match!
            if(postAvatarImg) postAvatarImg.src = e.target.result;
        }
        reader.readAsDataURL(this.files[0]);
    }
});

const bgUpload = document.getElementById('bg-upload');
const vtuberBanner = document.getElementById('vtuber-banner');

bgUpload.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            vtuberBanner.style.backgroundImage = `url('${e.target.result}')`;
        }
        reader.readAsDataURL(this.files[0]);
    }
});
