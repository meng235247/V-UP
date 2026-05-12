export function startDemoGuide(steps = []) {
  if (!Array.isArray(steps) || steps.length === 0) return;

  let idx = -1;
  const overlay = document.createElement('div');
  overlay.className = 'demo-guide-overlay';
  overlay.id = 'demo-guide-overlay';
  const tip = document.createElement('div');
  tip.className = 'demo-guide-tip';
  tip.id = 'demo-guide-tip';

  function clearHighlight() {
    document.querySelectorAll('.demo-highlight').forEach((el) => el.classList.remove('demo-highlight'));
  }

  function end() {
    clearHighlight();
    overlay.remove();
    tip.remove();
  }

  function waitForEventOnce(eventName) {
    return new Promise((resolve) => {
      const handler = () => {
        window.removeEventListener(eventName, handler);
        resolve();
      };
      window.addEventListener(eventName, handler, { once: true });
    });
  }

  function wait(ms = 0) {
    if (!ms || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function next() {
    idx += 1;
    if (idx >= steps.length) {
      end();
      return;
    }
    clearHighlight();
    const step = steps[idx];
    if (step.waitForEvent) {
      await waitForEventOnce(step.waitForEvent);
    }
    if (step.waitAfterEventMs) {
      await wait(step.waitAfterEventMs);
    }
    const target = document.querySelector(step.target);
    if (!target) {
      next();
      return;
    }
    if (step.autoScroll !== false) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: step.scrollBlock || 'center',
        inline: 'nearest'
      });
      await wait(step.scrollSettleMs || 380);
    }
    target.classList.add('demo-highlight');
    const rect = target.getBoundingClientRect();
    const top = Math.min(window.innerHeight - 160, rect.bottom + 10);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - 360));

    tip.style.top = `${top + window.scrollY}px`;
    tip.style.left = `${left + window.scrollX}px`;
    tip.innerHTML = `
      <p>${step.text || ''}</p>
      <div class="demo-guide-actions">
        <button id="demo-guide-next" class="demo-btn demo-btn-primary">${step.buttonText || '下一步'}</button>
        <button id="demo-guide-skip" class="demo-btn demo-btn-secondary">跳過</button>
      </div>
    `;
    tip.querySelector('#demo-guide-next')?.addEventListener('click', next);
    tip.querySelector('#demo-guide-skip')?.addEventListener('click', end);
  }

  document.body.appendChild(overlay);
  document.body.appendChild(tip);
  next();
}
