import { renderDashboardFeature } from "../features/dashboard-view.js";
import { renderNutritionFeature } from "../features/nutrition-view.js";
import { renderPlanningFeature } from "../features/planning-view.js";
import { renderRecoveryFeature } from "../features/recovery-view.js";
import { renderTrainingFeature } from "../features/training-view.js";
import { renderWellbeingFeature } from "../features/wellbeing-view.js";
import { renderLibraryFeature } from "../features/library-view.js";
import { localDateKey } from "../domain/date.js";
import { sectionCard } from "./feature-layout.js";

const APP_TABS = [
  { id: "home", label: "Hoy", mobileLabel: "Hoy" },
  { id: "planning", label: "Semana", mobileLabel: "Semana" },
  { id: "nutrition", label: "Comida", mobileLabel: "Comida" },
  { id: "training", label: "Entreno", mobileLabel: "Entreno" },
  { id: "more", label: "Más", mobileLabel: "Más" }
];

const MORE_TABS = [
  { id: "wellbeing", label: "Salud", note: "Síntomas, ciclo y medicación" },
  { id: "recovery", label: "Sueño", note: "Noches, recuperación y cierre" },
  { id: "library", label: "Biblioteca", note: "Lecturas, notas y reto anual" }
];

function normalizeShellTab(activeTab) {
  if (MORE_TABS.some(tab => tab.id === activeTab)) return "more";
  return activeTab;
}

function currentTabMeta(activeTab) {
  return APP_TABS.find(tab => tab.id === normalizeShellTab(activeTab)) || APP_TABS[0];
}

function renderBottomNav(activeTab) {
  const normalized = normalizeShellTab(activeTab);
  return `
    <nav class="bottom-nav" aria-label="Navegación principal">
      ${APP_TABS.map(
        tab => `
          <button
            class="bottom-nav-item${tab.id === normalized ? " is-active" : ""}"
            type="button"
            data-action="open-tab"
            data-tab="${tab.id}"
            aria-pressed="${tab.id === normalized ? "true" : "false"}"
            aria-current="${tab.id === normalized ? "page" : "false"}"
          >
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
    return "Mientras uses este mismo acceso directo, la sesión puede mantenerse. Si alternas con navegador, exporta una copia para alinear ambos contextos.";
  }
  return "En este mismo navegador la sesión puede reanudarse. Si luego usas la app instalada, puede vivir como otro contexto local.";
}

function renderResetVaultButton(label = "Limpiar este contexto") {
  return `<button id="reset-vault-button" class="ghost compact" type="button">${label}</button>`;
}

function renderPasswordField({
  name,
  label,
  placeholder = "",
  minlength = 8,
  autocomplete = "current-password",
  required = true
}) {
  return `
    <label class="secret-field">
      <span>${label}</span>
      <div class="secret-field-row">
        <input name="${name}" type="password" minlength="${minlength}"${required ? " required" : ""} autocomplete="${autocomplete}" placeholder="${placeholder}">
        <button class="ghost compact secret-toggle" type="button" data-action="toggle-secret" aria-label="Mostrar u ocultar ${label.toLowerCase()}">Ver</button>
      </div>
    </label>
  `;
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

function renderMoreHub(viewModel) {
  const books = Array.isArray(viewModel.state.library?.books) ? viewModel.state.library.books : [];
  const symptoms = Object.values(viewModel.state.cycle?.symptomLog || {}).reduce(
    (sum, day) => sum + (Array.isArray(day) ? day.length : 0),
    0
  );
  const sleeps = Object.keys(viewModel.state.sleepEntries || {}).length;

  return `
    <section class="panel stack app-feature-shell">
      <header class="feature-header feature-header-shell">
        <div class="feature-header-copy">
          <p class="eyebrow">Más</p>
          <h2>Capas secundarias</h2>
          <p class="muted">Entrar donde toca sin recargar la navegación base.</p>
        </div>
      </header>
      <div class="more-hub-grid">
        ${MORE_TABS.map(tab => {
          const count =
            tab.id === "library"
              ? `${books.length} libro(s)`
              : tab.id === "recovery"
                ? `${sleeps} noche(s)`
                : `${symptoms} registro(s)`;
          return sectionCard(
            tab.label,
            tab.note,
            `
              <article class="summary-card summary-card-soft">
                <p class="entry-title">${count}</p>
                <p class="entry-meta">guardados</p>
              </article>
              <button class="primary compact" type="button" data-action="open-tab" data-tab="${tab.id}">Abrir</button>
            `,
            tab.id === "wellbeing"
              ? "section-card-glass section-card-wellbeing-light"
              : "section-card-glass section-card-recovery-light"
          );
        }).join("")}
      </div>
    </section>
  `;
}

function renderSurface(viewModel) {
  const activeTab = viewModel.currentTab || "home";
  const { state } = viewModel;
  const currentView = viewModel.moduleViews?.[activeTab];

  if (activeTab === "planning") return renderPlanningFeature(state, { currentView });
  if (activeTab === "nutrition") return renderNutritionFeature(state, { currentView });
  if (activeTab === "training") return renderTrainingFeature(state, { currentView, restTimer: viewModel.restTimer || {} });
  if (activeTab === "wellbeing") return renderWellbeingFeature(state, { currentView });
  if (activeTab === "recovery") return renderRecoveryFeature(state, { currentView });
  if (activeTab === "library") return renderLibraryFeature(state, { currentView });
  if (activeTab === "more") return renderMoreHub(viewModel);

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
          <h4>Copia y recuperación</h4>
        </div>
      </summary>
      <div class="stack disclosure-body">
        <button class="primary compact" type="button" data-action="open-module-view" data-tab="home" data-view="settings">Abrir seguridad</button>
        <p class="muted">Exporta o importa desde Personal &gt; Seguridad antes de actualizar, limpiar caché o cambiar de contexto.</p>
      </div>
    </details>
  `;
}

function lockSummary(lockMinutes) {
  if (!(lockMinutes > 0)) return "Bloqueo manual.";
  return `Autobloqueo a ${lockMinutes} min.`;
}

function renderMaintenanceFooter(activeTab) {
  if (activeTab !== "recovery") return "";
  return renderVaultFooter();
}

function renderShellPills(activeTab, activeMeta, mealsToday, sessionsToday) {
  if (normalizeShellTab(activeTab) !== "home") {
    return `<div class="shell-pill-row"><span class="shell-pill shell-pill-active">${activeMeta.label}</span></div>`;
  }

  return `
    <div class="shell-pill-row">
      <span class="shell-pill shell-pill-active">${activeMeta.label}</span>
      <span class="shell-pill">${mealsToday} comida(s)</span>
      <span class="shell-pill">${sessionsToday} entreno(s)</span>
    </div>
  `;
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
          <p class="eyebrow">Base local</p>
          <h1>Preparando tu espacio</h1>
          <p class="muted">Cargando la app y tu estructura segura.</p>
        </section>
      </main>
    `;
    return;
  }

  if (mode === "setup") {
    container.innerHTML = `
      <main class="screen centered">
        <section class="panel auth-panel">
          <p class="eyebrow">Acceso local</p>
          <h1>Crear acceso</h1>
          <p class="muted">Tus datos quedan cifrados en este dispositivo.</p>
          <p class="shell-note">Si no bloqueas ni limpias este contexto, la app puede reanudar la sesión por ti.</p>
          <p class="shell-note">${renderContextHint(viewModel)}</p>
          <form id="setup-form" class="stack">
            ${renderPasswordField({ name: "passphrase", label: "Clave local", placeholder: "Mínimo 8 caracteres", autocomplete: "new-password" })}
            ${renderPasswordField({ name: "passphraseConfirm", label: "Confirmar clave local", placeholder: "Repite la clave", autocomplete: "new-password" })}
            <button class="primary" type="submit">Crear acceso</button>
          </form>
          ${renderAuthSecondaryActions(`
            <p class="muted">Si vienes de otro contexto, importa una copia cifrada.</p>
            <form id="setup-import-form" class="stack inline-form-soft">
              <div class="field-grid">
                ${renderPasswordField({ name: "backupImportPassphrase", label: "Clave del archivo", placeholder: "Clave del archivo" })}
                ${renderPasswordField({ name: "newVaultPassphrase", label: "Nueva clave local", placeholder: "Mínimo 8 caracteres", autocomplete: "new-password" })}
              </div>
              <div class="field-grid">
                ${renderPasswordField({ name: "newVaultPassphraseConfirm", label: "Confirmar clave local", placeholder: "Repite la clave", autocomplete: "new-password" })}
                <label class="file-button compact-file auth-file"><input name="backupFile" type="file" accept=".json,application/json" required>Elegir archivo</label>
              </div>
              <button class="ghost compact" type="submit">Importar copia aquí</button>
            </form>
            <div class="button-row button-row-start">${vaultHealth === "incomplete" ? renderResetVaultButton("Limpiar contexto roto") : ""}</div>
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
          <p class="eyebrow">${hasVault ? "Espacio bloqueado" : "Acceso requerido"}</p>
          <h1>Desbloquear</h1>
          <p class="muted">${lockSummary(lockMinutes)}</p>
          <p class="shell-note">Si mantienes este mismo contexto abierto, no deberías tener que repetir la clave constantemente.</p>
          <p class="shell-note">${renderContextHint(viewModel)}</p>
          <form id="unlock-form" class="stack">
            ${renderPasswordField({ name: "passphrase", label: "Clave local", placeholder: "Tu clave local" })}
            <button class="primary" type="submit">Desbloquear</button>
          </form>
          ${renderAuthSecondaryActions(`
            <p class="muted">Tus datos siguen cifrados hasta que abras tu espacio. Si recargas dentro de este mismo contexto, la app intentará mantener la sesión.</p>
            <form id="locked-import-form" class="stack inline-form-soft">
              <div class="field-grid">
                ${renderPasswordField({ name: "backupImportPassphrase", label: "Clave del archivo", placeholder: "Clave del archivo" })}
                ${renderPasswordField({ name: "vaultPassphrase", label: "Clave local actual", placeholder: "Clave de este contexto" })}
              </div>
              <label class="file-button compact-file auth-file"><input name="backupFile" type="file" accept=".json,application/json" required>Elegir archivo</label>
              <button class="ghost compact" type="submit">Importar y reemplazar</button>
            </form>
            <div class="button-row button-row-start">${renderResetVaultButton()}</div>
          `)}
          ${status ? `<p class="status">${status}</p>` : ""}
        </section>
      </main>
    `;
    return;
  }

  const todayKey = localDateKey(new Date());
  const mealsToday = state.nutrition.meals.filter(meal => meal.date === todayKey).length;
  const sessionsToday = state.training.sessions.filter(session => session.date === todayKey).length;

  container.innerHTML = `
    <main class="screen app-screen theme-${activeTab}">
      <header class="topbar shell-topbar">
        <div class="shell-brand">
          <p class="shell-title">${displayName}</p>
          ${renderShellPills(activeTab, activeMeta, mealsToday, sessionsToday)}
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

