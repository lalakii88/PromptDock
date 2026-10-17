/* Local-only migration: remove retired connection settings, never read keys. */
(() => {
  'use strict';
  const keys=['promptdock.ai.settings.v1','promptdock.ai.session.v1'];
  async function clearLegacySettings({extension=false}={}) {
    let cleared=true;
    if(extension) {
      for(const area of ['local','session']) {
        try { await chrome.storage[area].remove(keys); }
        catch { cleared=false; }
      }
    } else {
      for(const getStorage of [()=>localStorage,()=>sessionStorage]) {
        try { const storage=getStorage();for(const key of keys)storage.removeItem(key); }
        catch { cleared=false; }
      }
    }
    return cleared;
  }
  globalThis.PromptDockPrivacy={clearLegacySettings};
})();
