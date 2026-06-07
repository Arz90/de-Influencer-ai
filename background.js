/**
 * De-Influencer AI — Background Service Worker
 * Responsibilities: daily counter reset, storage initialization, ExtensionPay stub
 */

const ALARM_NAME = 'dailyReset';
const MINUTES_PER_DAY = 1440;
// Reserved for Phase 4: central limit enforcement via background messaging.
// Content scripts declare their own DI_DAILY_LIMIT locally for Phase 1.
const DAILY_FREE_LIMIT = 5;

// ─── Install: initialize storage + schedule daily reset alarm ───
// Only runs on fresh install — NOT on extension updates.
// Guarding with reason === INSTALL prevents overwriting isPro and usage
// data when the user upgrades to a new version.
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // All date strings use toDateString() — keep format consistent across
    // all three call sites (here, alarms.onAlarm, resetDailyCounterIfNeeded).
    chrome.storage.local.set({
      usageCount: 0,
      isPro: false,
      moneySaved: 0,
      minutesSaved: 0,
      lastResetDate: new Date().toDateString()
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[DI] storage init failed:', chrome.runtime.lastError);
      }
    });

    chrome.alarms.create(ALARM_NAME, { periodInMinutes: MINUTES_PER_DAY });
    // Phase 4: extpay.getUser().then(user => chrome.storage.local.set({ isPro: user.paid }));
  }
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
    }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[DI] alarm storage reset failed:', chrome.runtime.lastError);
      }
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
      chrome.storage.local.set({ usageCount: 0, lastResetDate: today }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[DI] storage day-reset failed:', chrome.runtime.lastError);
        }
      });
    }
  });
}
