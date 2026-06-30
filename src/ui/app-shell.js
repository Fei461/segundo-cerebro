import { renderDashboardFeature } from "../features/dashboard-view.js";
import { renderNutritionFeature } from "../features/nutrition-view.js";
import { renderPlanningFeature } from "../features/planning-view.js";
import { renderRecoveryFeature } from "../features/recovery-view.js";
import { renderTrainingFeature } from "../features/training-view.js";
import { renderWellbeingFeature } from "../features/wellbeing-view.js";
import { getWeeklyPreparationPack, getWeeklyReviewSummary } from "../domain/weekly.js";

const APP_TABS = [
  { id: "home", label: "Hoy", mobileLabel: "Hoy", eyebrow: "Centro de mando", icon: "◌" },
  { id: "planning", label: "Semana", mobileLabel: "Semana", eyebrow: "Planificación", icon: "▦" },
  { id: "nutrition", label: "Nutrición", mobileLabel: "Comida", eyebrow: "Comidas y recetas", icon: "◒" },
  { id: "training", label: "Entreno", mobileLabel: "Entreno", eyebrow: "Sesiones y progresión", icon: "△" },
  { id: "wellbeing", label: "Salud", mobileLabel: "Salud", eyebrow: "Ciclo y bienestar", icon: "✿" },
  { id: "recovery", label: "Sueño", mobileLabel: "Sueño", eyebrow: "Sueño y ajuste", icon: "☾" }
];

function currentTabMeta(activeTab) {
  return APP_TABS.find(tab => tab.id === activeTab) || APP_TABS[0];
}

function renderBottomNav(activeTab) {
  return `
    <nav class="bottom-nav" aria-label="Navegación principal">
      ${APP_TABS.map(
        tab => `
          <button
            class="bottom-nav-item${tab.id === activeTab ? " is-active" : ""}"
            type="button"
            data-action="open-tab"
            data-tab="${tab.id}"
            aria-pressed="${tab.id === activeTab ? "true" : "false"}"
            aria-current="${tab.id === activeTab ? "page" : "false"}"
          >
            <span class="bottom-nav-icon" aria-hidden="true">${tab.icon}</span>
            <span>${tab.mobileLabel || tab.label}</span>
          </button>
        `
      ).join("")}
    </nav>
  `;
}

function renderContextHint(viewModel) {
  const runtime = viewModel.runtime || {};
  if (runtime.isStandalone) {
    return "Si alternas entre app y navegador, importa un backup para mantener ambos contextos alineados.";
  }
  return "Si luego usas la app instalada, puede guardar una copia distinta en el mismo iPhone.";
}

function renderImportCta() {
  return `
    <label class="file-button compact-file auth-file">
      <input id="import-file" type="file" accept=".json,application/json">
      Importar backup
    </label>
  `;
}

function renderResetVaultButton(label = "Restablecer este contexto") {
  return `<button id="reset-vault-button" class="ghost compact" type="button">${label}</button>`;
}

function renderAuthSecondaryActions(content) {
  return `
    <details class="panel panel-toned disclosure-panel auth-secondary-panel">
      <summary class="disclosure-summary">
        <div>
          <p class="eyebrow">Opciones</p>
          <h4>Backup y contexto</h4>
        </div>
      </summary>
      <div class="stack disclosure-body">
        ${content}
      </div>
    </details>
  `;
}

function renderSurface(viewModel) {
  const activeTab = viewModel.currentTab || "home";
  const { state } = viewModel;
  const currentView = viewModel.moduleViews?.[activeTab];

  if (activeTab === "planning") return renderPlanningFeature(state, { currentView });
  if (activeTab === "nutrition") return renderNutritionFeature(state, { currentView });
  if (activeTab === "training") return renderTrainingFeature(state, { currentView });
  if (activeTab === "wellbeing") return renderWellbeingFeature(state, { currentView });
  if (activeTab === "recovery") return renderRecoveryFeature(state, { currentView });

  return renderDashboardFeature(state, {
    homeCapture: viewModel.homeCapture || "meal",
    currentView
  });
}

function renderVaultFooter() {
  return `
    <details class="panel panel-toned compact-vault-bar disclosure-panel">
      <summary class="disclosure-summary">
        <div>
          <p class="eyebrow">Seguridad local</p>
          <h4>Backup y recuperación</h4>
        </div>
      </summary>
      <div class="stack disclosure-body">
        <div class="button-row button-row-start">
          <button id="export-button" class="primary compact">Exportar backup cifrado</button>
          <label class="file-button compact-file auth-file">
            <input id="import-file" type="file" accept=".json,application/json">
            Importar backup
          </label>
        </div>
        <p class="muted">Hazlo antes de actualizar, limpiar caché o pasar de web a acceso directo.</p>
      </div>
    </details>
  `;
}

function renderMaintenanceFooter(activeTab) {
  if (activeTab !== "recovery") {
    return "";
  }
  return renderVaultFooter();
}

export function renderApp(container, viewModel) {
  const { mode, state, status, hasVault, lockMinutes, vaultHealth } = viewModel;
  const displayName = state?.profile?.displayName?.trim() || "Segundo Cerebro";
  const activeTab = viewModel.currentTab || "home";
  const activeMeta = currentTabMeta(activeTab);
  document.body.dataset.tab = mode === "ready" ? activeTab : mode;

  if (mode === "loading") {
    container.innerHTML = `
      <main class="screen centered">
        <section class="panel">
          <p class="eyebrow">Fase 1</p>
          <h1>Preparando tu base segura</h1>
          <p class="muted">Cargando la nueva arquitectura de la app.</p>
        </section>
      </main>
    `;
    return;
  }

  if (mode === "setup") {
    container.innerHTML = `
      <main class="screen centered">
        <section class="panel auth-panel">
          <p class="eyebrow">🔐 Acceso local</p>
          <h1>Crear acceso</h1>
          <p class="muted">Tus datos quedan cifrados en este dispositivo.</p>
          <p class="shell-note">${renderContextHint(viewModel)}</p>
          <form id="setup-form" class="stack">
            <label>
              <span>Clave local</span>
              <input name="passphrase" type="password" minlength="8" required placeholder="Mínimo 8 caracteres">
            </label>
            <label>
              <span>Confirmar clave local</span>
              <input name="passphraseConfirm" type="password" minlength="8" required placeholder="Repite la clave">
            </label>
            <button class="primary" type="submit">Crear acceso</button>
          </form>
          ${renderAuthSecondaryActions(`
            <p class="muted">Si vienes de otro contexto, importa un backup cifrado.</p>
            <div class="button-row button-row-start">
              ${renderImportCta()}
              ${vaultHealth === "incomplete" ? renderResetVaultButton("Limpiar contexto roto") : ""}
            </div>
          `)}
          ${status ? `<p class="status">${status}</p>` : ""}
        </section>
      </main>
    `;
    return;
  }

  if (mode === "locked") {
    container.innerHTML = `
      <main class="screen centered">
        <section class="panel auth-panel">
          <p class="eyebrow">${hasVault ? "🔒 Vault bloqueado" : "🔒 Acceso requerido"}</p>
          <h1>Desbloquear</h1>
          <p class="muted">Autobloqueo a ${lockMinutes} min.</p>
          <p class="shell-note">${renderContextHint(viewModel)}</p>
          <form id="unlock-form" class="stack">
            <label>
              <span>Clave local</span>
              <input name="passphrase" type="password" required placeholder="Tu clave local">
            </label>
            <button class="primary" type="submit">Desbloquear</button>
          </form>
          ${renderAuthSecondaryActions(`
            <p class="muted">Tus datos siguen cifrados hasta que abras tu espacio.</p>
            <div class="button-row button-row-start">
              ${renderImportCta()}
              ${renderResetVaultButton()}
            </div>
          `)}
          ${status ? `<p class="status">${status}</p>` : ""}
        </section>
      </main>
    `;
    return;
  }

  const preparationPack = getWeeklyPreparationPack(state);
  const reviewSummary = getWeeklyReviewSummary(state);
  const todayKey = new Date().toISOString().slice(0, 10);
  const mealsToday = state.nutrition.meals.filter(meal => meal.date === todayKey).length;
  const sessionsToday = state.training.sessions.filter(session => session.date === todayKey).length;
  const shellPill =
    activeTab === "home"
      ? "Hoy"
      : activeTab === "planning"
        ? "Semana"
        : activeTab === "recovery"
          ? "Sueño"
          : activeMeta.label;

  container.innerHTML = `
    <main class="screen app-screen theme-${activeTab}">
      <header class="topbar shell-topbar">
        <div class="shell-brand">
          <p class="shell-title">${displayName}</p>
          <div class="shell-pill-row">
            <span class="shell-pill shell-pill-active"><span class="shell-pill-icon" aria-hidden="true">${activeMeta.icon}</span>${shellPill}</span>
            ${activeTab === "home" ? `<span class="shell-pill">${mealsToday} comida(s)</span>` : ""}
            ${activeTab === "home" ? `<span class="shell-pill">${sessionsToday} entreno(s)</span>` : ""}
          </div>
        </div>
        <div class="topbar-actions">
          <button id="lock-button" class="ghost compact">Bloquear</button>
        </div>
      </header>

      ${status ? `<p class="status app-status" role="status" aria-live="polite">${status}</p>` : ""}
      ${renderSurface(viewModel)}
      ${renderMaintenanceFooter(activeTab)}
      ${renderBottomNav(activeTab)}
    </main>
  `;
}
