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
