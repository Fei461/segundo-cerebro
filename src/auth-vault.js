import { createDefaultState } from "../domain/schema.js";
import { createEncryptedBackup, importEncryptedBackup } from "../storage/backup.js";
import { importLegacyPayload } from "../storage/legacy-import.js";

export function parseImportedFile(rawText) {
  return JSON.parse(rawText);
}

export async function createBackupDownload(state, passphrase) {
  const normalized = String(passphrase || "").trim();
  if (normalized.length < 8) {
    throw new Error("La passphrase del backup debe tener al menos 8 caracteres.");
  }

  const backup = await createEncryptedBackup(state, normalized);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  return {
    url,
    filename: "segundo-cerebro-backup.json"
  };
}

export function triggerDownload({ url, filename }) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function loadImportedState(file, backupPassphrase = "") {
  const rawText = await file.text();
  const parsed = parseImportedFile(rawText);

  if (parsed.kind === "encrypted-backup-v1") {
    const normalized = String(backupPassphrase || "").trim();
    if (!normalized) {
      throw new Error("Falta la passphrase del backup.");
    }
    return importEncryptedBackup(rawText, normalized);
  }

  return importLegacyPayload(rawText);
}

function withImportMeta(state) {
  return {
    ...state,
    appMeta: {
      ...state.appMeta,
      lastImportAt: new Date().toISOString()
    }
  };
}

async function runWithPendingForm(form, action) {
  const controls = Array.from(form.querySelectorAll("button, input, select, textarea"));
  controls.forEach(control => {
    control.disabled = true;
  });
  try {
    return await action();
  } finally {
    controls.forEach(control => {
      control.disabled = false;
    });
  }
}

export async function importIntoUnlockedSession({ file, backupPassphrase, secureStore }) {
  const importedState = withImportMeta(await loadImportedState(file, backupPassphrase));
  return secureStore.saveState(importedState);
}

export async function importIntoExistingVault({ file, backupPassphrase, vaultPassphrase, secureStore }) {
  const normalizedVaultPassphrase = String(vaultPassphrase || "").trim();
  if (!normalizedVaultPassphrase) {
    throw new Error("Falta la passphrase del vault actual.");
  }

  await secureStore.unlock(normalizedVaultPassphrase);
  const importedState = withImportMeta(await loadImportedState(file, backupPassphrase));
  return secureStore.saveState(importedState);
}

export async function importIntoNewVault({ file, backupPassphrase, newVaultPassphrase, secureStore }) {
  const normalizedVaultPassphrase = String(newVaultPassphrase || "").trim();
  if (normalizedVaultPassphrase.length < 8) {
    throw new Error("La nueva passphrase local debe tener al menos 8 caracteres.");
  }

  const importedState = withImportMeta(await loadImportedState(file, backupPassphrase));
  return secureStore.initializeVault(normalizedVaultPassphrase, importedState);
}

export async function changeVaultPassphrase(secureStore, nextPassphrase) {
  return secureStore.changePassphrase(nextPassphrase);
}

export async function resetVaultContext(secureStore) {
  await secureStore.resetVault();
  return createDefaultState();
}

export function wireAuthVaultForms(options) {
  const {
    documentRef,
    secureStore,
    viewModel,
    setStatus,
    clearStatus,
    setLockMinutesFromState,
    persistSessionResume,
    scheduleAutolock,
    paint,
    clearSessionResume,
    createVault,
    unlockVault,
    importNewVault,
    importExistingVault,
    resetVault,
    exportBackupWithPassphrase,
    changePassphrase,
    importCurrentSession
  } = options;

  const setupForm = documentRef.getElementById("setup-form");
  if (setupForm) {
    setupForm.addEventListener("submit", async event => {
      event.preventDefault();
      const formData = new FormData(setupForm);
      const passphrase = String(formData.get("passphrase") || "");
      const passphraseConfirm = String(formData.get("passphraseConfirm") || "");

      try {
        setStatus("Creando vault local...");
        await runWithPendingForm(setupForm, async () => {
          if (passphrase !== passphraseConfirm) {
            throw new Error("La confirmación de passphrase no coincide.");
          }
          const state = await createVault(passphrase);
          viewModel.state = state;
          viewModel.hasVault = true;
          viewModel.vaultHealth = "ready";
          setLockMinutesFromState(state);
          viewModel.mode = "ready";
          clearStatus();
          await persistSessionResume();
          scheduleAutolock();
          paint();
        });
      } catch (error) {
        setStatus(error.message || "No se pudo crear el vault.");
      }
    });
  }

  const unlockForm = documentRef.getElementById("unlock-form");
  if (unlockForm) {
    unlockForm.addEventListener("submit", async event => {
      event.preventDefault();
      const formData = new FormData(unlockForm);
      const passphrase = String(formData.get("passphrase") || "");

      try {
        setStatus("Desbloqueando vault...");
        await runWithPendingForm(unlockForm, async () => {
          const state = await unlockVault(passphrase);
          viewModel.state = state;
          viewModel.hasVault = true;
          viewModel.vaultHealth = "ready";
          setLockMinutesFromState(state);
          viewModel.mode = "ready";
          clearStatus();
          await persistSessionResume();
          scheduleAutolock();
          paint();
        });
      } catch (error) {
        setStatus(error.message || "No se pudo desbloquear. Revisa la clave local.");
      }
    });
  }

  const setupImportForm = documentRef.getElementById("setup-import-form");
  if (setupImportForm) {
    setupImportForm.addEventListener("submit", async event => {
      event.preventDefault();
      const formData = new FormData(setupImportForm);
      const backupPassphrase = String(formData.get("backupImportPassphrase") || "");
      const newVaultPassphrase = String(formData.get("newVaultPassphrase") || "");
      const newVaultPassphraseConfirm = String(formData.get("newVaultPassphraseConfirm") || "");
      const file = formData.get("backupFile");
      try {
        setStatus("Importando backup y creando este contexto...");
        await runWithPendingForm(setupImportForm, async () => {
          if (newVaultPassphrase !== newVaultPassphraseConfirm) {
            throw new Error("La confirmación de la nueva clave local no coincide.");
          }
          if (!(file instanceof File) || !file.name) {
            throw new Error("Elige un archivo de backup.");
          }
          viewModel.state = await importNewVault({ file, backupPassphrase, newVaultPassphrase });
          viewModel.hasVault = true;
          viewModel.vaultHealth = "ready";
          setLockMinutesFromState(viewModel.state);
          viewModel.mode = "ready";
          clearStatus();
          await persistSessionResume();
          scheduleAutolock();
          setupImportForm.reset();
          paint();
        });
      } catch (error) {
        setStatus(error.message || "No se pudo importar el backup.");
      }
    });
  }

  const lockedImportForm = documentRef.getElementById("locked-import-form");
  if (lockedImportForm) {
    lockedImportForm.addEventListener("submit", async event => {
      event.preventDefault();
      const formData = new FormData(lockedImportForm);
      const backupPassphrase = String(formData.get("backupImportPassphrase") || "");
      const vaultPassphrase = String(formData.get("vaultPassphrase") || "");
      const file = formData.get("backupFile");
      try {
        setStatus("Importando backup sobre este contexto...");
        await runWithPendingForm(lockedImportForm, async () => {
          if (!(file instanceof File) || !file.name) {
            throw new Error("Elige un archivo de backup.");
          }
          viewModel.state = await importExistingVault({ file, backupPassphrase, vaultPassphrase });
          viewModel.hasVault = true;
          viewModel.vaultHealth = "ready";
          setLockMinutesFromState(viewModel.state);
          viewModel.mode = "ready";
          clearStatus();
          await persistSessionResume();
          scheduleAutolock();
          lockedImportForm.reset();
          paint();
        });
      } catch (error) {
        setStatus(error.message || "No se pudo importar el backup.");
      }
    });
  }

  const resetVaultButton = documentRef.getElementById("reset-vault-button");
  if (resetVaultButton) {
    resetVaultButton.addEventListener("click", async () => {
      try {
        await resetVault();
      } catch (error) {
        setStatus(error.message || "No se pudo restablecer este contexto.");
      }
    });
  }

  const lockButton = documentRef.getElementById("lock-button");
  if (lockButton) {
    lockButton.addEventListener("click", () => {
      secureStore.lock();
      clearSessionResume();
      viewModel.mode = "locked";
      setStatus("Sesión bloqueada manualmente.");
    });
  }

  const exportButton = documentRef.getElementById("export-button");
  if (exportButton) {
    exportButton.addEventListener("click", () => exportBackupWithPassphrase(""));
  }

  const backupExportForm = documentRef.getElementById("backup-export-form");
  if (backupExportForm) {
    backupExportForm.addEventListener("submit", async event => {
      event.preventDefault();
      const formData = new FormData(backupExportForm);
      const backupPassphrase = String(formData.get("backupPassphrase") || "");
      const backupPassphraseConfirm = String(formData.get("backupPassphraseConfirm") || "");
      try {
        setStatus("Generando backup cifrado...");
        await runWithPendingForm(backupExportForm, async () => {
          if (backupPassphrase !== backupPassphraseConfirm) {
            throw new Error("La confirmación del backup no coincide.");
          }
          await exportBackupWithPassphrase(backupPassphrase);
          backupExportForm.reset();
          setStatus("Backup cifrado generado.");
        });
      } catch (error) {
        setStatus(error.message || "No se pudo exportar el backup.");
      }
    });
  }

  const backupImportForm = documentRef.getElementById("backup-import-form");
  if (backupImportForm) {
    backupImportForm.addEventListener("submit", async event => {
      event.preventDefault();
      const formData = new FormData(backupImportForm);
      const backupPassphrase = String(formData.get("backupImportPassphrase") || "");
      const file = formData.get("backupFile");
      try {
        setStatus("Importando backup sobre la sesión actual...");
        await runWithPendingForm(backupImportForm, async () => {
          if (!(file instanceof File) || !file.name) {
            throw new Error("Elige un archivo de backup.");
          }
          await importCurrentSession({ file, backupPassphrase });
          backupImportForm.reset();
          setStatus("Backup importado correctamente.");
        });
      } catch (error) {
        setStatus(error.message || "No se pudo importar el backup.");
      }
    });
  }

  const changePassphraseForm = documentRef.getElementById("change-passphrase-form");
  if (changePassphraseForm) {
    changePassphraseForm.addEventListener("submit", async event => {
      event.preventDefault();
      const formData = new FormData(changePassphraseForm);
      const nextPassphrase = String(formData.get("nextPassphrase") || "");
      const nextPassphraseConfirm = String(formData.get("nextPassphraseConfirm") || "");
      try {
        setStatus("Cambiando passphrase local...");
        await runWithPendingForm(changePassphraseForm, async () => {
          if (nextPassphrase !== nextPassphraseConfirm) {
            throw new Error("La confirmación de la nueva passphrase no coincide.");
          }
          await changePassphrase(nextPassphrase);
          changePassphraseForm.reset();
          setStatus("Passphrase cambiada correctamente.");
        });
      } catch (error) {
        setStatus(error.message || "No se pudo cambiar la passphrase.");
      }
    });
  }
}
