import { renderDashboardFeature } from "../features/dashboard/dashboard-view.js";
import { renderNutritionFeature } from "../features/nutrition/nutrition-view.js";
import { renderPlanningFeature } from "../features/planning/planning-view.js";
import { renderRecoveryFeature } from "../features/recovery/recovery-view.js";
import { renderTrainingFeature } from "../features/training/training-view.js";
import { renderWellbeingFeature } from "../features/wellbeing/wellbeing-view.js";
import { getWeeklyPreparationPack, getWeeklyReviewSummary } from "../domain/weekly.js";

const APP_TABS = [
  { id: "home", label: "Hoy", eyebrow: "Centro de mando" },
  { id: "planning", label: "Semana", eyebrow: "Planificacion" },
  { id: "nutrition", label: "Nutricion", eyebrow: "Comidas y recetas" },
  { id: "training", label: "Entreno", eyebrow: "Sesiones y progresion" },
  { id: "wellbeing", label: "Salud", eyebrow: "Ciclo y bienestar" },
  { id: "recovery", label: "Revision", eyebrow: "Sueno y recalibracion" }
];

function currentTabMeta(activeTab) {
  return APP_TABS.find(tab => tab.id === activeTab) || APP_TABS[0];
}

function renderTabBar(activeTab) {
  return `
    <nav class="tab-strip" aria-label="Secciones">
      ${APP_TABS.map(
        tab => `
          <button
            class="tab-chip${tab.id === activeTab ? " is-active" : ""}"
            type="button"
            data-action="open-tab"
            data-tab="${tab.id}"
            aria-pressed="${tab.id === activeTab ? "true" : "false"}"
          >
            ${tab.label}
          </button>
        `
      ).join("")}
    </nav>
  `;
}

function renderBottomNav(activeTab) {
  return `
    <nav class="bottom-nav" aria-label="Navegacion principal">
      ${APP_TABS.map(
        tab => `
          <button
            class="bottom-nav-item${tab.id === activeTab ? " is-active" : ""}"
            type="button"
            data-action="open-tab"
            data-tab="${tab.id}"
            aria-pressed="${tab.id === activeTab ? "true" : "false"}"
          >
            <span>${tab.label}</span>
          </button>
        `
      ).join("")}
    </nav>
  `;
}

function renderSurface(viewModel) {
  const activeTab = viewModel.currentTab || "home";
  const { state } = viewModel;

  if (activeTab === "planning") return renderPlanningFeature(state);
  if (activeTab === "nutrition") return renderNutritionFeature(state);
  if (activeTab === "training") return renderTrainingFeature(state);
  if (activeTab === "wellbeing") return renderWellbeingFeature(state);
  if (activeTab === "recovery") return renderRecoveryFeature(state);

  return `
    <section class="surface-stack">
      ${renderDashboardFeature(state)}
      ${renderPrototypeStatus(viewModel)}
    </section>
  `;
}

function renderPrototypeStatus(viewModel) {
  const runtime = viewModel.runtime || {};
  const checks = [
    {
      label: "Vault",
      value: viewModel.mode === "ready" ? "activo" : "bloqueado",
      tone: viewModel.mode === "ready" ? "ok" : "watch"
    },
    {
      label: "Standalone",
      value: runtime.isStandalone ? "si" : "no",
      tone: runtime.isStandalone ? "ok" : "watch"
    },
    {
      label: "Online",
      value: runtime.isOnline === false ? "no" : "si",
      tone: runtime.isOnline === false ? "watch" : "ok"
    },
    {
      label: "SW",
      value: runtime.hasServiceWorker ? "listo" : "sin soporte",
      tone: runtime.hasServiceWorker ? "ok" : "watch"
    }
  ];

  return `
    <details class="panel support-panel support-panel-collapsed">
      <summary class="support-summary-toggle">
        <div>
          <p class="eyebrow">Vault y backup</p>
          <h3>Seguridad, exportacion e importacion</h3>
        </div>
        <span class="muted">Abrir</span>
      </summary>
      <div class="stack support-panel-body">
        <section class="support-summary">
          ${checks
            .map(
              item => `
                <article class="summary-card">
                  <p class="eyebrow">${item.label}</p>
                  <p class="metric">${item.value}</p>
                  <p class="entry-meta">${item.tone === "ok" ? "correcto" : "a revisar"}</p>
                </article>
              `
            )
            .join("")}
        </section>
        <div class="button-row button-row-start">
          <button id="export-button" class="primary compact">Exportar backup cifrado</button>
          <label class="file-button compact-file">
            <input id="import-file" type="file" accept=".json,application/json">
            Importar backup o legado
          </label>
        </div>
        <p class="muted">
          Este bloque queda recogido para que la seguridad siga estando presente, pero sin ocupar toda la experiencia de entrada.
        </p>
      </div>
    </details>
  `;
}

export function renderApp(container, viewModel) {
  const { mode, state, status, hasVault, lockMinutes } = viewModel;
  const displayName = state?.profile?.displayName?.trim() || "Segundo Cerebro";
  const activeTab = viewModel.currentTab || "home";
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
          <p class="eyebrow">Nuevo vault local</p>
          <h1>Crear acceso seguro</h1>
          <p class="muted">Esta nueva base guarda la informacion sensible cifrada en el dispositivo.</p>
          <form id="setup-form" class="stack">
            <label>
              <span>Passphrase</span>
              <input name="passphrase" type="password" minlength="8" required placeholder="Minimo 8 caracteres">
            </label>
            <label>
              <span>Confirmar passphrase</span>
              <input name="passphraseConfirm" type="password" minlength="8" required placeholder="Repite la passphrase">
            </label>
            <button class="primary" type="submit">Crear vault</button>
          </form>
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
          <p class="eyebrow">${hasVault ? "Vault bloqueado" : "Acceso requerido"}</p>
          <h1>Desbloquear Segundo Cerebro</h1>
          <p class="muted">Autobloqueo configurado a ${lockMinutes} minutos de inactividad.</p>
          <form id="unlock-form" class="stack">
            <label>
              <span>Passphrase</span>
              <input name="passphrase" type="password" required placeholder="Tu clave local">
            </label>
            <button class="primary" type="submit">Desbloquear</button>
          </form>
          ${status ? `<p class="status">${status}</p>` : ""}
        </section>
      </main>
    `;
    return;
  }

  const tab = currentTabMeta(activeTab);
  const preparationPack = getWeeklyPreparationPack(state);
  const reviewSummary = getWeeklyReviewSummary(state);
  const mealsToday = state.nutrition.meals.filter(meal => meal.date === new Date().toISOString().slice(0, 10)).length;
  const sessionsToday = state.training.sessions.filter(session => session.date === new Date().toISOString().slice(0, 10)).length;
  let shellNote = "Sistema local listo para uso diario.";

  if (activeTab === "home") {
    shellNote = `Hoy llevas ${mealsToday} comida(s) y ${sessionsToday} entreno(s) registrados.`;
  } else if (activeTab === "planning") {
    shellNote = `Semana preparada ${preparationPack.readinessScore}/100.`;
  } else if (activeTab === "recovery") {
    shellNote = `Revision semanal ${reviewSummary.completion}% completada.`;
  }

  container.innerHTML = `
    <main class="screen app-screen theme-${activeTab}">
      <header class="topbar shell-topbar">
        <div class="shell-brand">
          <p class="eyebrow">Segundo Cerebro local</p>
          <h1>${displayName}</h1>
          <p class="shell-note">${tab.label} - ${shellNote}</p>
        </div>
        <div class="topbar-actions">
          <button id="lock-button" class="ghost compact">Bloquear</button>
        </div>
      </header>

      ${status ? `<p class="status app-status">${status}</p>` : ""}
      ${renderTabBar(activeTab)}
      ${renderSurface(viewModel)}
      ${renderBottomNav(activeTab)}
    </main>
  `;
}
