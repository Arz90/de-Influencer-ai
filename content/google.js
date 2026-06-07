/**
 * De-Influencer AI — Google Search Module
 * Phase 1: Detection skeleton only — no visible UI
 * Phase 3: SEO farm blur + Reddit honest widget
 */

const DI_SCANNED_ATTR = 'data-di-scanned';

let observer = null;

// ─── Entry Point ─────────────────────────────────────────────────
function init() {
  waitForElement('#rcnt, #search', (container) => {
    scanResults(container);
    attachObserver(container);
  });
}

// ─── Scan Results ────────────────────────────────────────────────
function scanResults(container) {
  const results = container.querySelectorAll(`.g:not([${DI_SCANNED_ATTR}])`);
  results.forEach((el) => {
    el.setAttribute(DI_SCANNED_ATTR, 'true');
    // Phase 1: Log only. Phase 3: blur SEO farms, inject Reddit widget
    console.log('[DI] Google: result scanned —', el.querySelector('h3')?.textContent);
  });
}

// ─── MutationObserver for dynamic result loading ─────────────────
function attachObserver(container) {
  if (observer) observer.disconnect();

  observer = new MutationObserver(() => {
    scanResults(container);
  });

  observer.observe(container, { childList: true, subtree: true });
}

// ─── Helpers ─────────────────────────────────────────────────────
function waitForElement(selector, callback, maxAttempts = 20) {
  let attempts = 0;
  const interval = setInterval(() => {
    const el = document.querySelector(selector);
    if (el) {
      clearInterval(interval);
      callback(el);
    } else if (++attempts >= maxAttempts) {
      clearInterval(interval);
      console.warn('[DI] Google: container not found:', selector);
    }
  }, 300);
}

// ─── Start ───────────────────────────────────────────────────────
init();
