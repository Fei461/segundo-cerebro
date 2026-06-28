import { renderDashboardFeature } from "../features/dashboard/dashboard-view.js";
import { renderNutritionFeature } from "../features/nutrition/nutrition-view.js";
import { renderPlanningFeature } from "../features/planning/planning-view.js";
import { renderRecoveryFeature } from "../features/recovery/recovery-view.js";
import { renderTrainingFeature } from "../features/training/training-view.js";
import { renderWellbeingFeature } from "../features/wellbeing/wellbeing-view.js";
import { getWeeklyPreparationPack, getWeeklyReviewSummary } from "../domain/weekly.js";

function renderQuickNav() {
  const items = [
    ["Inicio", "#home-panel"],
    ["Nutricion", "#nutrition-panel"],
    ["Entreno", "#training-panel"],
    ["Bienestar", "#wellbeing-panel"],
    ["Semana", "#planning-panel"],
    ["Recuperacion", "#recovery-panel"]
  ];

  return `
    <nav class="quick-nav" aria-label="Navegacion rapida">
      ${items.map(([label, href]) => `<a class="quick-nav-link" href="${href}">${label}</a>`).join("")}
    </nav>
  `;
}

function renderDomainCards(state) {
  const cards = [
    ["Nutricion", `${state.nutrition.meals.length} comidas registradas`],
    ["Recetas", `${state.recipes.length} recetas guardadas`],
    ["Meal planner", `${Object.keys(state.mealPlan).length} dias con plan`],
    ["Entreno", `${state.training.sessions.length} sesiones`],
    ["Ciclo", `${state.cycle.periodDays.length} dias registrados`],
    ["Sueno", `${Object.keys(state.sleepEntries).length} noches registradas`],
    ["Calendario", `${state.calendar.events.length} eventos`],
    ["Horario", `${state.schedule.blocks.length} bloques`],
    ["Notas", `${Object.keys(state.notes).length} notas`]
  ];

  return cards
    .map(
      ([title, body]) => `
        <article class="card">
          <p class="eyebrow">${title}</p>
          <p class="metric">${body}</p>
        </article>
      `
    )
    .join("");
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
    <section class="panel stack support-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Prototipo real</p>
          <h3>Estado para empezar a usarla</h3>
        </div>
      </div>
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
        <button id="load-demo-button" class="ghost compact">Cargar demo V1</button>
        <button id="prototype-check-button" class="ghost compact">Comprobar estado</button>
      </div>
      <p class="muted">
        Este bloque esta pensado para las primeras pruebas reales: comprobar si abre bien, si mantiene estado y si puedes sacar/recuperar un backup antes de meterle mas vida encima.
      </p>
    </section>
  `;
}

export function renderApp(container, viewModel) {
  const { mode, state, status, hasVault, lockMinutes } = viewModel;
  const displayName = state?.profile?.displayName?.trim() || "Tu espacio";
  const preparationPack = mode === "ready" ? getWeeklyPreparationPack(state) : null;
  const reviewSummary = mode === "ready" ? getWeeklyReviewSummary(state) : null;

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

  container.innerHTML = `
    <main class="screen app-screen">
      <header class="topbar">
        <div>
          <p class="eyebrow">Segundo Cerebro Â· Fase 1</p>
          <h1>${displayName}</h1>
        </div>
        <button id="lock-button" class="ghost">Bloquear</button>
      </header>

      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Estado actual</p>
          <h2>La mayor parte del uso diario ya vive fuera del HTML gigante</h2>
          <p class="muted">
            Esta app funciona como base PWA con almacenamiento cifrado local y ya cubre seguimiento, agenda y registro personal.
          </p>
          ${preparationPack ? `<p class="entry-note">Semana preparada: ${preparationPack.readinessScore}/100 Â· ${preparationPack.headline}</p>` : ""}
          ${reviewSummary ? `<p class="entry-note">Revision semanal: ${reviewSummary.completion}% Â· siguiente paso: ${reviewSummary.nextStep?.title || "cerrada"}</p>` : ""}
        </div>
        <div class="hero-actions">
          <a class="chip-link" href="#home-panel">Ir a Hoy</a>
          <a class="chip-link" href="#planning-panel">Ir a Semana</a>
          <a class="chip-link" href="#recovery-panel">Ir a Revision</a>
        </div>
      </section>

      ${status ? `<p class="status app-status">${status}</p>` : ""}

      ${renderPrototypeStatus(viewModel)}

      ${renderQuickNav()}

      <section class="grid">
        ${renderDomainCards(state)}
      </section>

      ${renderDashboardFeature(state)}
      ${renderNutritionFeature(state)}
      ${renderTrainingFeature(state)}
      ${renderWellbeingFeature(state)}
      ${renderPlanningFeature(state)}
      ${renderRecoveryFeature(state)}

      <section class="panel stack">
        <div>
          <p class="eyebrow">Migracion</p>
          <h3>Recta final de la fase 1</h3>
          <p class="muted">
            Lo siguiente ya no es abrir grandes dominios nuevos, sino refinar UX, endurecer validaciones y rematar la limpieza del legado antes de pasar a la siguiente fase del roadmap.
          </p>
        </div>
        <div class="callout">
          <strong>Importante:</strong> el prototipo antiguo sigue intacto. Esta carpeta es la nueva base segura sobre la que seguimos consolidando el producto.
        </div>
      </section>
    </main>
  `;
}
