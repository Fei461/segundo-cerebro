export function loadUiState(storage, defaults) {
  try {
    const raw = storage.getItem(defaults.key);
    if (!raw) return defaults.fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaults.fallback;
    return {
      ...defaults.fallback,
      currentTab: typeof parsed.currentTab === "string" && parsed.currentTab ? parsed.currentTab : defaults.fallback.currentTab,
      homeCapture: typeof parsed.homeCapture === "string" && parsed.homeCapture ? parsed.homeCapture : defaults.fallback.homeCapture,
      moduleViews: parsed.moduleViews && typeof parsed.moduleViews === "object"
        ? { ...defaults.fallback.moduleViews, ...parsed.moduleViews }
        : defaults.fallback.moduleViews
    };
  } catch {
    return defaults.fallback;
  }
}

export function saveUiState(storage, key, snapshot) {
  try {
    storage.setItem(key, JSON.stringify(snapshot));
  } catch {}
}

export function getLockMinutesFromState(state, fallback) {
  const candidate = Number(state?.appMeta?.autoLockMinutes);
  return Number.isFinite(candidate) ? candidate : fallback;
}

export function removeSessionJson(storage, key) {
  try {
    storage.removeItem(key);
  } catch {}
}

export function readSessionJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSessionJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {}
}
