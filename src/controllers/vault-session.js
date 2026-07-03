import {
  createBackupDownload,
  importIntoUnlockedSession,
  resetVaultContext as resetVaultContextInStore
} from "./auth-vault.js";

export function clearSessionResume(sessionStorageRef, sessionKey) {
  try {
    sessionStorageRef.removeItem(sessionKey);
  } catch {}
}

export function readSessionResume(sessionStorageRef, sessionKey) {
  try {
    return JSON.parse(sessionStorageRef.getItem(sessionKey) || "null");
  } catch {
    return null;
  }
}

export async function persistSessionResume({ secureStore, sessionStorageRef, sessionKey }) {
  if (!secureStore.isUnlocked()) {
    clearSessionResume(sessionStorageRef, sessionKey);
    return;
  }

  try {
    const token = await secureStore.exportSessionResumeToken();
    if (!token) {
      clearSessionResume(sessionStorageRef, sessionKey);
      return;
    }
    sessionStorageRef.setItem(sessionKey, JSON.stringify(token));
  } catch {
    clearSessionResume(sessionStorageRef, sessionKey);
  }
}

export function scheduleAutolockTimer({
  windowRef,
  currentTimer,
  lockMinutes,
  onLock
}) {
  if (currentTimer) {
    windowRef.clearTimeout(currentTimer);
  }
  if (!(lockMinutes > 0)) {
    return null;
  }
  return windowRef.setTimeout(onLock, lockMinutes * 60 * 1000);
}

export async function exportEncryptedBackupWithPassphrase({
  secureStore,
  passphrase,
  triggerDownload
}) {
  const normalized = String(passphrase || "").trim();
  if (normalized.length < 8) {
    throw new Error("La passphrase del backup debe tener al menos 8 caracteres.");
  }

  const state = secureStore.getSessionState();
  if (!state) {
    throw new Error("La sesión está bloqueada.");
  }

  triggerDownload(await createBackupDownload(state, normalized));
  return secureStore.saveState({
    ...state,
    appMeta: {
      ...state.appMeta,
      lastBackupExportAt: new Date().toISOString()
    }
  });
}

export async function importBackupIntoCurrentSession({
  file,
  backupPassphrase,
  secureStore
}) {
  if (!secureStore.isUnlocked()) {
    throw new Error("Desbloquea el vault antes de importar aquí.");
  }
  return importIntoUnlockedSession({ file, backupPassphrase, secureStore });
}

export async function resetVaultContext(secureStore) {
  await resetVaultContextInStore(secureStore);
}
