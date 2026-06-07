# De-Influencer AI — Phase 2 Design Spec

**Date:** 2026-06-07
**Scope:** Shared utils extraction + Google Search module real functionality
**Status:** Approved

---

## 1. Summary

Phase 2 has two parts:

**A. Tech debt:** Extract `waitForElement()` from the three content scripts into a shared `content/utils.js`. Eliminates verbatim duplication and gives all modules a single implementation to maintain.

**B. Google module:** Replace the Phase 1 skeleton with a fully functional content script that:
- Detects SEO farm / spam results using signal-based heuristics (no AI)
- Applies blur + overlay on flagged results
- Injects a Reddit banner above organic results linking to Reddit Search

---

## 2. Architecture Decision

**Monolith-per-platform stays.** `utils.js` is a shared helper file, not a module bundle — it exposes globals (`waitForElement`, `diLog`) that content scripts call directly. MV3 injects it before the platform script via `content_scripts` array ordering.

No bundler. No imports. Vanilla JS ES2020.

---

## 3. File Changes

```
content/
  utils.js          ← CREATE: shared waitForElement() + diLog()
  google.js         ← MODIFY: full implementation replacing Phase 1 skeleton
  youtube.js        ← MODIFY: remove local waitForElement(), use utils
  amazon.js         ← MODIFY: remove local waitForElement(), use utils
manifest.json       ← MODIFY: add utils.js as first js entry in all 3 content_scripts blocks
styles/styles.css   ← MODIFY: add .di-google-banner, .di-google-overlay, .di-google-badge
```

---

## 4. content/utils.js

Responsibilities:
- `waitForElement(selector, callback, maxAttempts = 20)` — polls every 300ms, calls callback with found element, warns after maxAttempts
- `diLog(prefix, debug, ...args)` — wrapper so each module keeps its own prefix and DEBUG flag

```js
// Usage in each content script:
// function log(...args) { diLog('[DI YouTube]', DEBUG, ...args); }
// waitForElement('#movie_player', (el) => { ... });
```

Both are plain functions on `window` scope (no export keyword — MV3 content scripts share a global scope per tab).

---

## 5. manifest.json changes

Each of the three `content_scripts` entries gains `utils.js` as the first JS file:

```json
"js": ["content/utils.js", "content/youtube.js"]
"js": ["content/utils.js", "content/google.js"]
"js": ["content/utils.js", "content/amazon.js"]
```

No new `matches`, `host_permissions`, or `web_accessible_resources` needed — `utils.js` is a content script injected directly, not a web-accessible resource.

---

## 6. Google Module — content/google.js

### 6.1 Trigger
`https://www.google.com/search*` (existing manifest entry)

### 6.2 Entry point
```
init()
  └─► waitForElement('#rcnt, #search', (container) => {
        injectRedditBanner()   ← once per page
        scanResults(container)
        attachObserver(container)
      })
```

### 6.3 Reddit Banner

Injected once above organic results. Guard attribute: `data-di-reddit-injected` on `#rcnt`/`#search`.

- Query extracted via: `new URLSearchParams(location.search).get('q')`
- If query is null/empty → skip injection, log warn
- Link opens: `https://www.reddit.com/search?q={encodeURIComponent(query)}` in `target="_blank" rel="noopener noreferrer"`
- Does **not** consume `usageCount` (informational widget, not a Vibe Check)

**Visual spec (`.di-google-banner`):**
- Background `--di-bg` (#0d0d0d), border-left 3px `#ff4500` (Reddit orange)
- Border `--di-border`, border-radius `--di-radius`
- Left: pill badge `REDDIT` in Reddit orange
- Center: copy — **"¿Opiniones reales?"** + subtext in `--di-text-dim`
- Right: CTA button in Reddit orange → opens Reddit search

### 6.4 SEO Farm Detection

`detectSpamScore(resultEl)` — returns integer 0–4.

Signals (each worth +1):

| # | Signal | Implementation |
|---|---|---|
| 1 | Title has superlative + number | `/\b(top\s*\d+\|los?\s*\d+\s*mejores?\|best\s*\d+\|the\s*\d+\s*best)\b/i` on `h3` text |
| 2 | Title has clickbait markers | `/[¡!]{2,}\|DEFINITIV[AO]\|OFERTA\s+LIMITADA\|GRATIS\b/i` on `h3` text |
| 3 | URL contains affiliate indicators | `/\b(afiliado\|aff=\|ref=\|utm_)/i` on `a.getAttribute('href')` (attribute value, not text — `utm_` only appears in the href, not in visible anchor text) |
| 4 | Snippet mentions affiliate/guide | `/enlace\s+de\s+afiliado\|guía\s+definitiva\|guia\s+definitiva/i` on snippet div |

**Threshold: score ≥ 2 → spam.**

Elements without `<h3>` are skipped silently.

### 6.5 Blur Overlay

`applyBlurOverlay(resultEl)` — wraps result content in blur, injects overlay.

DOM structure injected:
```html
<div class="di-google-overlay">
  <span class="di-google-badge">⚠ SEO SPAM</span>
  <span class="di-google-overlay__text">Granja de contenido detectada</span>
  <button class="di-google-overlay__reveal">mostrar →</button>
</div>
```

- `resultEl` gets `position: relative; overflow: hidden`
- Inner content wrapped in `<div class="di-google-blurred">` with `filter: blur(3px)`
- "mostrar →" button removes blur wrapper and overlay on click
- Guard: `data-di-scanned="spam"` (vs `"ok"` for clean results) to prevent re-processing

### 6.6 MutationObserver

Reuses existing pattern from Phase 1 skeleton. No debounce needed (Google loads results once; observer catches pagination/lazy loads).

---

## 7. styles.css additions

New BEM components added to existing file:

```css
/* ─── Google Search — Banner Reddit ─── */
.di-google-banner { ... }
.di-google-banner__badge { ... }   /* pill: "REDDIT" in #ff4500 */
.di-google-banner__text { ... }
.di-google-banner__text strong { ... }
.di-google-banner__cta { ... }     /* button → Reddit search */

/* ─── Google Search — Blur Overlay ─── */
.di-google-blurred { filter: blur(3px); user-select: none; pointer-events: none; }
.di-google-overlay { ... }         /* absolute overlay */
.di-google-badge { ... }           /* "⚠ SEO SPAM" pill */
.di-google-overlay__text { ... }
.di-google-overlay__reveal { ... } /* "mostrar →" button */
```

Reuses existing tokens: `--di-bg`, `--di-border`, `--di-radius`, `--di-text-dim`, `--di-font-mono`.

One new token added: `--di-reddit: #ff4500` (Reddit orange — used in banner badge and CTA button).

---

## 8. Data Flow

```
Google search page loads
  └─► utils.js injected first (waitForElement, diLog available globally)
  └─► google.js runs: init()
        └─► waitForElement('#rcnt, #search')
              ├─► injectRedditBanner()
              │     └─► extract query from URL → build banner → insertBefore first child
              └─► scanResults(container)
                    └─► querySelectorAll('.g:not([data-di-scanned])')
                          └─► detectSpamScore(el)
                                ├─► score < 2 → setAttribute('data-di-scanned', 'ok')
                                └─► score ≥ 2 → applyBlurOverlay(el)
                                                  setAttribute('data-di-scanned', 'spam')
              └─► attachObserver(container) → scanResults() on mutation
```

---

## 9. Error Handling

| Scenario | Behavior |
|---|---|
| `#rcnt` / `#search` not found after 20 attempts | `console.warn('[DI Google]')`, script exits |
| Query param `q` missing | Reddit banner not injected, log warn |
| Result has no `<h3>` | Skip result silently, `data-di-scanned="ok"` |
| Reddit banner already present | Guard `data-di-reddit-injected` prevents double inject |
| `chrome.storage` not used in Phase 2 | Google module does not consume usageCount |

---

## 10. Out of Scope (Phase 2)

- Real Reddit API calls (CSP blocks external fetch) → Phase 3 or never
- AI-based spam detection → Phase 3
- usageCount gating on Google module → Phase 3 decision
- Google Ads detection (separate from SEO farms) → future phase
