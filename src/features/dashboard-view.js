import { getWeeklyAutoSummary } from "../domain/insights.js";
import {
  getDailyCommandCenter,
  getOperationalTimeline,
  getTodayDecisionBoard,
  getWeeklyPreparationPack,
  getWeeklyReviewFlow,
  getWeeklyReviewSummary
} from "../domain/weekly.js";
import { getPlannedMeals, getPlannedSessions } from "../domain/plans.js";
import { formatPlanStatus } from "../ui/formatters.js";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function todayHeadline() {
  const date = new Date();
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${dayNames[date.getDay()]} · ${date.getDate()} ${monthNames[date.getMonth()]}`;
}

function summaryMetric(label, value, detail) {
  return `
    <article class="summary-card">
      <p class="eyebrow">${label}</p>
      <p class="metric">${value}</p>
      <p class="entry-meta">${detail}</p>
    </article>
  `;
}

function compactSignalCard(label, value, detail) {
  return `
    <article class="summary-card summary-card-compact">
      <p class="eyebrow">${label}</p>
      <p class="metric">${value}</p>
      <p class="entry-meta">${detail}</p>
    </article>
  `;
}

function isFirstUseState(state) {
  return (
    state.nutrition.meals.length === 0 &&
    state.training.sessions.length === 0 &&
    state.recipes.length === 0 &&
    state.calendar.events.length === 0 &&
    state.schedule.blocks.length === 0 &&
    state.cycle.periodDays.length === 0 &&
    Object.keys(state.cycle.symptomLog || {}).length === 0 &&
    Object.keys(state.sleepEntries || {}).length === 0 &&
    getPlannedMeals(state).length === 0 &&
    getPlannedSessions(state).length === 0
  );
}

function reviewStepActionLabel(step) {
  if (step.cta === "apply-weekly-reset-routine") return "Aplicar";
  if (step.cta === "apply-suggested-meal-slots") return "Completar";
  if (step.cta === "apply-suggested-sessions") return "Programar";
  if (step.cta === "save-weekly-calibration-note") return "Guardar";
  return "Acción";
}

function quickLink(label, tab) {
  return `<button class="chip-link chip-button" type="button" data-action="open-tab" data-tab="${tab}">${label}</button>`;
}

function captureShortcut(label, capture) {
  return `<button class="chip-link chip-button" type="button" data-action="set-home-capture" data-capture="${capture}">${label}</button>`;
}

function quickActionButton(label, attrs, modifierClass = "") {
  const attributes = Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");
  return `
    <button
      class="quick-action-button${modifierClass ? ` ${modifierClass}` : ""}"
      type="button"
      ${attributes}
    >
      ${label}
    </button>
  `;
}

function moduleCard(label, emoji, tab, toneClass = "") {
  return `
    <button
      class="module-card${toneClass ? ` ${toneClass}` : ""}"
      type="button"
      data-action="open-tab"
      data-tab="${tab}"
    >
      <span class="module-card-emoji">${emoji}</span>
      <span class="module-card-label">${label}</span>
    </button>
  `;
}

function collapsiblePanel(eyebrow, title, body, open = false) {
  return `
    <details class="subpanel disclosure-panel"${open ? " open" : ""}>
      <summary class="disclosure-summary">
        <div>
          <p class="eyebrow">${eyebrow}</p>
          <h4>${title}</h4>
        </div>
      </summary>
      <div class="stack disclosure-body">${body}</div>
    </details>
  `;
}

function todayItems(dailyCommand) {
  return `
    <article class="entry">
      <div>
        <p class="entry-title">Meal planner</p>
        <p class="entry-meta">${
          dailyCommand.plannedMealsToday.length
            ? dailyCommand.plannedMealsToday.map(meal => `${meal.slot}: ${meal.name} (${formatPlanStatus(meal.status)})`).join(" - ")
            : "Sin comidas planificadas hoy"
        }</p>
      </div>
    </article>
    <article class="entry">
      <div>
        <p class="entry-title">Entreno previsto</p>
        <p class="entry-meta">${
          dailyCommand.plannedSessionsToday.length
            ? dailyCommand.plannedSessionsToday.map(session => `${session.type}: ${session.activity} (${formatPlanStatus(session.status)})`).join(" - ")
            : "Sin sesión planificada hoy"
        }</p>
      </div>
    </article>
    <article class="entry">
      <div>
        <p class="entry-title">Agenda de hoy</p>
        <p class="entry-meta">${
          dailyCommand.eventsToday.length
            ? dailyCommand.eventsToday.map(event => `${event.time ? `${event.time} - ` : ""}${event.title}`).join(" - ")
            : "Sin eventos registrados hoy"
        }</p>
      </div>
    </article>
  `;
}

function priorityItems(priorities) {
  return priorities
    .map(
      priority => `
        <article class="entry">
          <div>
            <p class="entry-title">${priority.title}</p>
            <p class="entry-meta">${priority.area} - prioridad ${priority.severity}/3</p>
            <p class="entry-note">${priority.detail}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function reviewFlowItems(flow) {
  return flow
    .map(
      step => `
        <article class="entry">
          <div>
            <p class="entry-title">${step.title}</p>
            <p class="entry-meta">${step.detail}</p>
            <p class="entry-note">${step.action}</p>
          </div>
          <div class="button-row">
            ${step.cta ? `<button class="ghost compact" data-action="${step.cta}">${reviewStepActionLabel(step)}</button>` : ""}
            <button class="${step.done ? "primary" : "ghost"} compact" data-action="toggle-weekly-review-step" data-step="${step.key}">${step.done ? "Hecho" : "Marcar"}</button>
          </div>
        </article>
      `
    )
    .join("");
}

function weeklySignalItems(signals) {
  if (signals.length === 0) {
    return `<p class="muted">Aún no hay señales claras. Cuando se acumulen más registros, esta capa empezará a detectar patrones útiles.</p>`;
  }

  return signals
    .map(
      signal => `
        <article class="entry">
          <div>
            <p class="entry-title">${signal.title}</p>
            <p class="entry-meta">${signal.detail}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function operationalTimelineItems(entries) {
  if (entries.length === 0) {
    return `<p class="muted">No hay próximas decisiones destacadas: el sistema está bastante descargado.</p>`;
  }

  return entries
    .map(
      entry => `
        <article class="timeline-item">
          <div class="timeline-badge">${entry.kind}</div>
          <div>
            <p class="entry-title">${entry.title}</p>
            <p class="entry-meta">${entry.date} - ${entry.time}</p>
            <p class="entry-note">${entry.detail}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function decisionListItems(items, emptyText) {
  if (items.length === 0) {
    return `<p class="muted">${emptyText}</p>`;
  }

  return items
    .map(item => `<article class="entry"><div><p class="entry-title">${item}</p></div></article>`)
    .join("");
}

function carryoverItems(items) {
  if (items.length === 0) {
    return `<p class="muted">No se ven arrastres recientes: la semana no parece acumular deuda inmediata.</p>`;
  }

  return items
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.title}</p>
            <p class="entry-meta">${item.date} - ${item.kind} - ${item.status}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function supportBlockActions(items) {
  if (items.length === 0) {
    return `<p class="muted">Hoy no hace falta crear bloques extra de soporte.</p>`;
  }

  return items
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.title}</p>
            <p class="entry-meta">${item.reason}</p>
          </div>
          <button class="ghost compact" data-action="create-support-block" data-kind="${item.kind}">${item.title}</button>
        </article>
      `
    )
    .join("");
}

function autoSummaryItems(summary) {
  return `
    <article class="entry">
      <div>
        <p class="entry-title">Resumen automático</p>
        <p class="entry-meta">${summary.headline}</p>
      </div>
    </article>
    <article class="entry">
      <div>
        <p class="entry-title">Lo que va bien</p>
        <p class="entry-meta">${summary.highlights.length ? summary.highlights.join(" - ") : "Todavía faltan registros para leer puntos fuertes claros."}</p>
      </div>
    </article>
    <article class="entry">
      <div>
        <p class="entry-title">Lo que vigilar</p>
        <p class="entry-meta">${summary.watchouts.length ? summary.watchouts.join(" - ") : "Sin alertas dominantes esta semana."}</p>
      </div>
    </article>
    <article class="entry">
      <div>
        <p class="entry-title">Lo que revisar</p>
        <p class="entry-meta">${summary.reviewItems.length ? summary.reviewItems.join(" - ") : "No hay una revision dominante abierta."}</p>
      </div>
    </article>
  `;
}

function prototypeQaItems() {
  const items = [
    "Crear o desbloquear el vault",
    "Cerrar una comida prevista como hecho o parcial",
    "Guardar una comida rápida y un entreno rápido",
    "Aplicar reset semanal o pack nutricional",
    "Exportar backup y volver a importarlo"
  ];

  return items
    .map(item => `<article class="entry"><div><p class="entry-title">${item}</p></div></article>`)
    .join("");
}

function starterChecklist() {
  const items = [
    {
      title: "Pon tu nombre visible y el autobloqueo que quieras",
      detail: "Lo haces desde Perfil dentro de Home para que ya se sienta tuya."
    },
    {
      title: "Registra hoy una comida, un sintoma y una noche",
      detail: "Con esos tres datos ya empieza a tener contexto real de uso diario."
    },
    {
      title: "Programa al menos dos comidas y una sesión en Semana",
      detail: "Es la forma más rápida de notar si el sistema ya te organiza de verdad."
    },
    {
      title: "Exporta un backup después de montar tu primera semana",
      detail: "Así validas seguridad y recuperación desde el principio."
    }
  ];

  return items
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.title}</p>
            <p class="entry-note">${item.detail}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function starterPanel() {
  return `
    <section class="subpanel stack panel-toned starter-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Primer uso</p>
          <h4>Empieza sin perderte</h4>
        </div>
        <p class="muted">Si empiezas desde cero, esta es la secuencia más útil.</p>
      </div>
      <div class="stack">${starterChecklist()}</div>
      <div class="button-row button-row-start">
        ${quickLink("Abrir Semana", "planning")}
        ${quickLink("Abrir Nutrición", "nutrition")}
        ${quickLink("Abrir Salud", "wellbeing")}
        ${quickLink("Abrir Revisión", "recovery")}
      </div>
    </section>
  `;
}

function quickStatusButtons(kind, id) {
  return `
    <div class="button-row button-row-start">
      <button class="ghost compact" data-action="set-planned-status" data-kind="${kind}" data-id="${id}" data-status="done">Hecho</button>
      <button class="ghost compact" data-action="set-planned-status" data-kind="${kind}" data-id="${id}" data-status="partial">Parcial</button>
      <button class="ghost compact" data-action="set-planned-status" data-kind="${kind}" data-id="${id}" data-status="skipped">Omitido</button>
    </div>
  `;
}

function todayExecutionItems(dailyCommand) {
  const mealEntries = dailyCommand.plannedMealsToday.map(
    meal => `
      <article class="entry">
        <div>
          <p class="entry-title">${meal.slot}: ${meal.name}</p>
          <p class="entry-meta">${formatPlanStatus(meal.status)}</p>
        </div>
        ${quickStatusButtons("meal", meal.id)}
      </article>
    `
  );

  const sessionEntries = dailyCommand.plannedSessionsToday.map(
    session => `
      <article class="entry">
        <div>
          <p class="entry-title">${session.type}: ${session.activity}</p>
          <p class="entry-meta">${session.duration || 0} min - ${formatPlanStatus(session.status)}</p>
        </div>
        ${quickStatusButtons("session", session.id)}
      </article>
    `
  );

  const entries = [...mealEntries, ...sessionEntries];
  if (entries.length === 0) {
    return `<p class="muted">Hoy no hay elementos planificados que cerrar desde la home.</p>`;
  }

  return entries.join("");
}

function quickMealCapture(today) {
  return `
    <form id="quick-meal-form" class="stack">
      <div class="field-grid">
        <label><span>Tipo</span><input name="type" value="Comida" required></label>
        <label><span>Nombre</span><input name="name" placeholder="Ej. Bowl, tortilla, yogur..." required></label>
      </div>
      <div class="field-grid four">
        <label><span>Kcal</span><input name="calories" type="number" step="1" min="0" value="0" required></label>
        <label><span>P</span><input name="protein" type="number" step="0.1" min="0" value="0"></label>
        <label><span>C</span><input name="carbs" type="number" step="0.1" min="0" value="0"></label>
        <label><span>G</span><input name="fat" type="number" step="0.1" min="0" value="0"></label>
      </div>
      <label><span>Postcomida</span><input name="reaction" placeholder="Ej. hinchazón, pesadez, energía baja"></label>
      <p class="entry-note">Se registra directamente en hoy (${today}).</p>
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
        <label><span>Actividad</span><input name="activity" placeholder="Ej. Upper, movilidad, caminar" required></label>
        <label><span>Duración</span><input name="duration" type="number" min="1" max="600" value="45" required></label>
      </div>
      <div class="field-grid four">
        <label><span>RPE</span><input name="rpe" type="number" min="1" max="10" value="6"></label>
        <label><span>Carga</span><input name="loadKg" type="number" min="0" value="0"></label>
        <label><span>Distancia</span><input name="distanceKm" type="number" step="0.1" min="0" value="0"></label>
        <label><span>Rutina</span><input name="routineName" placeholder="Opcional"></label>
      </div>
      <div class="field-grid">
        <label><span>Energía</span><input name="preEnergy" type="number" min="1" max="5" value="3"></label>
        <label><span>Recuperación</span><input name="recoveryScore" type="number" min="1" max="5" value="3"></label>
      </div>
      <div class="field-grid">
        <label><span>Molestias</span><input name="sorenessScore" type="number" min="1" max="5" value="1"></label>
        <label><span>Notas</span><input name="notes" placeholder="Contexto rápido"></label>
      </div>
      <button class="primary" type="submit">Guardar entreno rápido</button>
    </form>
  `;
}

function homeCaptureButtons(current) {
  const items = [
    { id: "meal", label: "Comida" },
    { id: "training", label: "Entreno" },
    { id: "checkin", label: "Síntoma" },
    { id: "sleep", label: "Sueño" }
  ];

  return items
    .map(
      item => `
        <button
          class="capture-chip${item.id === current ? " is-active" : ""}"
          type="button"
          data-action="set-home-capture"
          data-capture="${item.id}"
          aria-pressed="${item.id === current ? "true" : "false"}"
        >
          ${item.label}
        </button>
      `
    )
    .join("");
}

function quickSleepCapture(today) {
  return `
    <form id="quick-sleep-form" class="stack">
      <div class="field-grid">
        <label><span>Fecha</span><input name="date" type="date" value="${today}" required></label>
        <label><span>Horas</span><input name="hours" type="number" step="0.1" min="0" max="24" value="7.5" required></label>
      </div>
      <div class="field-grid">
        <label><span>Calidad (1-5)</span><input name="quality" type="number" min="1" max="5" value="3" required></label>
        <label><span>Nota</span><input name="notes" placeholder="Cafe, estres, despertares..."></label>
      </div>
      <button class="primary" type="submit">Guardar sueño</button>
    </form>
  `;
}

function quickEventCapture(today) {
  return `
    <form id="quick-event-form" class="stack">
      <div class="field-grid">
        <label><span>Título</span><input name="title" placeholder="Ej. Compra o cita" required></label>
        <label><span>Categoría</span><input name="category" placeholder="Personal, salud..."></label>
      </div>
      <div class="field-grid">
        <label><span>Fecha</span><input name="date" type="date" value="${today}" required></label>
        <label><span>Hora</span><input name="time" type="time"></label>
      </div>
      <label><span>Nota</span><input name="note" placeholder="Opcional"></label>
      <button class="primary" type="submit">Guardar evento</button>
    </form>
  `;
}

function quickNoteCapture() {
  return `
    <form id="quick-note-form" class="stack">
      <label><span>Clave</span><input name="key" placeholder="Ej. hoy, compras, idea" required></label>
      <label><span>Contenido</span><textarea name="value" rows="4" placeholder="Escribe una nota corta" required></textarea></label>
      <button class="primary" type="submit">Guardar nota</button>
    </form>
  `;
}

function renderHomeCapture(current, today) {
  const titleMap = {
    meal: "Comida rápida",
    training: "Entreno rápido",
    checkin: "Check-in corporal",
    sleep: "Sueño rápido",
    event: "Evento rápido",
    note: "Nota rápida"
  };

  const bodyMap = {
    meal: quickMealCapture(today),
    training: quickTrainingCapture(today),
    checkin: `
      <form id="quick-checkin-form" class="stack">
        <div class="field-grid">
          <label><span>Síntoma</span><input name="name" placeholder="Ej. Fatiga, dolor, hinchazón" required></label>
          <label><span>Intensidad (1-5)</span><input name="intensity" type="number" min="1" max="5" value="3" required></label>
        </div>
        <div class="field-grid">
          <label><span>Energía (1-5)</span><input name="energy" type="number" min="1" max="5" value="3"></label>
          <label><span>Animo (1-5)</span><input name="mood" type="number" min="1" max="5" value="3"></label>
        </div>
        <div class="field-grid">
          <label><span>Digestión</span><input name="digestion" placeholder="Ligera, pesada, hinchazón..."></label>
          <label><span>Nota</span><input name="note" placeholder="Contexto rápido"></label>
        </div>
        <button class="primary" type="submit">Guardar check-in</button>
      </form>
    `,
    sleep: quickSleepCapture(today),
    event: quickEventCapture(today),
    note: quickNoteCapture()
  };

  return `
    ${collapsiblePanel(
      "Captura",
      titleMap[current] || "Comida rápida",
      `
        <div class="capture-chip-row">
          ${homeCaptureButtons(current)}
        </div>
        <div class="capture-surface">
          ${bodyMap[current] || bodyMap.meal}
        </div>
      `,
      false
    )}
  `;
}

function metricsEmptyCard() {
  return `
    <section class="subpanel metrics-empty-card">
      <p>Aún acumulando datos. En unos días empezarás a ver tendencias e ideas aquí.</p>
    </section>
  `;
}

function quickActionsSection() {
  return `
    <section class="stack section-block home-section">
      <div class="section-head">
        <div>
          <p class="eyebrow">🔥 Captura rápida</p>
          <h4>Lo útil al instante</h4>
        </div>
      </div>
      <div class="quick-actions-grid">
        ${quickActionButton("💧 Agua", { "data-action": "add-water" }, "quick-action-water")}
        ${quickActionButton("🍽️ Comida", { "data-action": "set-home-capture", "data-capture": "meal" }, "quick-action-food")}
        ${quickActionButton("🏋️ Entreno", { "data-action": "set-home-capture", "data-capture": "training" }, "quick-action-train")}
        ${quickActionButton("🩺 Síntoma", { "data-action": "set-home-capture", "data-capture": "checkin" }, "quick-action-health")}
      </div>
    </section>
  `;
}

function modulesSection() {
  return `
    <section class="stack section-block home-section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Módulos</p>
          <h4>Entrar y ampliar</h4>
        </div>
      </div>
      <div class="modules-grid">
        ${moduleCard("Sueño", "🌙", "recovery", "module-tone-recovery")}
        ${moduleCard("Entreno", "🏋️", "training", "module-tone-training")}
        ${moduleCard("Nutrición", "🍎", "nutrition", "module-tone-nutrition")}
        ${moduleCard("Salud", "💊", "wellbeing", "module-tone-wellbeing")}
        ${moduleCard("Semana", "🗓️", "planning", "module-tone-planning")}
        ${moduleCard("Notas", "✍️", "home", "module-tone-home")}
      </div>
    </section>
  `;
}

function pageDock(items) {
  return `
    <nav class="page-dock" aria-label="Navegación de hoy">
      ${items.map(item => `<a class="page-anchor" href="#${item.id}">${item.label}</a>`).join("")}
    </nav>
  `;
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
  if (plannedCount > 0) return `${plannedCount} bloque(s) previstos. Readiness ${weeklyPreparation.readinessScore}/100.`;
  if (dailyCommand.loggedMealsToday.length > 0 || dailyCommand.executedSessionsToday.length > 0) return "Ya hay señales de hoy. Solo toca mantener el hilo.";
  return "Empieza con una comida, un check-in o una nota.";
}

export function renderDashboardFeature(state, options = {}) {
  const today = todayKey();
  const currentCapture = options.homeCapture || "meal";
  const dailyCommand = getDailyCommandCenter(state, today);
  const todayDecisionBoard = getTodayDecisionBoard(state, today);
  const weeklyPreparation = getWeeklyPreparationPack(state);
  const weeklyReviewFlow = getWeeklyReviewFlow(state);
  const weeklyReviewSummary = getWeeklyReviewSummary(state);
  const operationalTimeline = getOperationalTimeline(state, today);
  const autoSummary = getWeeklyAutoSummary(state, today);
  const displayName = state.profile.displayName || "";
  const autoLockMinutes = state.appMeta.autoLockMinutes || 5;
  const firstUse = isFirstUseState(state);
  const focusTitle = compactFocusTitle(dailyCommand);
  const focusDetail = compactFocusDetail(dailyCommand, weeklyPreparation);
  const hasEnoughMetrics =
    dailyCommand.loggedMealsToday.length > 0 ||
    dailyCommand.executedSessionsToday.length > 0 ||
    dailyCommand.mealProgress.total > 0 ||
    dailyCommand.sessionProgress.total > 0 ||
    dailyCommand.hydrationToday > 0;

  return `
    <section id="home-panel" class="panel stack">
      <div class="section-head">
        <div>
          <p class="eyebrow">${todayHeadline()}</p>
          <h3>Tu día</h3>
        </div>
      </div>

      ${pageDock([
        { id: "home-capture-panel", label: "Capturar" },
        { id: "home-actions", label: "Cerrar hoy" },
        { id: "home-guided", label: "Guiado" },
        { id: "home-personal", label: "Personal" }
      ])}

      <section class="stack section-block home-section">
        <div class="section-head">
          <div>
            <p class="eyebrow">Tus métricas</p>
          </div>
        </div>
        <article class="command-hero headline-card">
          <p class="eyebrow">Centro de mando de hoy</p>
          <h2>${focusTitle}</h2>
          <p class="muted">${focusDetail}</p>
          ${
            hasEnoughMetrics
              ? `
                <section class="hero-metrics">
                  ${summaryMetric("Comidas", dailyCommand.loggedMealsToday.length, "registradas hoy")}
                  ${summaryMetric("Comida", `${dailyCommand.mealProgress.done}/${dailyCommand.mealProgress.total}`, "previsto vs real")}
                  ${summaryMetric("Entreno", `${dailyCommand.sessionProgress.done}/${dailyCommand.sessionProgress.total}`, "previsto vs real")}
                  ${summaryMetric("Agua", `${dailyCommand.hydrationToday}/${dailyCommand.hydrationGoal}`, "vasos hoy")}
                </section>
              `
              : metricsEmptyCard()
          }
        </article>
      </section>

      ${quickActionsSection()}

      ${modulesSection()}

      <div id="home-capture-panel" class="section-block">
        ${renderHomeCapture(currentCapture, today)}
      </div>

      <div id="home-actions" class="section-block">
        ${collapsiblePanel(
          "Cerrar hoy",
          "Siguiente paso operativo",
          `
            <section class="dashboard-summary compact-metrics">
              ${compactSignalCard("Sueño", dailyCommand.sleepEntry ? `${Number(dailyCommand.sleepEntry.hours || 0).toFixed(1)} h` : "sin dato", "última noche")}
              ${compactSignalCard("Ciclo", dailyCommand.weeklyHealth.cycleContext.label, dailyCommand.weeklyHealth.dominantSymptoms[0]?.name || "sin patrón")}
              ${compactSignalCard("Revisión", `${weeklyReviewSummary.completion}%`, weeklyReviewSummary.nextStep?.title || "estable")}
              ${compactSignalCard("Readiness", `${weeklyPreparation.readinessScore}/100`, weeklyPreparation.headline)}
            </section>
            <div class="button-row button-row-start">
              <button class="primary compact" data-action="add-water">+1 vaso</button>
              <button class="ghost compact" data-action="toggle-period">Marcar período hoy</button>
              <button class="ghost compact" data-action="apply-suggested-meal-slots">Completar comidas</button>
              <button class="ghost compact" data-action="apply-suggested-sessions">Completar entrenos</button>
            </div>
            <article class="entry">
              <div>
                <p class="entry-title">Actualizar previsto vs real sin salir de home</p>
              </div>
            </article>
            <div class="stack">${todayExecutionItems(dailyCommand)}</div>
            <div class="timeline-list">${operationalTimelineItems(operationalTimeline)}</div>
          `,
          false
        )}
      </div>

      <div id="home-guided" class="section-block">
        ${collapsiblePanel(
          "Guiado",
          "Hacer, suavizar y capturar",
          `
            <div class="reading-grid">
              <section class="subpanel stack">
                <p class="eyebrow">Hacer</p>
                <div class="stack">${decisionListItems(todayDecisionBoard.doNow, "No hay un siguiente paso dominante; toca ejecutar con calma.")}</div>
              </section>
              <section class="subpanel stack">
                <p class="eyebrow">Suavizar</p>
                <div class="stack">${decisionListItems(todayDecisionBoard.lighten, "Hoy no hace falta suavizar mucho más el plan.")}</div>
              </section>
              <section class="subpanel stack">
                <p class="eyebrow">Capturar</p>
                <div class="stack">${decisionListItems(todayDecisionBoard.captureNow, "La captura mínima de hoy ya está bastante cubierta.")}</div>
              </section>
            </div>
            ${collapsiblePanel("Lectura semanal automática", "Resumen semanal", autoSummaryItems(autoSummary))}
            ${collapsiblePanel("Arrastres", "Lo que sigues cargando", carryoverItems(todayDecisionBoard.carryovers))}
            ${collapsiblePanel("Bloques de soporte", "Meter ayuda real en agenda", supportBlockActions(todayDecisionBoard.supportBlocks))}
            ${firstUse ? collapsiblePanel("Primer uso", "Ruta simple para arrancar", starterPanel(), false) : ""}
            ${collapsiblePanel(
              "Revisión semanal",
              "Secuencia guiada",
              `
                <div class="button-row">
                  <button class="primary compact" data-action="apply-weekly-reset-routine">Aplicar reset</button>
                  <button class="ghost compact" data-action="save-weekly-calibration-note">Guardar recalibración</button>
                </div>
                <div class="stack">${reviewFlowItems(weeklyReviewFlow)}</div>
              `
            )}
          `,
          false
        )}
      </div>

      <div id="home-personal" class="section-block">
        ${collapsiblePanel(
          "Personal",
          "Ajustes, notas e insights",
          `
            <form id="profile-form" class="stack">
              <div class="field-grid">
                <label><span>Nombre visible</span><input name="displayName" placeholder="Cómo quieres verte aquí" value="${displayName}"></label>
                <label><span>Autobloqueo (min)</span><input name="autoLockMinutes" type="number" min="1" max="120" value="${autoLockMinutes}" required></label>
              </div>
              <button class="primary" type="submit">Guardar ajustes</button>
            </form>
            <form id="note-form" class="stack">
              <label><span>Clave</span><input name="key" placeholder="Ej. hoy, ideas, compras" required></label>
              <label><span>Contenido</span><textarea name="value" rows="4" placeholder="Escribe una nota corta" required></textarea></label>
              <button class="primary" type="submit">Guardar nota</button>
            </form>
            ${collapsiblePanel("Insights", "Señales a revisar", weeklySignalItems(dailyCommand.weeklyHealth.signals))}
            ${collapsiblePanel("Checklist de prueba real", "Qué probar primero en esta V1", prototypeQaItems())}
            ${collapsiblePanel(
              "Notas guardadas",
              "Últimas claves",
              `
                <div class="stack">
                  ${
                    Object.keys(state.notes).length === 0
                      ? `<p class="muted">Aún no hay notas guardadas.</p>`
                      : Object.entries(state.notes)
                          .sort((left, right) => left[0].localeCompare(right[0]))
                          .slice(0, 8)
                          .map(
                            ([key, value]) => `
                              <article class="entry">
                                <div>
                                  <p class="entry-title">${key}</p>
                                  <p class="entry-note">${String(value)}</p>
                                </div>
                                <button class="ghost compact" data-action="delete-note" data-key="${key}">Eliminar</button>
                              </article>
                            `
                          )
                          .join("")
                  }
                </div>
              `
            )}
          `,
          false
        )}
      </div>
    </section>
  `;
}
