/**
 * De-Influencer AI — Amazon Module
 * Phase 1: Panel Lateral skeleton with placeholder analysis
 * Phase 3: Real AI analysis of 1-2 star reviews
 */

const DI_DAILY_LIMIT = 5;
const DI_INJECTED_ATTR = 'data-di-injected';

// ─── Entry Point ─────────────────────────────────────────────────
function init() {
  if (!isProductPage()) return;

  // Try multiple selectors — Amazon's layout varies by locale
  waitForElement('#desktop-dp-sims, #rightCol, #buybox', (targetEl) => {
    injectPanel(targetEl);
  });
}

// ─── Panel Injection ─────────────────────────────────────────────
function injectPanel(targetEl) {
  if (document.querySelector(`.di-panel[${DI_INJECTED_ATTR}], .di-upgrade[${DI_INJECTED_ATTR}]`)) return;

  chrome.storage.local.get(['usageCount', 'isPro'], (data) => {
    if (chrome.runtime.lastError) {
      console.warn('[DI] Amazon: storage read failed, skipping injection');
      return;
    }

    const usageCount = data.usageCount || 0;
    const isPro = data.isPro || false;
    const limitReached = usageCount >= DI_DAILY_LIMIT && !isPro;

    const el = limitReached ? buildUpgradePrompt() : buildPanel();
    targetEl.insertAdjacentElement('afterend', el);

    if (!limitReached) {
      chrome.storage.local.set({ usageCount: usageCount + 1 }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[DI] Amazon: storage write failed:', chrome.runtime.lastError);
        }
      });
    }
  });
}

// ─── Panel Lateral ───────────────────────────────────────────────
function buildPanel() {
  const div = document.createElement('div');
  div.className = 'di-panel';
  div.setAttribute(DI_INJECTED_ATTR, 'true');
  // Phase 1: placeholder data. Phase 3: real review analysis from AI
  div.innerHTML = `
    <div class="di-panel__header">
      <span class="di-panel__logo">De-Influencer</span>
      <span class="di-panel__title">Veredicto real</span>
    </div>
    <div class="di-panel__item">
      <div class="di-panel__bullet">&#9888;</div>
      <div class="di-panel__text">
        <strong>Analizando rese&ntilde;as negativas...</strong>
        An&aacute;lisis completo disponible en Fase 3.
      </div>
    </div>
    <div class="di-panel__item">
      <div class="di-panel__bullet">&#128200;</div>
      <div class="di-panel__text">
        <strong>Autenticidad de rese&ntilde;as:</strong>
        Verificando patrones de compra coordinada.
      </div>
    </div>
    <div class="di-panel__item">
      <div class="di-panel__bullet">&#128178;</div>
      <div class="di-panel__text">
        <strong>Valor/Precio:</strong>
        Buscando alternativas comparables...
      </div>
    </div>
    <div class="di-panel__score">
      <div class="di-panel__score-circle">?</div>
      <div class="di-panel__score-label">
        <strong>Puntuaci&oacute;n honesta</strong>
        An&aacute;lisis de IA disponible en Fase 3
      </div>
    </div>
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
function isProductPage() {
  return /\/dp\/[A-Z0-9]{10}/.test(location.pathname) || location.pathname.includes('/dp/');
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
      console.warn('[DI] Amazon: element not found:', selector);
    }
  }, 300);
}

// ─── Start ───────────────────────────────────────────────────────
init();
