export function updateRuntimeStatus(viewModel, windowRef, navigatorRef) {
  viewModel.runtime = {
    isStandalone:
      windowRef.matchMedia?.("(display-mode: standalone)")?.matches ||
      windowRef.navigator?.standalone === true,
    isOnline: navigatorRef.onLine,
    hasServiceWorker: "serviceWorker" in navigatorRef
  };
}

export async function bootstrapApp({
  loadUiState,
  updateRuntime,
  secureStore,
  viewModel,
  readSessionResume,
  setLockMinutesFromState,
  persistSessionResume,
  scheduleAutolock,
  clearSessionResume,
  paint
}) {
  loadUiState();
  updateRuntime();
  const vaultStatus = await secureStore.getVaultStatus();
  viewModel.hasVault = vaultStatus.canUnlock;
  viewModel.vaultHealth = vaultStatus.status;
  viewModel.mode = viewModel.hasVault ? "locked" : "setup";
  if (vaultStatus.canUnlock) {
    const resumeToken = readSessionResume();
    if (resumeToken) {
      try {
        const state = await secureStore.resumeFromToken(resumeToken);
        viewModel.state = state;
        viewModel.mode = "ready";
        setLockMinutesFromState(state);
        await persistSessionResume();
        scheduleAutolock();
      } catch {
        clearSessionResume();
      }
    }
  }
  if (vaultStatus.needsRepair) {
    viewModel.status = "He encontrado un vault incompleto en este contexto. Puedes limpiarlo y crear uno nuevo o importar un backup.";
  }
  paint();
}

export function wireRuntimeEnvironment({
  windowRef,
  navigatorRef,
  resetActivityClock,
  updateRuntime,
  viewModel,
  paint,
  setStatus,
  showFatalError
}) {
  ["click", "keydown", "touchstart"].forEach(eventName => {
    windowRef.addEventListener(eventName, resetActivityClock, { passive: true });
  });

  windowRef.addEventListener("online", () => {
    updateRuntime();
    if (viewModel.mode !== "fatal") paint();
  });

  windowRef.addEventListener("offline", () => {
    updateRuntime();
    if (viewModel.mode !== "fatal") paint();
  });

  windowRef.matchMedia?.("(display-mode: standalone)")?.addEventListener?.("change", () => {
    updateRuntime();
    if (viewModel.mode !== "fatal") paint();
  });

  if ("serviceWorker" in navigatorRef) {
    windowRef.addEventListener("load", () => {
      navigatorRef.serviceWorker
        .register("./sw.js")
        .then(registration => {
          if (registration.waiting) {
            setStatus("Hay una versión nueva lista. Recarga cuando termines para aplicarla.");
          }

          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigatorRef.serviceWorker.controller) {
                setStatus("Actualización descargada. Recarga la app cuando te venga bien.");
              }
            });
          });
        })
        .catch(() => {});
    });
  }

  windowRef.addEventListener("error", event => {
    event.preventDefault?.();
    showFatalError(event.error || event.message || "Error de runtime no controlado.");
  });

  windowRef.addEventListener("unhandledrejection", event => {
    event.preventDefault?.();
    showFatalError(event.reason || "Promesa rechazada sin control.");
  });
}
