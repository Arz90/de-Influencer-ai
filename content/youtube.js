/**
 * De-Influencer AI — Módulo YouTube
 * Fase 1: MutationObserver + esqueleto del banner Brutal Card
 * Fase 3: El análisis real de IA sustituye el texto de marcador
 */

const DEBUG = true;
const DI_DAILY_LIMIT = 5;
const DI_INJECTED_ATTR = 'data-di-injected';
const DI_REWRITTEN_ATTR = 'data-di-rewritten';

let currentUrl = location.href;
let spaNavInterval = null;

function log(...args) {
  if (DEBUG) console.log('[DI YouTube]', ...args);
}

log('Script cargado en', location.href);

// ─── Punto de entrada ────────────────────────────────────────────
function init() {
  log('Inicializando módulo YouTube');
  observeSpaNavigation();
  handlePageChange();
}

// ─── Navegación SPA: sondear cambios de URL ──────────────────────
// YouTube empuja el historial sin disparar eventos de navegación estándar.
// El sondeo de URL es más simple y fiable que un MutationObserver en ytd-app
// para detectar específicamente la navegación a /watch. La Fase 3 puede refinarlo.
function observeSpaNavigation() {
  spaNavInterval = setInterval(() => {
    if (location.href !== currentUrl) {
      log('Cambio de URL detectado:', currentUrl, '→', location.href);
      currentUrl = location.href;
      handlePageChange();
    }
  }, 1000);
}

// ─── Manejador de cambio de página ───────────────────────────────
function handlePageChange() {
  rewriteFeedTitles();

  if (!isWatchPage()) {
    log('Página actual no es un vídeo — omitiendo inyección de banner');
    return;
  }

  log('Página de vídeo detectada — buscando elemento player');
  // #player-container-inner es el contenedor interno; #movie_player es el elemento de vídeo en sí.
  // Se prueban ambos para manejar las variaciones del DOM de YouTube según el tipo de página.
  waitForElement('#movie_player, #player-container-inner', (playerEl) => {
    log('Player encontrado — procediendo a inyectar banner');
    injectBanner(playerEl);
  });
}

// ─── Reescritura de títulos (Feed + resultados de búsqueda) ─────
function rewriteFeedTitles() {
  const selectors = [
    `ytd-rich-item-renderer a#video-title:not([${DI_REWRITTEN_ATTR}])`,
    `ytd-video-renderer a#video-title:not([${DI_REWRITTEN_ATTR}])`,
    `ytd-compact-video-renderer a#video-title:not([${DI_REWRITTEN_ATTR}])`
  ].join(', ');

  const elements = document.querySelectorAll(selectors);
  log('Reescribiendo títulos — encontrados', elements.length, 'sin procesar');

  elements.forEach((el) => {
    el.setAttribute(DI_REWRITTEN_ATTR, 'true');
    // Fase 1: prefijo estático. Fase 3: la IA genera el título honesto
    if (el.textContent && !el.textContent.startsWith('[HONESTO]')) {
      el.textContent = '[HONESTO] ' + el.textContent;
    }
  });
}

// ─── Inyección del banner ────────────────────────────────────────
function injectBanner(playerEl) {
  const container = playerEl.parentElement;
  if (!container) return;

  // Guardia: no inyectar dos veces en la misma página
  if (container.querySelector(`.di-banner[${DI_INJECTED_ATTR}], .di-upgrade[${DI_INJECTED_ATTR}]`)) {
    log('Banner ya inyectado en esta página — omitiendo');
    return;
  }

  chrome.storage.local.get(['usageCount', 'isPro'], (data) => {
    if (chrome.runtime.lastError) {
      console.warn('[DI YouTube] Error al leer almacenamiento — omitiendo inyección:', chrome.runtime.lastError);
      return;
    }

    const usageCount = data.usageCount || 0;
    const isPro = data.isPro || false;
    const limitReached = usageCount >= DI_DAILY_LIMIT && !isPro;

    log('Almacenamiento leído — usageCount:', usageCount, '| isPro:', isPro, '| límite alcanzado:', limitReached);

    if (limitReached) {
      log('Límite diario alcanzado — mostrando prompt de upgrade');
    } else {
      log('Dentro del límite — inyectando banner de análisis');
    }

    const el = limitReached ? buildUpgradePrompt() : buildBanner();
    container.insertBefore(el, playerEl);
    log('Banner inyectado correctamente en el DOM');

    if (!limitReached) {
      chrome.storage.local.set({ usageCount: usageCount + 1 }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[DI YouTube] Error al incrementar contador:', chrome.runtime.lastError);
          return;
        }
        log('Contador incrementado a', usageCount + 1);
      });
    }
  });
}

// ─── Banner Brutal Card ──────────────────────────────────────────
function buildBanner() {
  const div = document.createElement('div');
  div.className = 'di-banner';
  div.setAttribute(DI_INJECTED_ATTR, 'true');
  // Fase 1: texto de marcador. Fase 3: sustituido por la salida real de la IA
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

// ─── Prompt de upgrade ───────────────────────────────────────────
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
      console.warn('[DI YouTube] Elemento no encontrado tras', maxAttempts, 'intentos:', selector);
    }
  }, 300);
}

// ─── Inicio ───────────────────────────────────────────────────────
init();
