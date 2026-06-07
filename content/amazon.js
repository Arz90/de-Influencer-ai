/**
 * De-Influencer AI — Módulo Amazon
 * Fase 1: esqueleto del Panel Lateral con análisis de marcador
 * Fase 3: Análisis real de IA sobre reseñas de 1-2 estrellas
 */

const DEBUG = true;
const DI_DAILY_LIMIT = 5;
const DI_INJECTED_ATTR = 'data-di-injected';

function log(...args) {
  if (DEBUG) console.log('[DI Amazon]', ...args);
}

log('Script cargado en', location.href);

// ─── Punto de entrada ─────────────────────────────────────────────
function init() {
  if (!isProductPage()) {
    log('Página actual no es una página de producto — módulo inactivo');
    return;
  }

  log('Página de producto detectada — buscando elemento objetivo');
  // Se prueban múltiples selectores — el layout de Amazon varía según el idioma/región
  waitForElement('#desktop-dp-sims, #rightCol, #buybox', (targetEl) => {
    log('Elemento objetivo encontrado:', targetEl.id || targetEl.className);
    injectPanel(targetEl);
  });
}

// ─── Inyección del panel ──────────────────────────────────────────
function injectPanel(targetEl) {
  if (document.querySelector(`.di-panel[${DI_INJECTED_ATTR}], .di-upgrade[${DI_INJECTED_ATTR}]`)) {
    log('Panel ya inyectado en esta página — omitiendo');
    return;
  }

  chrome.storage.local.get(['usageCount', 'isPro'], (data) => {
    if (chrome.runtime.lastError) {
      console.warn('[DI Amazon] Error al leer almacenamiento — omitiendo inyección:', chrome.runtime.lastError);
      return;
    }

    const usageCount = data.usageCount || 0;
    const isPro = data.isPro || false;
    const limitReached = usageCount >= DI_DAILY_LIMIT && !isPro;

    log('Almacenamiento leído — usageCount:', usageCount, '| isPro:', isPro, '| límite alcanzado:', limitReached);

    if (limitReached) {
      log('Límite diario alcanzado — mostrando prompt de upgrade');
    } else {
      log('Dentro del límite — inyectando panel de análisis');
    }

    const el = limitReached ? buildUpgradePrompt() : buildPanel();
    targetEl.insertAdjacentElement('afterend', el);
    log('Panel inyectado correctamente en el DOM');

    if (!limitReached) {
      chrome.storage.local.set({ usageCount: usageCount + 1 }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[DI Amazon] Error al incrementar contador:', chrome.runtime.lastError);
          return;
        }
        log('Contador incrementado a', usageCount + 1);
      });
    }
  });
}

// ─── Panel Lateral ────────────────────────────────────────────────
function buildPanel() {
  const div = document.createElement('div');
  div.className = 'di-panel';
  div.setAttribute(DI_INJECTED_ATTR, 'true');
  // Fase 1: datos de marcador. Fase 3: análisis real de reseñas mediante IA
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

// ─── Prompt de upgrade ────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────
function isProductPage() {
  return /\/dp\/[A-Z0-9]{10}/i.test(location.pathname);
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
      console.warn('[DI Amazon] Elemento no encontrado tras', maxAttempts, 'intentos:', selector);
    }
  }, 300);
}

// ─── Inicio ───────────────────────────────────────────────────────
init();
