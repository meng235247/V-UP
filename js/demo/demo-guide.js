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
    document.querySelectorAll('.demo-highlight').forEach(function(el) {
      el.classList.remove('demo-highlight');
    });
  }

  function end() {
    if (typeof window.anime !== 'undefined') {
      window.anime({
        targets: tip,
        opacity: [1, 0],
        translateY: [0, -10],
        scale: [1, 0.92],
        duration: 280,
        easing: 'easeInBack',
        complete: function() {
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
    return new Promise(function(resolve) {
      window.addEventListener(eventName, function handler() {
        window.removeEventListener(eventName, handler);
        resolve();
      }, { once: true });
    });
  }

  function isCelebrationOpen() {
    var cel = document.getElementById('milestone-celebrate-overlay');
    if (!cel) return false;
    var s = window.getComputedStyle(cel);
    return s.display !== 'none' && s.pointerEvents !== 'none';
  }

  function waitForCelebrationClose() {
    if (!isCelebrationOpen()) return Promise.resolve();
    return waitForEventOnce('vup:celebration-closed');
  }

  function wait(ms) {
    if (!ms || ms <= 0) return Promise.resolve();
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  function waitFrames(n) {
    n = n || 2;
    return new Promise(function(resolve) {
      var c = 0;
      function tick() { if (++c >= n) resolve(); else requestAnimationFrame(tick); }
      requestAnimationFrame(tick);
    });
  }

  /**
   * KEY FIX: Find the first element matching the selector that is
   * actually rendered with non-zero dimensions (i.e. visible/in-DOM).
   * Skips elements inside hidden containers (getBoundingClientRect returns zeros).
   */
  function findVisibleTarget(selector) {
    var elements = document.querySelectorAll(selector);
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var r = el.getBoundingClientRect();
      // An element with actual dimensions is renderable
      if (r.width > 0 && r.height > 0) {
        console.log('[DemoGuide] findVisibleTarget found visible element:', el, 'rect:', JSON.stringify(r));
        return el;
      }
    }
    // Fallback: return first element even if zero-size
    if (elements.length > 0) {
      console.warn('[DemoGuide] No visible target found for selector:', selector, '— using first match (zero-size)');
      return elements[0];
    }
    console.warn('[DemoGuide] No element found for selector:', selector);
    return null;
  }

  /**
   * Position the tooltip (position:fixed) adjacent to the target element.
   * All coordinates are in CSS viewport pixels — no scrollX/Y adjustment needed.
   */
  function placeTip(target, step) {
    var gap = Number(step.tipGap) || 16;
    var pad = Number(step.viewportPadding) || 12;

    // Move tip off-screen temporarily so offsetWidth/Height reflects true intrinsic size
    tip.style.visibility = 'hidden';
    tip.style.left = '-9999px';
    tip.style.top = '0px';
    tip.style.display = 'block';

    var tipW = tip.offsetWidth;
    var tipH = tip.offsetHeight;

    // Read target position AFTER scroll has settled
    var r = target.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    console.log('[DemoGuide] placeTip — target rect:', JSON.stringify(r), 'tipW:', tipW, 'tipH:', tipH, 'vw:', vw, 'vh:', vh);

    var placements = (Array.isArray(step.placements) && step.placements.length)
      ? step.placements
      : ['bottom', 'right', 'top', 'left'];

    // For mobile devices, prioritize vertical placements to avoid horizontal squishing
    if (vw < 768 && (!step.placements || step.placements.length === 0)) {
      placements = ['bottom', 'top'];
    }

    var chosen = null;
    for (var i = 0; i < placements.length; i++) {
      var place = placements[i];
      var left, top;
      if (place === 'right') {
        left = r.right + gap;
        top  = r.top + r.height / 2 - tipH / 2;
      } else if (place === 'left') {
        left = r.left - tipW - gap;
        top  = r.top + r.height / 2 - tipH / 2;
      } else if (place === 'top') {
        left = r.left + r.width / 2 - tipW / 2;
        top  = r.top - tipH - gap;
      } else { // bottom
        left = r.left + r.width / 2 - tipW / 2;
        top  = r.bottom + gap;
      }
      var fits = (left >= pad)
        && (top >= pad)
        && (left + tipW <= vw - pad)
        && (top + tipH <= vh - pad);
      if (fits) {
        chosen = { left: left, top: top };
        console.log('[DemoGuide] placement:', place, '→ left:', left, 'top:', top);
        break;
      }
    }

    if (!chosen) {
      // Fallback: below target
      chosen = {
        left: r.left + r.width / 2 - tipW / 2,
        top:  r.bottom + gap
      };
      console.log('[DemoGuide] fallback placement → left:', chosen.left, 'top:', chosen.top);
    }

    // Clamp so tooltip never leaves viewport, handling cases where tip is larger than viewport gracefully
    var maxLeft = Math.max(pad, vw - tipW - pad);
    var maxTop  = Math.max(pad, vh - tipH - pad);
    var finalLeft = Math.min(Math.max(chosen.left, pad), maxLeft);
    var finalTop  = Math.min(Math.max(chosen.top,  pad), maxTop);

    console.log('[DemoGuide] final position → left:', finalLeft, 'top:', finalTop);

    tip.style.left = finalLeft + 'px';
    tip.style.top  = finalTop  + 'px';
    tip.style.visibility = 'visible';
  }

  async function next() {
    idx += 1;
    if (idx >= steps.length) { end(); return; }

    clearHighlight();
    overlay.style.display = 'none';
    tip.style.display = 'none';

    var step = steps[idx];
    if (typeof step.beforeShow === 'function') {
      await Promise.resolve(step.beforeShow());
    }

    if (step.waitForEvent) await waitForEventOnce(step.waitForEvent);
    if (step.waitAfterEventMs) await wait(step.waitAfterEventMs);
    await waitForCelebrationClose();

    // Find the first VISIBLE (non-zero-size) element matching the selector
    var target = findVisibleTarget(step.target);
    if (!target) { next(); return; }

    // Scroll target to center of viewport and wait for scroll to finish
    target.scrollIntoView({
      behavior: 'smooth',
      block: step.scrollBlock || 'center',
      inline: 'nearest'
    });
    await wait(step.scrollSettleMs || 800);

    // Re-acquire rect AFTER scroll — re-query to be safe
    // (target reference itself stays the same DOM node)
    var postScrollRect = target.getBoundingClientRect();
    console.log('[DemoGuide] post-scroll rect for step', idx, ':', JSON.stringify(postScrollRect));

    // Show overlay + highlight the target
    overlay.style.display = 'block';
    target.classList.add('demo-highlight');

    // Render tooltip content
    tip.innerHTML =
      '<p>' + (step.text || '') + '</p>' +
      '<div class="demo-guide-actions">' +
        '<button id="demo-guide-next" class="demo-btn demo-btn-primary">' + (step.buttonText || '下一步') + '</button>' +
      '</div>';

    // Wait for browser to paint the tooltip content so measurements are accurate
    await waitFrames(3);

    // Compute and apply position (all viewport / position:fixed coordinates)
    placeTip(target, step);

    // Entrance animation
    if (typeof window.anime !== 'undefined') {
      window.anime({
        targets: tip,
        opacity: [0, 1],
        translateY: [14, 0],
        scale: [0.9, 1],
        duration: 550,
        easing: 'easeOutBack'
      });
      try {
        window.anime({
          targets: target,
          scale: [1, 1.04, 1],
          duration: 650,
          easing: 'easeInOutSine'
        });
      } catch (_) { /* ignore if element cannot be transformed */ }
    }

    var nextBtn = tip.querySelector('#demo-guide-next');
    if (nextBtn) nextBtn.addEventListener('click', next);
  }

  document.body.appendChild(overlay);
  document.body.appendChild(tip);
  next();
}
