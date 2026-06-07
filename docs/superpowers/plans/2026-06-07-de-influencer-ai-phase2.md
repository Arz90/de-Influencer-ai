# De-Influencer AI Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraer `waitForElement` a un utils compartido y reemplazar el esqueleto de Google Search con detección real de granjas SEO (blur+overlay) y un banner de Reddit.

**Architecture:** Monolito por plataforma — `content/utils.js` se inyecta como primer script en los tres bloques `content_scripts` de manifest.json, exponiendo globales (`waitForElement`, `diLog`) que los tres módulos consumen directamente. Sin bundler, sin imports. El módulo Google usa heurísticas de señales (score ≥ 2) para blur, sin IA (Phase 3 añadirá IA).

**Tech Stack:** Vanilla JS ES2020, Chrome Extension MV3, CSS custom properties (BEM `di-` namespace)

**Spec:** `docs/superpowers/specs/2026-06-07-de-influencer-ai-phase2-design.md`

---

## Chunk 1: Shared Utils + Manifest + Cleanup

### Task 1: Crear content/utils.js

**Files:**
- Create: `content/utils.js`

- [ ] **Step 1: Crear el archivo**

Crear `content/utils.js` con el siguiente contenido exacto:

```javascript
/**
 * De-Influencer AI — Utilidades compartidas
 * Inyectado como primer script en todos los bloques content_scripts.
 * Expone funciones globales disponibles para youtube.js, amazon.js y google.js.
 */

/**
 * Espera a que un elemento CSS esté disponible en el DOM.
 * Sondea cada 300ms hasta maxAttempts intentos.
 * @param {string} selector - Selector CSS
 * @param {function} callback - Se llama con el elemento encontrado
 * @param {number} maxAttempts - Máximo de intentos (default: 20 = ~6 segundos)
 */
function waitForElement(selector, callback, maxAttempts = 20) {
  let attempts = 0;
  const interval = setInterval(() => {
    const el = document.querySelector(selector);
    if (el) {
      clearInterval(interval);
      callback(el);
    } else if (++attempts >= maxAttempts) {
      clearInterval(interval);
      console.warn('[DI] Elemento no encontrado tras', maxAttempts, 'intentos:', selector);
    }
  }, 300);
}

/**
 * Log condicional con prefijo de módulo.
 * @param {string} prefix - Prefijo del módulo, ej: '[DI YouTube]'
 * @param {boolean} debug - Si false, no imprime nada
 * @param {...any} args - Argumentos a imprimir
 */
function diLog(prefix, debug, ...args) {
  if (debug) console.log(prefix, ...args);
}
```

- [ ] **Step 2: Verificar**

Confirmar que el archivo existe y tiene exactamente las dos funciones: `waitForElement` y `diLog`. No debe contener `export`, `import`, ni ninguna declaración de módulo ES6 — MV3 content scripts usan scope global.

- [ ] **Step 3: Commit**

```bash
git add content/utils.js
git commit -m "feat: crear content/utils.js con waitForElement y diLog compartidos"
```

---

### Task 2: Actualizar manifest.json

**Files:**
- Modify: `manifest.json`

- [ ] **Step 1: Añadir utils.js a los tres bloques content_scripts**

Reemplazar el bloque `content_scripts` completo con:

```json
"content_scripts": [
  {
    "matches": ["https://www.youtube.com/*"],
    "js": ["content/utils.js", "content/youtube.js"],
    "css": ["styles/styles.css"],
    "run_at": "document_idle"
  },
  {
    "matches": ["https://www.google.com/search*"],
    "js": ["content/utils.js", "content/google.js"],
    "css": ["styles/styles.css"],
    "run_at": "document_idle"
  },
  {
    "matches": [
      "https://www.amazon.es/*",
      "https://www.amazon.com/*",
      "https://www.amazon.co.uk/*"
    ],
    "js": ["content/utils.js", "content/amazon.js"],
    "css": ["styles/styles.css"],
    "run_at": "document_idle"
  }
],
```

`utils.js` debe ser el **primer** elemento en cada array `js` — MV3 inyecta scripts en orden, y youtube/amazon/google necesitan que `waitForElement` y `diLog` ya estén definidos cuando se ejecutan.

- [ ] **Step 2: Verificar JSON válido**

```bash
cd "C:/Users/Adria/Desktop/EXTENSIONES/De-Influencer AI"
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8')); console.log('JSON válido')"
```

Expected: `JSON válido`

- [ ] **Step 3: Commit**

```bash
git add manifest.json
git commit -m "feat: inyectar content/utils.js como primer script en los tres bloques content_scripts"
```

---

### Task 3: Limpiar content/youtube.js

Eliminar la copia local de `waitForElement` y actualizar `log()` para usar `diLog`.

**Files:**
- Modify: `content/youtube.js`

- [ ] **Step 1: Actualizar la función log**

Localizar (línea ~15):
```javascript
function log(...args) {
  if (DEBUG) console.log('[DI YouTube]', ...args);
}
```

Reemplazar con:
```javascript
function log(...args) { diLog('[DI YouTube]', DEBUG, ...args); }
```

- [ ] **Step 2: Eliminar la función waitForElement local**

Localizar y eliminar completamente el bloque (líneas ~164-176):
```javascript
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
```

También eliminar la línea en blanco extra que quede entre `isWatchPage()` e `init()` si procede.

- [ ] **Step 3: Verificar que no queda waitForElement en youtube.js**

```bash
grep -n "waitForElement\|function log" "content/youtube.js"
```

Expected: aparecen solo las líneas de llamada a `waitForElement` (sin la palabra `function` antes). No debe aparecer ninguna línea con `function waitForElement`. `function log` debe mostrar únicamente la línea con `diLog`.

- [ ] **Step 4: Verificar que la extensión sigue funcionando en YouTube**

1. Abrir `chrome://extensions`
2. Hacer clic en el botón de recarga (🔄) de De-Influencer AI
3. Abrir https://www.youtube.com/watch?v=dQw4w9WgXcQ (cualquier vídeo)
4. Abrir DevTools → Console
5. Verificar que aparece: `[DI YouTube] Script cargado en ...`
6. Verificar que el banner se inyecta sobre el player
7. Verificar que NO aparece `waitForElement is not defined`

- [ ] **Step 5: Commit**

```bash
git add content/youtube.js
git commit -m "refactor: eliminar waitForElement local de youtube.js, usar utils compartido"
```

---

### Task 4: Limpiar content/amazon.js

Mismo patrón que Task 3.

**Files:**
- Modify: `content/amazon.js`

- [ ] **Step 1: Actualizar la función log**

Localizar (línea ~11):
```javascript
function log(...args) {
  if (DEBUG) console.log('[DI Amazon]', ...args);
}
```

Reemplazar con:
```javascript
function log(...args) { diLog('[DI Amazon]', DEBUG, ...args); }
```

- [ ] **Step 2: Eliminar la función waitForElement local**

Localizar y eliminar completamente el bloque (líneas ~136-148):
```javascript
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
```

- [ ] **Step 3: Verificar que no queda waitForElement en amazon.js**

```bash
grep -n "waitForElement\|function log" "content/amazon.js"
```

Expected: solo la llamada a `waitForElement` en `init()`, no la definición.

- [ ] **Step 4: Verificar que la extensión sigue funcionando en Amazon**

1. Recargar la extensión en `chrome://extensions`
2. Abrir cualquier página de producto en Amazon (URL con `/dp/`)
3. DevTools → Console → verificar `[DI Amazon] Script cargado en ...`
4. Verificar que el panel lateral se inyecta
5. Verificar que NO aparece `waitForElement is not defined`

- [ ] **Step 5: Commit**

```bash
git add content/amazon.js
git commit -m "refactor: eliminar waitForElement local de amazon.js, usar utils compartido"
```

---

## Chunk 2: CSS Google + Módulo Google + Verificación

### Task 5: Añadir componentes CSS para Google Search

**Files:**
- Modify: `styles/styles.css`

- [ ] **Step 1: Añadir el token --di-reddit a :root**

En el bloque `:root { ... }`, añadir al final (antes del cierre `}`):
```css
  --di-reddit: #ff4500;
```

- [ ] **Step 2: Añadir los componentes de Google al final de styles.css**

Añadir al final del archivo:

```css
/* ─── Google Search — Banner Reddit ───────── */
.di-google-banner {
  background: var(--di-bg);
  border: 1px solid var(--di-border);
  border-left: 3px solid var(--di-reddit);
  border-radius: var(--di-radius);
  padding: 9px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  box-sizing: border-box;
  font-family: var(--di-font-mono);
}

.di-google-banner__badge {
  background: var(--di-reddit);
  color: var(--di-white);
  font-size: 0.62rem;
  font-weight: 900;
  padding: 3px 7px;
  border-radius: 3px;
  white-space: nowrap;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.di-google-banner__text {
  flex: 1;
  font-size: 0.75rem;
  color: var(--di-text-dim);
  line-height: 1.5;
}

/* NOTA: strong sustituido por clase BEM en Phase 3 */
.di-google-banner__text strong {
  color: var(--di-text);
}

.di-google-banner__cta {
  background: var(--di-reddit);
  color: var(--di-white);
  font-size: 0.68rem;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 4px;
  text-decoration: none;
  white-space: nowrap;
  font-family: var(--di-font-mono);
  flex-shrink: 0;
}

.di-google-banner__cta:hover {
  opacity: 0.85;
}

/* ─── Google Search — Blur Overlay ─────────── */
.di-google-blurred {
  filter: blur(3px);
  user-select: none;
  pointer-events: none;
}

.di-google-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255, 255, 255, 0.78);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  box-sizing: border-box;
}

.di-google-badge {
  background: var(--di-red);
  color: var(--di-white);
  font-size: 0.62rem;
  font-weight: 900;
  padding: 3px 7px;
  border-radius: 3px;
  white-space: nowrap;
  letter-spacing: 0.05em;
  font-family: var(--di-font-mono);
  flex-shrink: 0;
}

.di-google-overlay__text {
  font-size: 0.72rem;
  color: #333;
  font-family: var(--di-font-mono);
}

.di-google-overlay__reveal {
  margin-left: auto;
  font-size: 0.65rem;
  color: #666;
  text-decoration: underline;
  cursor: pointer;
  background: none;
  border: none;
  white-space: nowrap;
  font-family: var(--di-font-mono);
  flex-shrink: 0;
  padding: 0;
}

.di-google-overlay__reveal:hover {
  color: #333;
}
```

- [ ] **Step 3: Verificar que el token aparece en :root**

```bash
grep -n "di-reddit" "styles/styles.css"
```

Expected: varias líneas — la definición en `:root` más los usos en `.di-google-banner`, `.di-google-banner__badge` y `.di-google-banner__cta`. Lo importante es que aparezca en `:root` y en los selectores de componente.

- [ ] **Step 4: Commit**

```bash
git add styles/styles.css
git commit -m "feat: añadir tokens y componentes CSS para módulo Google Search (Phase 2)"
```

---

### Task 6: Implementar content/google.js

Reemplazar el esqueleto de Phase 1 con la implementación completa.

**Files:**
- Modify: `content/google.js`

- [ ] **Step 1: Reemplazar el contenido completo de content/google.js**

```javascript
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
  // Se comprueba el atributo href, no el texto visible — utm_ solo aparece en la URL
  const anchor = resultEl.querySelector('a[href]');
  const href = anchor ? (anchor.getAttribute('href') || '') : '';
  if (/\b(afiliado|aff=|ref=|utm_)/i.test(href)) {
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
    <span class="di-google-badge">&#9888; SEO SPAM</span>
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
```

- [ ] **Step 2: Verificar que no quedan referencias a la función waitForElement definida localmente**

```bash
grep -n "function waitForElement" "content/google.js"
```

Expected: sin resultados (la función viene de utils.js).

- [ ] **Step 3: Commit**

```bash
git add content/google.js
git commit -m "feat: implementar módulo Google Search Phase 2 — blur overlay + banner Reddit + detección SEO spam"
```

---

### Task 7: Verificación manual en el navegador

No hay test runner para extensiones MV3 — verificación en Chrome DevTools.

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Recargar la extensión**

1. Ir a `chrome://extensions`
2. Hacer clic en el botón de recarga (🔄) de De-Influencer AI
3. Verificar que no aparece ningún error en la tarjeta de la extensión

- [ ] **Step 2: Verificar YouTube sigue funcionando (regresión)**

1. Abrir https://www.youtube.com/watch?v=dQw4w9WgXcQ
2. DevTools → Console → filtrar por `[DI YouTube]`
3. Verificar: `Script cargado`, `Página de vídeo detectada`, `Banner inyectado`
4. Verificar que el banner Brutal Card aparece sobre el player
5. Sin errores `waitForElement is not defined` ni `diLog is not defined`

- [ ] **Step 3: Verificar Amazon sigue funcionando (regresión)**

1. Abrir cualquier producto de Amazon con `/dp/` en la URL
2. DevTools → Console → filtrar por `[DI Amazon]`
3. Verificar: `Script cargado`, `Página de producto detectada`, `Panel inyectado`
4. Verificar que el panel lateral De-Influencer aparece bajo el buy box
5. Sin errores de funciones no definidas

- [ ] **Step 4: Verificar banner Reddit en Google Search**

1. Abrir https://www.google.com/search?q=mejores+auriculares+inalambricos+2025
2. DevTools → Console → filtrar por `[DI Google]`
3. Verificar: `Script cargado`, `Contenedor de resultados encontrado`, `Banner Reddit inyectado`
4. Verificar visualmente que el banner oscuro con acento naranja aparece sobre los resultados
5. Hacer clic en "Buscar en Reddit →" — debe abrir Reddit Search en nueva pestaña con la query

- [ ] **Step 5: Verificar detección de granjas SEO**

Buscar algo que típicamente trae granjas SEO:
```
https://www.google.com/search?q=los+10+mejores+portatiles+baratos+2025
```

1. DevTools → Console → filtrar por `[DI Google]`
2. Verificar logs de señales detectadas: `Señal 1 (superlativo+número)`, `Señal 2 (clickbait)`, etc.
3. Verificar visualmente que resultados con score ≥ 2 aparecen con blur y overlay "⚠ SEO SPAM"
4. Hacer clic en "mostrar →" en uno de ellos — debe eliminar el blur y mostrar el resultado

- [ ] **Step 6: Commit final y push**

```bash
git add -A
git status  # verificar que no hay archivos no deseados
git push origin main
```

Expected: todos los commits del Chunk 1 y 2 pusheados a GitHub.
