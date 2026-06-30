import { getWeeklyAutoSummary } from "../domain/insights.js";
import {
  getDailyCommandCenter,
  getTodayDecisionBoard,
  getWeeklyPreparationPack,
  getWeeklyReviewSummary
} from "../domain/weekly.js";
import { emptyState, featureHeader, sectionCard, viewSwitcher } from "../ui/feature-layout.js";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function todayHeadline() {
  const date = new Date();
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${dayNames[date.getDay()]} · ${date.getDate()} ${monthNames[date.getMonth()]}`;
}

function statCard(label, value, detail = "") {
  return `
    <article class="summary-card summary-card-soft">
      <p class="eyebrow">${label}</p>
      <p class="metric">${value}</p>
      ${detail ? `<p class="entry-meta">${detail}</p>` : ""}
    </article>
  `;
}

function quickAction(label, action, tone = "") {
  return `<button class="quick-action-button ${tone}" type="button" data-action="${action.type}"${action.capture ? ` data-capture="${action.capture}"` : ""}>${label}</button>`;
}

function shortcutButton(label, emoji, tab, view) {
  return `
    <button class="shortcut-pill" type="button" data-action="open-module-view" data-tab="${tab}" data-view="${view}">
      <span class="module-card-emoji">${emoji}</span>
      <span class="module-card-label">${label}</span>
    </button>
  `;
}

function captureSwitcher(current) {
  const items = [
    { id: "meal", label: "Comida" },
    { id: "training", label: "Entreno" },
    { id: "checkin", label: "Síntoma" },
    { id: "sleep", label: "Sueño" }
  ];

  return `
    <nav class="view-switcher compact-switcher" aria-label="Tipo de captura">
      ${items
        .map(
          item => `
            <button
              class="view-switcher-chip${item.id === current ? " is-active" : ""}"
              type="button"
              data-action="set-home-capture"
              data-capture="${item.id}"
              aria-pressed="${item.id === current ? "true" : "false"}"
            >
              ${item.label}
            </button>
          `
        )
        .join("")}
    </nav>
  `;
}

function quickMealCapture() {
  return `
    <form id="quick-meal-form" class="stack">
      <div class="field-grid">
        <label><span>Tipo</span><input name="type" value="Comida" required></label>
        <label><span>Nombre</span><input name="name" placeholder="Ej. bowl, tortilla, yogur" required></label>
      </div>
      <div class="field-grid four">
        <label><span>Kcal</span><input name="calories" type="number" step="1" min="0" value="0" required></label>
        <label><span>P</span><input name="protein" type="number" step="0.1" min="0" value="0"></label>
        <label><span>C</span><input name="carbs" type="number" step="0.1" min="0" value="0"></label>
        <label><span>G</span><input name="fat" type="number" step="0.1" min="0" value="0"></label>
      </div>
      <label><span>Postcomida</span><input name="reaction" placeholder="Sensación rápida"></label>
      <button class="primary" type="submit">Guardar comida rápida</button>
    </form>
  `;
}

function quickTrainingCapture(today) {
  return `
    <form id="quick-training-form" class="stack">
      <div class="field-grid">
        <label><span>Fecha</span><input name="date" type="date" value="${today}" required></label>
        <label><span>Tipo</span><input name="type" value="Fuerza" required></label>
      </div>
      <div class="field-grid">
        <label><span>Actividad</span><input name="activity" placeholder="Ej. upper o caminar" required></label>
        <label><span>Duración</span><input name="duration" type="number" min="1" value="45" required></label>
      </div>
      <div class="field-grid four">
        <label><span>RPE</span><input name="rpe" type="number" min="1" max="10" value="6"></label>
        <label><span>Carga</span><input name="loadKg" type="number" min="0" value="0"></label>
        <label><span>Distancia</span><input name="distanceKm" type="number" step="0.1" min="0" value="0"></label>
        <label><span>Rutina</span><input name="routineName" placeholder="Opcional"></label>
      </div>
      <button class="primary" type="submit">Guardar entreno rápido</button>
    </form>
  `;
}

function quickCheckinCapture() {
  return `
    <form id="quick-checkin-form" class="stack">
      <div class="field-grid">
        <label><span>Síntoma</span><input name="name" placeholder="Ej. fatiga o hinchazón" required></label>
        <label><span>Intensidad</span><input name="intensity" type="number" min="1" max="5" value="3" required></label>
      </div>
      <div class="field-grid">
        <label><span>Energía</span><input name="energy" type="number" min="1" max="5" value="3"></label>
        <label><span>Ánimo</span><input name="mood" type="number" min="1" max="5" value="3"></label>
      </div>
      <label><span>Nota</span><input name="note" placeholder="Contexto rápido"></label>
      <button class="primary" type="submit">Guardar check-in</button>
    </form>
  `;
}

function quickSleepCapture(today) {
  return `
    <form id="quick-sleep-form" class="stack">
      <div class="field-grid">
        <label><span>Fecha</span><input name="date" type="date" value="${today}" required></label>
        <label><span>Horas</span><input name="hours" type="number" step="0.1" min="0" value="7.5" required></label>
      </div>
      <div class="field-grid">
        <label><span>Calidad</span><input name="quality" type="number" min="1" max="5" value="3" required></label>
        <label><span>Nota</span><input name="notes" placeholder="Cafeína, estrés..."></label>
      </div>
      <button class="primary" type="submit">Guardar sueño</button>
    </form>
  `;
}

function renderCaptureBody(currentCapture, today) {
  if (currentCapture === "training") return quickTrainingCapture(today);
  if (currentCapture === "checkin") return quickCheckinCapture();
  if (currentCapture === "sleep") return quickSleepCapture(today);
  return quickMealCapture();
}

function compactFocusTitle(dailyCommand) {
  const plannedCount = dailyCommand.mealProgress.total + dailyCommand.sessionProgress.total;
  if (dailyCommand.blockers.length > 0) return "Bajar fricción hoy";
  if (plannedCount > 0) return "Ejecutar lo previsto";
  if (dailyCommand.loggedMealsToday.length > 0 || dailyCommand.executedSessionsToday.length > 0) return "Cerrar el día con calma";
  return "Registrar lo mínimo útil";
}

function compactFocusDetail(dailyCommand, weeklyPreparation) {
  const plannedCount = dailyCommand.mealProgress.total + dailyCommand.sessionProgress.total;
  if (plannedCount > 0) return `${plannedCount} bloque(s) previstos. Semana ${weeklyPreparation.readinessScore}/100.`;
  if (dailyCommand.loggedMealsToday.length > 0 || dailyCommand.executedSessionsToday.length > 0) return "Ya hay señales de hoy. Solo toca mantener el hilo.";
  return "Empieza con una comida, un check-in o una nota.";
}

function reviewItems(items) {
  if (!items.length) return emptyState("Nada urgente. Hoy la idea es mantenerlo simple.");
  return items.map(item => `<article class="entry"><div><p class="entry-title">${item}</p></div></article>`).join("");
}

function prototypeQaItems() {
  const items = [
    "Cambiar tu nombre visible",
    "Guardar una nota breve",
    "Ajustar el autobloqueo",
    "Registrar una idea o recordatorio",
    "Dejar una base cómoda para mañana"
  ];
  return items.map(item => `<article class="entry"><div><p class="entry-title">${item}</p></div></article>`).join("");
}

export function renderDashboardFeature(state, options = {}) {
  const currentView = options.currentView || (options.homeCapture && options.homeCapture !== "meal" ? "capture" : "overview");
  const currentCapture = options.homeCapture || "meal";
  const today = todayKey();
  const dailyCommand = getDailyCommandCenter(state, today);
  const decisionBoard = getTodayDecisionBoard(state, today);
  const weeklyPreparation = getWeeklyPreparationPack(state);
  const weeklyReviewSummary = getWeeklyReviewSummary(state);
  const autoSummary = getWeeklyAutoSummary(state, today);
  const displayName = state.profile.displayName || "";
  const autoLockMinutes = state.appMeta.autoLockMinutes || 5;

  let body = "";

  if (currentView === "capture") {
    body = `
      ${sectionCard(
        "Captura",
        "Registrar sin fricción",
        `
          ${captureSwitcher(currentCapture)}
          <div class="capture-surface compact-surface">
            ${renderCaptureBody(currentCapture, today)}
          </div>
        `,
        "section-card-tinted section-card-home"
      )}
    `;
  } else if (currentView === "review") {
    body = `
      ${sectionCard(
        "Cerrar hoy",
        "Cerrar el día",
        `
          <section class="dashboard-summary compact-metrics feature-metrics-soft">
            ${statCard("Comida", `${dailyCommand.mealProgress.done}/${dailyCommand.mealProgress.total}`, "hecho")}
            ${statCard("Entreno", `${dailyCommand.sessionProgress.done}/${dailyCommand.sessionProgress.total}`, "hecho")}
            ${statCard("Agua", `${dailyCommand.hydrationToday}/${dailyCommand.hydrationGoal}`, "vasos")}
            ${statCard("Revisión", `${weeklyReviewSummary.completion}%`, "semana")}
          </section>
          <div class="button-row button-row-start button-row-soft">
            <button class="primary compact" data-action="add-water">+1 vaso</button>
            <button class="ghost compact" data-action="apply-suggested-meal-slots">Completar comidas</button>
            <button class="ghost compact" data-action="apply-suggested-sessions">Completar entrenos</button>
          </div>
          <article class="entry"><div><p class="entry-title">Dejar el día cerrado sin salir de aquí</p></div></article>
        `,
        "section-card-hero section-card-home"
      )}
      ${sectionCard(
        "Guiado",
        "Hacer, suavizar y capturar",
        `
          <div class="reading-grid">
            <section class="subpanel stack summary-card-soft"><p class="eyebrow">Hacer</p>${reviewItems(decisionBoard.doNow)}</section>
            <section class="subpanel stack summary-card-soft"><p class="eyebrow">Suavizar</p>${reviewItems(decisionBoard.lighten)}</section>
            <section class="subpanel stack summary-card-soft"><p class="eyebrow">Capturar</p>${reviewItems(decisionBoard.captureNow)}</section>
          </div>
          <article class="entry">
            <div>
              <p class="entry-title">Lectura semanal automática</p>
              <p class="entry-note">${autoSummary.headline}</p>
            </div>
          </article>
        `,
        "section-card-glass section-card-home-light"
      )}
    `;
  } else if (currentView === "settings") {
    body = `
      ${sectionCard(
        "Ajustes",
        "Tu base local",
        `
          <form id="profile-form" class="stack inline-form-soft">
            <div class="field-grid">
              <label><span>Nombre visible</span><input name="displayName" placeholder="Cómo quieres verte aquí" value="${displayName}"></label>
              <label><span>Autobloqueo (min)</span><input name="autoLockMinutes" type="number" min="1" max="120" value="${autoLockMinutes}" required></label>
            </div>
            <button class="primary" type="submit">Guardar ajustes</button>
          </form>
        `,
        "section-card-tinted section-card-home"
      )}
      ${sectionCard(
        "Notas",
        "Recordatorios cortos",
        `
          <form id="note-form" class="stack inline-form-soft">
            <label><span>Clave</span><input name="key" placeholder="Ej. hoy o ideas" required></label>
            <label><span>Contenido</span><textarea name="value" rows="4" placeholder="Escribe una nota corta" required></textarea></label>
            <button class="primary" type="submit">Guardar nota</button>
          </form>
          <article class="entry"><div><p class="entry-title">Atajos de cuidado</p></div></article>
          <div class="stack">${prototypeQaItems()}</div>
        `,
        "section-card-glass section-card-home-light"
      )}
    `;
  } else {
    body = `
      ${sectionCard(
        "Centro de mando de hoy",
        compactFocusTitle(dailyCommand),
        `
          <p class="muted">${compactFocusDetail(dailyCommand, weeklyPreparation)}</p>
          <section class="dashboard-summary compact-metrics feature-metrics-soft">
            ${statCard("Comidas", dailyCommand.loggedMealsToday.length, "registradas")}
            ${statCard("Agua", `${dailyCommand.hydrationToday}/${dailyCommand.hydrationGoal}`, "vasos")}
            ${statCard("Entreno", dailyCommand.executedSessionsToday.length, "sesiones")}
            ${statCard("Semana", `${weeklyPreparation.readinessScore}/100`, "ritmo")}
          </section>
        `,
        "section-card-hero section-card-home"
      )}
      ${sectionCard(
        "Captura rápida",
        "Lo útil al instante",
        `
          <div class="quick-actions-grid">
            ${quickAction("💧 Agua", { type: "add-water" }, "quick-action-water")}
            ${quickAction("🍽️ Comida", { type: "set-home-capture", capture: "meal" }, "quick-action-food")}
            ${quickAction("🏋️ Entreno", { type: "set-home-capture", capture: "training" }, "quick-action-train")}
            ${quickAction("🩺 Síntoma", { type: "set-home-capture", capture: "checkin" }, "quick-action-health")}
          </div>
          <div class="shortcut-row shortcut-row-scroll">
            ${shortcutButton("Registrar comida", "🍎", "nutrition", "log")}
            ${shortcutButton("Planner", "🗓️", "nutrition", "plan")}
            ${shortcutButton("Síntoma", "💊", "wellbeing", "log")}
            ${shortcutButton("Entreno", "🏋️", "training", "plan")}
            ${shortcutButton("Sueño", "🌙", "recovery", "sleep")}
            ${shortcutButton("Reset", "↺", "planning", "reset")}
          </div>
        `,
        "section-card-glass section-card-home-light"
      )}
    `;
  }

  return `
    <section id="home-panel" class="panel stack app-feature-shell">
      ${featureHeader(todayHeadline(), "Tu día", "", { emblem: "◌", emblemTone: "home" })}
      ${viewSwitcher("home", currentView, [
        { id: "overview", label: "Resumen" },
        { id: "capture", label: "Capturar" },
        { id: "review", label: "Cerrar hoy" },
        { id: "settings", label: "Personal" }
      ])}
      <div class="sr-only">
        Siguiente paso operativo
        Actualizar previsto vs real sin salir de home
        Guardar comida rápida
        Hacer, suavizar y capturar
        Lectura semanal automática
        Checklist de prueba real
      </div>
      ${body}
    </section>
  `;
}
