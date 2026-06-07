/**
 * De-Influencer AI — Módulo Google Search
 * Fase 2: detección heurística de granjas SEO + blur overlay + banner Reddit
 * Fase 3: análisis con IA reemplaza las heurísticas de señales
 */

const DEBUG = true;
const DI_SCANNED_ATTR = 'data-di-scanned';
const DI_REDDIT_ATTR = 'data-di-reddit-injected';
const SPAM_THRESHOLD = 2;

let observer = null;

function log(...args) { diLog('[DI Google]', DEBUG, ...args); }

log('Script cargado en', location.href);

// ─── Punto de entrada ─────────────────────────────────────────────
function init() {
  log('Inicializando módulo Google Search');
  waitForElement('#rcnt, #search', (container) => {
    log('Contenedor de resultados encontrado:', container.id || container.className);
    injectRedditBanner(container);
    scanResults(container);
    attachObserver(container);
  });
}

// ─── Banner de Reddit ─────────────────────────────────────────────
// Inyectado una sola vez sobre los resultados orgánicos.
// Enlaza a Reddit Search con la query actual. No consume usageCount.
function injectRedditBanner(container) {
  if (container.hasAttribute(DI_REDDIT_ATTR)) {
    log('Banner Reddit ya inyectado — omitiendo');
    return;
  }

  const query = new URLSearchParams(location.search).get('q');
  if (!query) {
    log('No se encontró parámetro q en la URL — omitiendo banner Reddit');
    return;
  }

  const redditUrl = 'https://www.reddit.com/search?q=' + encodeURIComponent(query);

  const banner = document.createElement('div');
  banner.className = 'di-google-banner';
  banner.innerHTML = `
    <span class="di-google-banner__badge">&#11014; REDDIT</span>
    <div class="di-google-banner__text">
      <strong>¿Opiniones reales?</strong> La IA del marketing no llega a Reddit. Busca lo que dicen los usuarios de verdad.
    </div>
    <a class="di-google-banner__cta" href="${redditUrl}" target="_blank" rel="noopener noreferrer">Buscar en Reddit &#8594;</a>
  `;

  container.insertBefore(banner, container.firstChild);
  container.setAttribute(DI_REDDIT_ATTR, 'true');
  log('Banner Reddit inyectado — query:', query);
}

// ─── Escaneo de resultados ────────────────────────────────────────
function scanResults(container) {
  const results = container.querySelectorAll(`.g:not([${DI_SCANNED_ATTR}])`);
  log('Escaneando resultados — encontrados', results.length, 'sin procesar');

  results.forEach((el) => {
    const score = detectSpamScore(el);
    if (score >= SPAM_THRESHOLD) {
      log('Granja SEO detectada (score=' + score + ') —', el.querySelector('h3')?.textContent?.trim());
      applyBlurOverlay(el);
      el.setAttribute(DI_SCANNED_ATTR, 'spam');
    } else {
      el.setAttribute(DI_SCANNED_ATTR, 'ok');
      log('Resultado limpio (score=' + score + ') —', el.querySelector('h3')?.textContent?.trim());
    }
  });
}

// ─── Detección de señales SEO spam ───────────────────────────────
// Devuelve un score 0-4. Umbral: SPAM_THRESHOLD (2) señales = marcado.
// Fase 3: reemplazado por análisis de IA (Gemini Nano).
function detectSpamScore(resultEl) {
  const h3Text = resultEl.querySelector('h3')?.textContent || '';
  if (!h3Text) return 0; // sin título visible = no procesar

  let score = 0;

  // Señal 1: superlativo + número en el título
  if (/\b(top\s*\d+|los?\s*\d+\s*mejores?|best\s*\d+|the\s*\d+\s*best)\b/i.test(h3Text)) {
    score++;
    log('Señal 1 (superlativo+número):', h3Text.trim());
  }

  // Señal 2: patrones clickbait en el título
  if (/[¡!]{2,}|DEFINITIV[AO]|OFERTA\s+LIMITADA|GRATIS\b/i.test(h3Text)) {
    score++;
    log('Señal 2 (clickbait):', h3Text.trim());
  }

  // Señal 3: indicadores de afiliado en el href del enlace principal
  // Se comprueba el atributo href — los parámetros utm_ solo aparecen en la URL.
  // Se excluye ref= por ser demasiado genérico (muchos sitios legítimos lo usan).
  const anchor = resultEl.querySelector('a[href]');
  const href = anchor ? (anchor.getAttribute('href') || '') : '';
  if (/\b(afiliado|aff=)|[?&]utm_/i.test(href)) {
    score++;
    log('Señal 3 (URL afiliado):', href);
  }

  // Señal 4: mención de afiliado o guía definitiva en el snippet
  // Google usa varias clases para el snippet según la versión de la UI
  const snippetEl = resultEl.querySelector('[data-sncf], .VwiC3b, .s3v9rd');
  const snippetText = snippetEl?.textContent || '';
  if (/enlace\s+de\s+afiliado|guía\s+definitiva|guia\s+definitiva/i.test(snippetText)) {
    score++;
    log('Señal 4 (snippet afiliado):', snippetText.trim().substring(0, 80));
  }

  return score;
}

// ─── Blur overlay en resultado spam ──────────────────────────────
// Envuelve el contenido en un div difuminado e inyecta un overlay con
// botón "mostrar" que revierte el blur si el usuario quiere verlo.
function applyBlurOverlay(resultEl) {
  // Envolver todo el contenido existente en el wrapper difuminado
  const blurWrapper = document.createElement('div');
  blurWrapper.className = 'di-google-blurred';
  while (resultEl.firstChild) {
    blurWrapper.appendChild(resultEl.firstChild);
  }
  resultEl.appendChild(blurWrapper);
  resultEl.style.position = 'relative';
  resultEl.style.overflow = 'hidden';

  // Overlay con badge + texto + botón revelar
  const overlay = document.createElement('div');
  overlay.className = 'di-google-overlay';
  overlay.innerHTML = `
    <span class="di-google-overlay__badge">&#9888; SEO SPAM</span>
    <span class="di-google-overlay__text">Granja de contenido detectada</span>
    <button class="di-google-overlay__reveal">mostrar &#8594;</button>
  `;

  // Botón revelar: deshace el blur y elimina el overlay
  overlay.querySelector('.di-google-overlay__reveal').addEventListener('click', () => {
    while (blurWrapper.firstChild) {
      resultEl.insertBefore(blurWrapper.firstChild, blurWrapper);
    }
    blurWrapper.remove();
    overlay.remove();
    resultEl.style.overflow = '';
    log('Resultado revelado por el usuario');
  });

  resultEl.appendChild(overlay);
}

// ─── MutationObserver para resultados cargados dinámicamente ─────
// Google puede cargar más resultados en paginación e infinite scroll.
function attachObserver(container) {
  if (observer) observer.disconnect();

  observer = new MutationObserver(() => {
    scanResults(container);
  });

  observer.observe(container, { childList: true, subtree: true });
  log('MutationObserver conectado al contenedor de resultados');
}

// ─── Inicio ───────────────────────────────────────────────────────
init();
