import { getWeeklyAutoSummary } from "../../domain/insights.js";
import {
  getDailyCommandCenter,
  getOperationalTimeline,
  getTodayDecisionBoard,
  getWeeklyPreparationPack,
  getWeeklyReviewFlow,
  getWeeklyReviewSummary
} from "../../domain/weekly.js";
import { getPlannedMeals, getPlannedSessions } from "../../domain/plans.js";
import { formatCycleContextLabel, formatPlanStatus } from "../../ui/formatters.js";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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
  return "Accion";
}

function quickLink(label, tab) {
  return `<button class="chip-link chip-button" type="button" data-action="open-tab" data-tab="${tab}">${label}</button>`;
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
            : "Sin sesion planificada hoy"
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
    return `<p class="muted">Aun no hay senales claras. Cuando se acumulen mas registros, esta capa empezara a detectar patrones utiles.</p>`;
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
    return `<p class="muted">No hay proximas decisiones destacadas: el sistema esta bastante descargado.</p>`;
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
        <p class="entry-title">Resumen automatico</p>
        <p class="entry-meta">${summary.headline}</p>
      </div>
    </article>
    <article class="entry">
      <div>
        <p class="entry-title">Lo que va bien</p>
        <p class="entry-meta">${summary.highlights.length ? summary.highlights.join(" - ") : "Todavia faltan registros para leer puntos fuertes claros."}</p>
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
    "Guardar una comida rapida y un entreno rapido",
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
      title: "Programa al menos dos comidas y una sesion en Semana",
      detail: "Es la forma mas rapida de notar si el sistema ya te organiza de verdad."
    },
    {
      title: "Exporta un backup despues de montar tu primera semana",
      detail: "Asi validas seguridad y recuperacion desde el principio."
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
    <section class="subpanel stack panel-toned">
      <div class="section-head">
        <div>
          <p class="eyebrow">Primer uso</p>
          <h4>Empieza sin perderte</h4>
        </div>
        <p class="muted">Si empiezas desde cero, esta es la secuencia mas util.</p>
      </div>
      <div class="stack">${starterChecklist()}</div>
      <div class="button-row button-row-start">
        ${quickLink("Abrir Semana", "planning")}
        ${quickLink("Abrir Nutricion", "nutrition")}
        ${quickLink("Abrir Salud", "wellbeing")}
        ${quickLink("Abrir Revision", "recovery")}
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
      <label><span>Postcomida</span><input name="reaction" placeholder="Ej. hinchazon, pesadez, energia baja"></label>
      <p class="entry-note">Se registra directamente en hoy (${today}).</p>
      <button class="primary" type="submit">Guardar comida rapida</button>
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
        <label><span>Duracion</span><input name="duration" type="number" min="1" max="600" value="45" required></label>
      </div>
      <div class="field-grid four">
        <label><span>RPE</span><input name="rpe" type="number" min="1" max="10" value="6"></label>
        <label><span>Carga</span><input name="loadKg" type="number" min="0" value="0"></label>
        <label><span>Distancia</span><input name="distanceKm" type="number" step="0.1" min="0" value="0"></label>
        <label><span>Rutina</span><input name="routineName" placeholder="Opcional"></label>
      </div>
      <div class="field-grid">
        <label><span>Energia</span><input name="preEnergy" type="number" min="1" max="5" value="3"></label>
        <label><span>Recuperacion</span><input name="recoveryScore" type="number" min="1" max="5" value="3"></label>
      </div>
      <div class="field-grid">
        <label><span>Molestias</span><input name="sorenessScore" type="number" min="1" max="5" value="1"></label>
        <label><span>Notas</span><input name="notes" placeholder="Contexto rapido"></label>
      </div>
      <button class="primary" type="submit">Guardar entreno rapido</button>
    </form>
  `;
}

export function renderDashboardFeature(state) {
  const today = todayKey();
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
  const weeklyReviewCount =
    state.nutrition.meals.filter(meal => meal.date >= new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)).length +
    state.training.sessions.filter(session => session.date >= new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)).length;
  const focusPills = [
    dailyCommand.focusAreas.length ? dailyCommand.focusAreas.join(" - ") : "ejecutar lo previsto",
    dailyCommand.blockers.length ? dailyCommand.blockers[0] : "sin bloqueo dominante",
    dailyCommand.reviewSummary.nextStep?.title || "sin siguiente paso tenso"
  ];

  return `
    <section id="home-panel" class="panel stack">
      <div class="section-head">
        <div>
          <p class="eyebrow">Centro de mando</p>
          <h3>Hoy sin ruido</h3>
        </div>
        <p class="muted">Lo importante primero, el resto solo cuando haga falta.</p>
      </div>

      <section class="command-center">
        <article class="command-hero headline-card">
          <p class="eyebrow">Centro de mando de hoy</p>
          <h2>${dailyCommand.focusHeadline}</h2>
          <p class="muted">${dailyCommand.topPriority ? dailyCommand.topPriority.detail : "No hay un frente dominante; toca ejecutar con normalidad y registrar bien."}</p>
          <div class="signal-row">
            ${focusPills.map(item => `<span class="signal-pill">${item}</span>`).join("")}
          </div>
          <div class="chip-row">
            ${quickLink("Registrar comida", "nutrition")}
            ${quickLink("Registrar entreno", "training")}
            ${quickLink("Registrar sintoma", "wellbeing")}
            ${quickLink("Crear evento", "planning")}
            ${quickLink("Ajustar semana", "planning")}
          </div>
        </article>
        <article class="command-side panel-toned">
          <div class="stack compact-stack">
            <div>
              <p class="eyebrow">Foco real</p>
              <p class="entry-title">${dailyCommand.focusAreas.length ? dailyCommand.focusAreas.join(" - ") : "ejecutar lo previsto"}</p>
              <p class="entry-note">${formatCycleContextLabel(dailyCommand.weeklyHealth.cycleContext)}</p>
            </div>
            <div>
              <p class="eyebrow">Friccion</p>
              <p class="entry-meta">${dailyCommand.blockers.length ? dailyCommand.blockers.join(" - ") : "sin bloqueos dominantes"}</p>
            </div>
            <div>
              <p class="eyebrow">Siguiente paso</p>
              <p class="entry-meta">${dailyCommand.reviewSummary.nextStep?.title || "Revision estable"}</p>
            </div>
          </div>
        </article>
      </section>

      ${firstUse ? starterPanel() : ""}

      <section class="dashboard-summary compact-metrics">
        ${summaryMetric("Comidas hoy", dailyCommand.loggedMealsToday.length, "registro diario")}
        ${summaryMetric("Agua hoy", `${dailyCommand.hydrationToday}/${dailyCommand.hydrationGoal}`, "hidratacion")}
        ${summaryMetric("Plan comida", `${dailyCommand.mealProgress.done}/${dailyCommand.mealProgress.total}`, "hecho vs previsto hoy")}
        ${summaryMetric("Plan entreno", `${dailyCommand.sessionProgress.done}/${dailyCommand.sessionProgress.total}`, "ejecutado vs previsto hoy")}
        ${summaryMetric("Sueno", dailyCommand.sleepEntry ? `${Number(dailyCommand.sleepEntry.hours || 0).toFixed(1)} h` : "sin dato", "ultima noche")}
        ${summaryMetric("Readiness", `${weeklyPreparation.readinessScore}/100`, weeklyPreparation.headline)}
        ${summaryMetric("Revision semanal", `${weeklyReviewSummary.completion}%`, weeklyReviewSummary.nextStep?.title || "todo revisado")}
        ${summaryMetric("Ciclo", dailyCommand.weeklyHealth.cycleContext.label, dailyCommand.weeklyHealth.dominantSymptoms[0]?.name || "sin patron dominante")}
      </section>

      <section class="home-rail-grid">
        <section class="subpanel stack rail-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">Acciones rapidas</p>
              <h4>Lo minimo para mover el dia</h4>
            </div>
          </div>
          <div class="button-row button-row-start">
            <button class="primary compact" data-action="add-water">+1 vaso</button>
            <button class="ghost compact" data-action="toggle-period">Marcar periodo hoy</button>
            <button class="ghost compact" data-action="apply-suggested-meal-slots">Completar comidas</button>
            <button class="ghost compact" data-action="apply-suggested-sessions">Completar entrenos</button>
            <button class="ghost compact" data-action="apply-weekly-calibration-pack">Aplicar recalibracion</button>
          </div>
        </section>

        <section class="subpanel stack rail-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">Cerrar previsto vs real</p>
              <h4>Lo que deberias marcar ya</h4>
              <p class="entry-note">Actualizar previsto vs real sin salir de home.</p>
            </div>
          </div>
          <div class="stack">${todayExecutionItems(dailyCommand)}</div>
        </section>

        <section class="subpanel stack rail-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">Cola operativa</p>
              <h4>Que viene despues</h4>
            </div>
          </div>
          <div class="timeline-list">${operationalTimelineItems(operationalTimeline)}</div>
        </section>
      </section>

      ${collapsiblePanel(
        "Captura rapida",
        "Registrar desde home sin llenar la pantalla",
        `
          <div class="home-form-grid">
            <section class="subpanel stack">
              <div class="section-head">
                <div>
                  <p class="eyebrow">Check-in</p>
                  <h4>Energia, animo y digestion</h4>
                </div>
              </div>
              <form id="quick-checkin-form" class="stack">
                <div class="field-grid">
                  <label><span>Sintoma</span><input name="name" placeholder="Ej. Fatiga, dolor, hinchazon" required></label>
                  <label><span>Intensidad (1-5)</span><input name="intensity" type="number" min="1" max="5" value="3" required></label>
                </div>
                <div class="field-grid">
                  <label><span>Energia (1-5)</span><input name="energy" type="number" min="1" max="5" value="3"></label>
                  <label><span>Animo (1-5)</span><input name="mood" type="number" min="1" max="5" value="3"></label>
                </div>
                <div class="field-grid">
                  <label><span>Digestion</span><input name="digestion" placeholder="Ligera, pesada, hinchazon..."></label>
                  <label><span>Nota</span><input name="note" placeholder="Contexto rapido"></label>
                </div>
                <button class="primary" type="submit">Guardar check-in</button>
              </form>
            </section>

            <section class="subpanel stack">
              <div class="section-head">
                <div>
                  <p class="eyebrow">Comida</p>
                  <h4>Guardar una comida</h4>
                </div>
              </div>
              ${quickMealCapture(today)}
            </section>

            <section class="subpanel stack">
              <div class="section-head">
                <div>
                  <p class="eyebrow">Entreno</p>
                  <h4>Guardar una sesion</h4>
                </div>
              </div>
              ${quickTrainingCapture(today)}
            </section>
          </div>
        `
      )}

      ${collapsiblePanel(
        "Lectura del dia",
        "Hacer, suavizar y capturar",
        `
          <div class="reading-grid">
            <section class="subpanel stack">
              <p class="eyebrow">Hacer</p>
              <div class="stack">${decisionListItems(todayDecisionBoard.doNow, "No hay un siguiente paso dominante; toca ejecutar con calma.")}</div>
            </section>
            <section class="subpanel stack">
              <p class="eyebrow">Suavizar</p>
              <div class="stack">${decisionListItems(todayDecisionBoard.lighten, "Hoy no hace falta suavizar mucho mas el plan.")}</div>
            </section>
            <section class="subpanel stack">
              <p class="eyebrow">Capturar</p>
              <div class="stack">${decisionListItems(todayDecisionBoard.captureNow, "La captura minima de hoy ya esta bastante cubierta.")}</div>
            </section>
          </div>
        `,
        false
      )}

      <section class="fold-grid">
        ${collapsiblePanel("Resumen", "Lectura semanal automatica", autoSummaryItems(autoSummary))}
        ${collapsiblePanel("Checklist de prueba real", "Que probar primero en esta V1", prototypeQaItems())}
        ${collapsiblePanel("Hoy", "Lectura operativa", todayItems(dailyCommand))}
        ${collapsiblePanel("Prioridades", "Donde merece la pena mirar primero", priorityItems(dailyCommand.priorities))}
        ${collapsiblePanel("Arrastres", "Lo que sigues cargando", carryoverItems(todayDecisionBoard.carryovers))}
        ${collapsiblePanel("Bloques de soporte", "Meter ayuda real en agenda", supportBlockActions(todayDecisionBoard.supportBlocks))}
      </section>

      ${collapsiblePanel(
        "Revision guiada",
        "Secuencia semanal",
        `
          <div class="button-row">
            <button class="primary compact" data-action="apply-weekly-reset-routine">Aplicar reset</button>
            <button class="ghost compact" data-action="apply-suggested-meal-slots">Completar comidas</button>
            <button class="ghost compact" data-action="apply-suggested-sessions">Completar entrenos</button>
            <button class="ghost compact" data-action="save-weekly-calibration-note">Guardar recalibracion</button>
          </div>
          <article class="entry">
            <div>
              <p class="entry-title">Siguiente paso operativo</p>
              <p class="entry-meta">${weeklyReviewSummary.nextStep?.title || "Revision semanal cerrada"}</p>
              <p class="entry-note">${weeklyReviewSummary.nextStep?.action || "Mantener seguimiento fino y registrar lo importante."}</p>
            </div>
          </article>
          <div class="stack">${reviewFlowItems(weeklyReviewFlow)}</div>
        `
      )}

      <section class="fold-grid">
        ${collapsiblePanel(
          "Perfil",
          "Ajustes rapidos",
          `
            <form id="profile-form" class="stack">
              <div class="field-grid">
                <label><span>Nombre visible</span><input name="displayName" placeholder="Como quieres verte aqui" value="${displayName}"></label>
                <label><span>Autobloqueo (min)</span><input name="autoLockMinutes" type="number" min="1" max="120" value="${autoLockMinutes}" required></label>
              </div>
              <button class="primary" type="submit">Guardar ajustes</button>
            </form>
          `
        )}
        ${collapsiblePanel(
          "Notas",
          "Nota rapida",
          `
            <form id="note-form" class="stack">
              <label><span>Clave</span><input name="key" placeholder="Ej. hoy, ideas, compras" required></label>
              <label><span>Contenido</span><textarea name="value" rows="4" placeholder="Escribe una nota corta" required></textarea></label>
              <button class="primary" type="submit">Guardar nota</button>
            </form>
          `
        )}
        ${collapsiblePanel("Insights semanales", "Senales a revisar", weeklySignalItems(dailyCommand.weeklyHealth.signals))}
        ${collapsiblePanel(
          "Notas guardadas",
          "Ultimas claves",
          `
            <div class="stack">
              ${
                Object.keys(state.notes).length === 0
                  ? `<p class="muted">Aun no hay notas guardadas.</p>`
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
      </section>
    </section>
  `;
}
