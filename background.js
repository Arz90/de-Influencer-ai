/**
 * De-Influencer AI — Background Service Worker
 * Responsibilities: daily counter reset, storage initialization, ExtensionPay stub
 */

const DAILY_FREE_LIMIT = 5;
const ALARM_NAME = 'dailyReset';

// ─── Install: initialize storage + schedule daily reset alarm ───
chrome.runtime.onInstalled.addListener(() => {
  // Note: lastResetDate is required by resetDailyCounterIfNeeded() for day-rollover detection.
  chrome.storage.local.set({
    usageCount: 0,
    isPro: false,
    moneySaved: 0,
    minutesSaved: 0,
    lastResetDate: new Date().toDateString()
  });

  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1440 });
  // Phase 4: extpay.getUser().then(user => chrome.storage.local.set({ isPro: user.paid }));
});

// ─── Startup: check date rollover + ExtensionPay stub ───────────
chrome.runtime.onStartup.addListener(() => {
  resetDailyCounterIfNeeded();
  // Phase 4: extpay.getUser().then(user => chrome.storage.local.set({ isPro: user.paid }));
});

// ─── Alarm: reset daily usage counter ───────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    chrome.storage.local.set({
      usageCount: 0,
      lastResetDate: new Date().toDateString()
    });
  }
});

// ─── Helper: reset counter if calendar day has changed ──────────
function resetDailyCounterIfNeeded() {
  const today = new Date().toDateString();
  chrome.storage.local.get(['lastResetDate'], (data) => {
    if (chrome.runtime.lastError) {
      console.warn('[DI] storage read failed on startup:', chrome.runtime.lastError);
      return;
    }
    if (data.lastResetDate !== today) {
      chrome.storage.local.set({ usageCount: 0, lastResetDate: today });
    }
  });
}
