export function startDemoGuide(steps = []) {
  if (!Array.isArray(steps) || steps.length === 0) return;

  let idx = -1;
  const overlay = document.createElement('div');
  overlay.className = 'demo-guide-overlay';
  overlay.id = 'demo-guide-overlay';
  overlay.style.display = 'none';
  const tip = document.createElement('div');
  tip.className = 'demo-guide-tip';
  tip.id = 'demo-guide-tip';
  tip.style.display = 'none';

  function clearHighlight() {
    document.querySelectorAll('.demo-highlight').forEach((el) => el.classList.remove('demo-highlight'));
  }

  function end() {
    if (typeof window.anime !== 'undefined') {
      window.anime({
        targets: tip,
        opacity: [1, 0],
        translateY: [0, -10],
        scale: [1, 0.95],
        duration: 300,
        easing: 'easeInBack',
        complete: () => {
          clearHighlight();
          overlay.remove();
          tip.remove();
        }
      });
    } else {
      clearHighlight();
      overlay.remove();
      tip.remove();
    }
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

  function isCelebrationOpen() {
    const overlay = document.getElementById('milestone-celebrate-overlay');
    if (!overlay) return false;
    const style = window.getComputedStyle(overlay);
    return style.display !== 'none' && style.pointerEvents !== 'none';
  }

  function waitForCelebrationClose() {
    if (!isCelebrationOpen()) return Promise.resolve();
    return waitForEventOnce('vup:celebration-closed');
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
    overlay.style.display = 'none';
    tip.style.display = 'none';
    const step = steps[idx];
    if (step.waitForEvent) {
      await waitForEventOnce(step.waitForEvent);
    }
    if (step.waitAfterEventMs) {
      await wait(step.waitAfterEventMs);
    }
    await waitForCelebrationClose();
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
    overlay.style.display = 'block';
    target.classList.add('demo-highlight');
    tip.innerHTML = `
      <p>${step.text || ''}</p>
      <div class="demo-guide-actions">
        <button id="demo-guide-next" class="demo-btn demo-btn-primary">${step.buttonText || '下一步'}</button>
        <button id="demo-guide-skip" class="demo-btn demo-btn-secondary">跳過</button>
      </div>
    `;
    tip.style.visibility = 'hidden';
    tip.style.display = 'block';

    await new Promise((resolve) => requestAnimationFrame(resolve));

    const rect = target.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const gap = Number(step.tipGap || 12);
    const pad = Number(step.viewportPadding || 12);
    const placements = Array.isArray(step.placements) && step.placements.length
      ? step.placements
      : ['right', 'bottom', 'left', 'top'];

    const candidates = placements.map((place) => {
      let left = rect.left;
      let top = rect.top;
      if (place === 'right') {
        left = rect.right + gap;
        top = rect.top + (rect.height - tipRect.height) / 2;
      } else if (place === 'left') {
        left = rect.left - tipRect.width - gap;
        top = rect.top + (rect.height - tipRect.height) / 2;
      } else if (place === 'top') {
        left = rect.left + (rect.width - tipRect.width) / 2;
        top = rect.top - tipRect.height - gap;
      } else {
        left = rect.left + (rect.width - tipRect.width) / 2;
        top = rect.bottom + gap;
      }
      const fits = left >= pad
        && top >= pad
        && (left + tipRect.width) <= (window.innerWidth - pad)
        && (top + tipRect.height) <= (window.innerHeight - pad);
      return { place, left, top, fits };
    });

    const chosen = candidates.find((c) => c.fits) || candidates[0];
    const clampedLeft = Math.min(Math.max(chosen.left, pad), window.innerWidth - tipRect.width - pad);
    const clampedTop = Math.min(Math.max(chosen.top, pad), window.innerHeight - tipRect.height - pad);

    tip.style.left = `${clampedLeft + window.scrollX}px`;
    tip.style.top = `${clampedTop + window.scrollY}px`;
    tip.style.visibility = 'visible';

    if (typeof window.anime !== 'undefined') {
      window.anime({
        targets: tip,
        opacity: [0, 1],
        translateY: [20, 0],
        scale: [0.9, 1],
        duration: 800,
        easing: 'easeOutElastic(1, .7)'
      });

      window.anime({
        targets: target,
        scale: [1.03, 1],
        duration: 1000,
        easing: 'easeOutElastic(1, .6)'
      });
    }

    tip.querySelector('#demo-guide-next')?.addEventListener('click', next);
    tip.querySelector('#demo-guide-skip')?.addEventListener('click', end);
  }

  document.body.appendChild(overlay);
  document.body.appendChild(tip);
  next();
}
