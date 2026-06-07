/**
 * De-Influencer AI — YouTube Module
 * Phase 1: MutationObserver + Brutal Card banner skeleton
 * Phase 3: Real AI analysis replaces placeholder text
 */

const DI_DAILY_LIMIT = 5;
const DI_INJECTED_ATTR = 'data-di-injected';
const DI_REWRITTEN_ATTR = 'data-di-rewritten';

let currentUrl = location.href;
let spaNavInterval = null;

// ─── Entry Point ────────────────────────────────────────────────
function init() {
  observeSpaNavigation();
  handlePageChange();
}

// ─── SPA Navigation: poll for URL changes ───────────────────────
// YouTube pushes history without triggering standard navigation events.
// URL polling is simpler and more reliable than a MutationObserver on ytd-app
// for detecting /watch navigation specifically. Phase 3 may refine this.
function observeSpaNavigation() {
  spaNavInterval = setInterval(() => {
    if (location.href !== currentUrl) {
      currentUrl = location.href;
      handlePageChange();
    }
  }, 1000);
}

// ─── Page Change Handler ─────────────────────────────────────────
function handlePageChange() {
  rewriteFeedTitles();

  if (!isWatchPage()) return;

  // #player-container-inner is the inner wrapper; #movie_player is the video element itself.
  // Both are tried to handle YouTube DOM variations across page types.
  waitForElement('#movie_player, #player-container-inner', (playerEl) => {
    injectBanner(playerEl);
  });
}

// ─── Title Rewriting (Feed + Search results) ────────────────────
function rewriteFeedTitles() {
  const selectors = [
    `ytd-rich-item-renderer a#video-title:not([${DI_REWRITTEN_ATTR}])`,
    `ytd-video-renderer a#video-title:not([${DI_REWRITTEN_ATTR}])`,
    `ytd-compact-video-renderer a#video-title:not([${DI_REWRITTEN_ATTR}])`
  ].join(', ');

  document.querySelectorAll(selectors).forEach((el) => {
    el.setAttribute(DI_REWRITTEN_ATTR, 'true');
    // Phase 1: Static prefix. Phase 3: AI generates honest title
    if (el.textContent && !el.textContent.startsWith('[HONESTO]')) {
      el.textContent = '[HONESTO] ' + el.textContent;
    }
  });
}

// ─── Banner Injection ────────────────────────────────────────────
function injectBanner(playerEl) {
  const container = playerEl.parentElement;
  if (!container) return;

  // Guard: don't inject twice on the same page
  if (container.querySelector(`.di-banner[${DI_INJECTED_ATTR}], .di-upgrade[${DI_INJECTED_ATTR}]`)) return;

  chrome.storage.local.get(['usageCount', 'isPro'], (data) => {
    if (chrome.runtime.lastError) {
      console.warn('[DI] YouTube: storage read failed, skipping injection');
      return;
    }

    const usageCount = data.usageCount || 0;
    const isPro = data.isPro || false;
    const limitReached = usageCount >= DI_DAILY_LIMIT && !isPro;

    const el = limitReached ? buildUpgradePrompt() : buildBanner();
    container.insertBefore(el, playerEl);

    if (!limitReached) {
      chrome.storage.local.set({ usageCount: usageCount + 1 }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[DI] YouTube: storage write failed:', chrome.runtime.lastError);
        }
      });
    }
  });
}

// ─── Brutal Card Banner ──────────────────────────────────────────
function buildBanner() {
  const div = document.createElement('div');
  div.className = 'di-banner';
  div.setAttribute(DI_INJECTED_ATTR, 'true');
  // Phase 1: placeholder text. Phase 3: replaced with real AI output
  div.innerHTML = `
    <div class="di-banner__icon">&#9888;</div>
    <div class="di-banner__content">
      <div class="di-banner__title">De-Influencer AI &mdash; An&aacute;lisis</div>
      <div class="di-banner__body">
        Analizando video... (An&aacute;lisis completo disponible en Fase 3 con IA integrada)
      </div>
    </div>
    <span class="di-banner__badge">ESCANEADO</span>
  `;
  return div;
}

// ─── Upgrade Prompt ──────────────────────────────────────────────
function buildUpgradePrompt() {
  const div = document.createElement('div');
  div.className = 'di-upgrade';
  div.setAttribute(DI_INJECTED_ATTR, 'true');
  div.innerHTML = `
    <div class="di-upgrade__text">
      <strong>L&iacute;mite diario alcanzado (5/5)</strong>
      Pasa a Pro para an&aacute;lisis ilimitados y el Modo C&iacute;nico Avanzado.
    </div>
    <button class="di-upgrade__cta">Ver Premium</button>
  `;
  return div;
}

// ─── Helpers ─────────────────────────────────────────────────────
function isWatchPage() {
  return location.pathname === '/watch';
}

function waitForElement(selector, callback, maxAttempts = 20) {
  let attempts = 0;
  const interval = setInterval(() => {
    const el = document.querySelector(selector);
    if (el) {
      clearInterval(interval);
      callback(el);
    } else if (++attempts >= maxAttempts) {
      clearInterval(interval);
      console.warn('[DI] YouTube: element not found:', selector);
    }
  }, 300);
}

// ─── Start ───────────────────────────────────────────────────────
init();
