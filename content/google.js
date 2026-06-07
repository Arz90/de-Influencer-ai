/**
 * De-Influencer AI — Módulo Google Search
 * Fase 1: esqueleto de detección únicamente — sin UI visible
 * Fase 3: difuminado de granjas SEO + widget honesto de Reddit
 */

const DEBUG = true;
const DI_SCANNED_ATTR = 'data-di-scanned';

let observer = null;

function log(...args) {
  if (DEBUG) console.log('[DI Google]', ...args);
}

log('Script cargado en', location.href);

// ─── Punto de entrada ─────────────────────────────────────────────
function init() {
  log('Inicializando módulo Google Search — buscando contenedor de resultados');
  waitForElement('#rcnt, #search', (container) => {
    log('Contenedor de resultados encontrado:', container.id);
    scanResults(container);
    attachObserver(container);
  });
}

// ─── Escaneo de resultados ────────────────────────────────────────
function scanResults(container) {
  const results = container.querySelectorAll(`.g:not([${DI_SCANNED_ATTR}])`);
  log('Escaneando resultados — encontrados', results.length, 'sin procesar');
  results.forEach((el) => {
    el.setAttribute(DI_SCANNED_ATTR, 'true');
    // Fase 1: solo registro. Fase 3: difuminar granjas SEO, inyectar widget de Reddit
    log('Resultado escaneado —', el.querySelector('h3')?.textContent);
  });
}

// ─── MutationObserver para carga dinámica de resultados ──────────
function attachObserver(container) {
  if (observer) {
    log('Reconectando MutationObserver al contenedor');
    observer.disconnect();
  } else {
    log('Conectando MutationObserver al contenedor');
  }

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
      console.warn('[DI Google] Contenedor no encontrado tras', maxAttempts, 'intentos:', selector);
    }
  }, 300);
}

// ─── Inicio ───────────────────────────────────────────────────────
init();
