/**
 * De-Influencer AI — Service Worker en Segundo Plano
 * Responsabilidades: reset diario del contador, inicialización del almacenamiento, stub de ExtensionPay
 */

const DEBUG = true;
const ALARM_NAME = 'dailyReset';
const MINUTES_PER_DAY = 1440;
// Reservado para la Fase 4: aplicación centralizada del límite vía mensajería en background.
// Los content scripts declaran su propio DI_DAILY_LIMIT localmente en la Fase 1.
const DAILY_FREE_LIMIT = 5;

function log(...args) {
  if (DEBUG) console.log('[DI Background]', ...args);
}

// ─── Instalación: inicializar almacenamiento + programar alarma de reset diario ───
// Solo se ejecuta en instalación nueva — NO en actualizaciones de la extensión.
// La guardia reason === INSTALL evita sobrescribir isPro y datos de uso
// cuando el usuario actualiza a una nueva versión.
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    log('Primera instalación detectada — inicializando almacenamiento');
    // Todas las fechas usan toDateString() — mantener formato consistente
    // en los tres sitios donde se usa (aquí, alarms.onAlarm, resetDailyCounterIfNeeded).
    chrome.storage.local.set({
      usageCount: 0,
      isPro: false,
      moneySaved: 0,
      minutesSaved: 0,
      lastResetDate: new Date().toDateString()
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[DI Background] Error al inicializar almacenamiento:', chrome.runtime.lastError);
        return;
      }
      log('Almacenamiento inicializado correctamente');
    });

    chrome.alarms.create(ALARM_NAME, { periodInMinutes: MINUTES_PER_DAY });
    log('Alarma de reset diario creada —', MINUTES_PER_DAY, 'minutos');
    // Fase 4: extpay.getUser().then(user => chrome.storage.local.set({ isPro: user.paid }));
  } else {
    log('Actualización de extensión detectada — almacenamiento preservado (reason:', reason, ')');
  }
});

// ─── Arranque del navegador: comprobar cambio de día + stub de ExtensionPay ─────
chrome.runtime.onStartup.addListener(() => {
  log('Navegador iniciado — comprobando reset de contador diario');
  resetDailyCounterIfNeeded();
  // Fase 4: extpay.getUser().then(user => chrome.storage.local.set({ isPro: user.paid }));
});

// ─── Alarma: resetear el contador de uso diario ──────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    log('Alarma disparada — reseteando contador de uso diario');
    chrome.storage.local.set({
      usageCount: 0,
      lastResetDate: new Date().toDateString()
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[DI Background] Error al resetear contador por alarma:', chrome.runtime.lastError);
        return;
      }
      log('Contador diario reseteado correctamente');
    });
  }
});

// ─── Helper: resetear contador si ha cambiado el día del calendario ──────────
function resetDailyCounterIfNeeded() {
  const today = new Date().toDateString();
  chrome.storage.local.get(['lastResetDate'], (data) => {
    if (chrome.runtime.lastError) {
      console.warn('[DI Background] Error al leer almacenamiento en arranque:', chrome.runtime.lastError);
      return;
    }
    if (data.lastResetDate !== today) {
      log('Nuevo día detectado (', data.lastResetDate, '→', today, ') — reseteando contador');
      chrome.storage.local.set({ usageCount: 0, lastResetDate: today }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[DI Background] Error al resetear contador por cambio de día:', chrome.runtime.lastError);
          return;
        }
        log('Contador reseteado por cambio de día');
      });
    } else {
      log('Mismo día (', today, ') — contador no reseteado');
    }
  });
}
