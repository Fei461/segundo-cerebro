import { getPlannedMeals, getPlannedSessions } from "../domain/plans.js";
import { getWeeklyHealthInsights } from "../domain/insights.js";
import { getWeeklyNutritionReview } from "../domain/personal-nutrition.js";
import {
  getWeeklyCalibrationBoard,
  currentWeekStartKey,
  getOperationalTimeline,
  getTodayDecisionBoard,
  getSuggestedWeeklyTasks,
  getWeeklyChecklist,
  getWeeklyPreparationPack,
  getWeeklyReviewFlow,
  getWeeklyReviewSummary
} from "../domain/weekly.js";
import { formatCycleContextLabel, formatPlanStatus, formatSuggestionReason } from "../ui/formatters.js";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function weekKeys() {
  const keys = [];
  const start = new Date();
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    keys.push(date.toISOString().slice(0, 10));
  }

  return keys;
}

function upcomingEvents(events) {
  return events
    .slice()
    .sort((left, right) => {
      const leftKey = `${left.date} ${left.time || "99:99"}`;
      const rightKey = `${right.date} ${right.time || "99:99"}`;
      return leftKey.localeCompare(rightKey);
    })
    .slice(0, 8);
}

function eventItems(events) {
  const entries = upcomingEvents(events);
  if (entries.length === 0) {
    return `<p class="muted">Aún no hay eventos guardados.</p>`;
  }

  return entries
    .map(
      event => `
        <article class="entry">
          <div>
            <p class="entry-title">${event.title}</p>
            <p class="entry-meta">${event.date}${event.time ? ` - ${event.time}` : ""}${event.category ? ` - ${event.category}` : ""}</p>
            ${event.note ? `<p class="entry-note">${event.note}</p>` : ""}
          </div>
          <button class="ghost compact" data-action="delete-event" data-id="${event.id}">Eliminar</button>
        </article>
      `
    )
    .join("");
}

function blockItems(blocks) {
  if (blocks.length === 0) {
    return `<p class="muted">Aún no hay bloques de horario guardados.</p>`;
  }

  return blocks
    .slice()
    .sort((left, right) => `${left.day}-${left.start}`.localeCompare(`${right.day}-${right.start}`))
    .map(
      block => `
        <article class="entry">
          <div>
            <p class="entry-title">${block.title}</p>
            <p class="entry-meta">${block.day} - ${block.start} a ${block.end}${block.category ? ` - ${block.category}` : ""}</p>
          </div>
          <button class="ghost compact" data-action="delete-block" data-id="${block.id}">Eliminar</button>
        </article>
      `
    )
    .join("");
}

function eventsToday(events) {
  const today = todayKey();
  return events.filter(event => event.date === today).length;
}

function weeklySummary(state) {
  const keys = new Set(weekKeys());
  const plannedMeals = getPlannedMeals(state).filter(meal => keys.has(meal.date));
  const plannedSessions = getPlannedSessions(state).filter(session => keys.has(session.date));
  const loggedMeals = state.nutrition.meals.filter(meal => keys.has(meal.date));
  const executedSessions = state.training.sessions.filter(session => keys.has(session.date));
  const events = state.calendar.events.filter(event => keys.has(event.date));

  return {
    plannedMeals: plannedMeals.length,
    doneMeals: plannedMeals.filter(meal => meal.status === "done").length,
    plannedSessions: plannedSessions.length,
    doneSessions: plannedSessions.filter(session => session.status === "done").length,
    loggedMeals: loggedMeals.length,
    executedSessions: executedSessions.length,
    events: events.length
  };
}

function weeklyToleranceSummary(state) {
  const keys = new Set(weekKeys());
  const meals = state.nutrition.meals.filter(meal => keys.has(meal.date));
  const mealsWithReaction = meals.filter(meal => {
    const entries = Array.isArray(meal.reaction) ? meal.reaction : String(meal.reaction || "").split(",");
    return entries.map(item => String(item || "").trim()).filter(Boolean).length > 0;
  });

  return {
    meals: meals.length,
    mealsWithReaction: mealsWithReaction.length
  };
}

function weeklyBoard(state) {
  const plannedMeals = getPlannedMeals(state);
  const plannedSessions = getPlannedSessions(state);
  const events = state.calendar.events;

  return weekKeys()
    .map(date => {
      const meals = plannedMeals.filter(meal => meal.date === date);
      const sessions = plannedSessions.filter(session => session.date === date);
      const dayEvents = events.filter(event => event.date === date);

      return `
        <article class="planner-day">
          <div class="planner-day-head">
            <p class="entry-title">${date}</p>
            <p class="entry-meta">${dayEvents.length} evento(s)</p>
          </div>
          <div class="stack compact-stack">
            <div>
              <p class="eyebrow">Comidas</p>
              ${
                meals.length
                  ? meals.map(meal => `<p class="entry-meta">${meal.slot}: ${meal.name} (${formatPlanStatus(meal.status)})</p>`).join("")
                  : `<p class="muted">Sin planner</p>`
              }
            </div>
            <div>
              <p class="eyebrow">Entreno</p>
              ${
                sessions.length
                  ? sessions.map(session => `<p class="entry-meta">${session.type}: ${session.activity} (${formatPlanStatus(session.status)})</p>`).join("")
                  : `<p class="muted">Sin sesión</p>`
              }
            </div>
            <div>
              <p class="eyebrow">Agenda</p>
              ${
                dayEvents.length
                  ? dayEvents.slice(0, 3).map(event => `<p class="entry-meta">${event.time ? `${event.time} - ` : ""}${event.title}</p>`).join("")
                  : `<p class="muted">Sin eventos</p>`
              }
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function weeklyPrepItems(state) {
  const weeklyKeySet = new Set(weekKeys());
  const nutritionReview = getWeeklyNutritionReview({
    plannedMeals: getPlannedMeals(state).filter(meal => weeklyKeySet.has(meal.date)),
    loggedMeals: state.nutrition.meals.filter(meal => weeklyKeySet.has(meal.date)),
    recipes: state.recipes
  });

  if (nutritionReview.groupedShoppingList.length === 0 && nutritionReview.prepSuggestions.length === 0) {
    return `<p class="muted">Cuando haya planner semanal, aquí aparecerán ingredientes a revisar antes del reset semanal.</p>`;
  }

  const shoppingItems = nutritionReview.groupedShoppingList.slice(0, 3).map(
    group => `<article class="entry"><div><p class="entry-title">${group.family}</p><p class="entry-meta">${group.items.slice(0, 3).map(item => `${item.name} (${item.count})`).join(" - ")}</p></div></article>`
  );

  const prepItems = nutritionReview.prepSuggestions.slice(0, 2).map(
    suggestion => `<article class="entry"><div><p class="entry-title">${suggestion}</p></div></article>`
  );

  return [...shoppingItems, ...prepItems].join("");
}

function checklistItems(state) {
  const weekKey = currentWeekStartKey();
  const items = getWeeklyChecklist(state, weekKey);

  if (items.length === 0) {
    return `<p class="muted">Aún no hay checklist semanal guardada para esta semana.</p>`;
  }

  return items
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.title}</p>
            <p class="entry-meta">${item.done ? "hecho" : "pendiente"}</p>
          </div>
          <div class="button-row">
            <button class="${item.done ? "primary" : "ghost"} compact" data-action="toggle-weekly-task" data-id="${item.id}">${item.done ? "Hecho" : "Marcar"}</button>
            <button class="ghost compact" data-action="delete-weekly-task" data-id="${item.id}">Eliminar</button>
          </div>
        </article>
      `
    )
    .join("");
}

function suggestedChecklistItems(state) {
  const suggestions = getSuggestedWeeklyTasks(state);

  if (suggestions.length === 0) {
    return `<p class="muted">No hay sugerencias nuevas: el reset semanal ya esta bastante cubierto.</p>`;
  }

  const addAllButton = `<button class="primary compact" data-action="add-all-weekly-suggestions">Añadir todas</button>`;
  const items = suggestions
    .slice(0, 6)
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.title}</p>
            <p class="entry-meta">${item.kind}</p>
          </div>
          <button class="ghost compact" data-action="add-weekly-suggestion" data-title="${item.title.replace(/"/g, "&quot;")}">Añadir</button>
        </article>
      `
    )
    .join("");

  return `${addAllButton}${items}`;
}

function preparationPackItems(pack) {
  return pack.steps
    .map(
      step => `
        <article class="entry">
          <div>
            <p class="entry-title">${step.title}</p>
            <p class="entry-meta">${step.detail}</p>
          </div>
          <span class="status-chip">${step.state === "ready" ? "listo" : "pendiente"}</span>
        </article>
      `
    )
    .join("");
}

function preparationPackActions() {
  return `
    <div class="button-row">
      <button class="primary compact" data-action="apply-weekly-reset-routine">Aplicar reset sugerido</button>
      <button class="ghost compact" data-action="apply-weekly-nutrition-pack">Aplicar pack nutricional</button>
      <button class="ghost compact" data-action="save-weekly-nutrition-notes">Guardar notas</button>
      <button class="ghost compact" data-action="apply-suggested-meal-slots">Completar comidas</button>
      <button class="ghost compact" data-action="apply-suggested-sessions">Completar entrenos</button>
      <button class="ghost compact" data-action="create-weekly-reset-block">Crear bloque de reset</button>
    </div>
  `;
}

function reviewStepActionLabel(step) {
  if (step.cta === "apply-weekly-reset-routine") return "Aplicar";
  if (step.cta === "apply-suggested-meal-slots") return "Completar";
  if (step.cta === "apply-suggested-sessions") return "Programar";
  if (step.cta === "save-weekly-calibration-note") return "Guardar";
  return "Acción";
}

function gapFillItems(state, pack) {
  const sessionSuggestions = pack.suggestedSessions;
  const mealText = pack.suggestedMealSlots.length
    ? pack.suggestedMealSlots
        .slice(0, 4)
        .map(item => `${item.date} ${item.slot}: ${item.name} (${formatSuggestionReason(item.reason, item.source || "sugerencia")})`)
        .join(" - ")
    : "Sin huecos claros de comida.";
  const sessionText = sessionSuggestions.length
    ? sessionSuggestions.slice(0, 3).map(item => `${item.date}: ${item.type} ${item.activity} (${formatSuggestionReason(item.reason)})`).join(" - ")
    : "Sin huecos claros de entreno.";

  return `
    <article class="entry">
      <div>
        <p class="entry-title">Huecos de comida</p>
        <p class="entry-meta">${pack.suggestedMealSlots.length} sugerencias</p>
        <p class="entry-note">${mealText}</p>
      </div>
    </article>
    <article class="entry">
      <div>
        <p class="entry-title">Huecos de entreno</p>
        <p class="entry-meta">${sessionSuggestions.length} sugerencias</p>
        <p class="entry-note">${sessionText}</p>
      </div>
    </article>
  `;
}

function nutritionPrepItems(pack) {
  const board = pack.nutritionPrepBoard;
  if (!board || (board.batchItems.length === 0 && board.priorityMeals.length === 0)) {
    return `<p class="muted">Aún no hay suficiente planner para montar un pack nutricional semanal útil.</p>`;
  }

  const batchText = board.batchItems.length
    ? board.batchItems.slice(0, 3).map(item => `${item.title}: ${item.detail}`).join(" - ")
    : "Sin batch cooking dominante.";
  const priorityText = board.priorityMeals.length
    ? board.priorityMeals.slice(0, 3).map(item => `${item.date} ${item.slot}: ${item.name}`).join(" - ")
    : "Sin primeras comidas priorizadas.";

  return `
    <article class="entry">
      <div>
        <p class="entry-title">Batch cooking de la semana</p>
        <p class="entry-meta">${board.batchItems.length} bloques detectados</p>
        <p class="entry-note">${batchText}</p>
      </div>
    </article>
    <article class="entry">
      <div>
        <p class="entry-title">Primeras comidas a resolver</p>
        <p class="entry-meta">${board.priorityMeals.length} comidas priorizadas</p>
        <p class="entry-note">${priorityText}</p>
      </div>
    </article>
  `;
}

function calibrationItems(calibration) {
  const pressureText = calibration.dayEntries.length
    ? calibration.dayEntries
        .slice(0, 4)
        .map(day => `${day.date}: ${day.status} (${day.pressureScore.toFixed(1)})`)
        .join(" - ")
    : "Sin datos diarios suficientes.";

  return `
    <article class="entry">
      <div>
        <p class="entry-title">Adherencia semanal</p>
        <p class="entry-meta">Comida ${calibration.mealAdherence}% - Entreno ${calibration.sessionAdherence}%</p>
        <p class="entry-note">${calibration.nextAdjustment}</p>
        <p class="entry-note">${formatCycleContextLabel(calibration.cycleContext)}</p>
      </div>
    </article>
    <article class="entry">
      <div>
        <p class="entry-title">Mapa de presión diaria</p>
        <p class="entry-meta">${calibration.overloadedDays} días sobrecargados - ${calibration.watchDays} en vigilancia</p>
        <p class="entry-note">${pressureText}</p>
      </div>
    </article>
  `;
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

function operationalTimelineItems(entries) {
  if (entries.length === 0) {
    return `<p class="muted">No hay una cola operativa clara para los próximos días.</p>`;
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

function supportBlockItems(items) {
  if (items.length === 0) {
    return `<p class="muted">La semana no pide bloques extra de soporte ahora mismo.</p>`;
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

function pageDock(items) {
  return `
    <nav class="page-dock" aria-label="Navegación de semana">
      ${items
        .map(item => `<a class="page-anchor" href="#${item.id}">${item.label}</a>`)
        .join("")}
    </nav>
  `;
}

export function renderPlanningFeature(state) {
  const summary = weeklySummary(state);
  const tolerance = weeklyToleranceSummary(state);
  const resetDay = state.weekly?.resetDay || "Domingo";
  const weeklyHealth = getWeeklyHealthInsights(state);
  const weeklyKeySet = new Set(weekKeys());
  const nutritionReview = getWeeklyNutritionReview({
    plannedMeals: getPlannedMeals(state).filter(meal => weeklyKeySet.has(meal.date)),
    loggedMeals: state.nutrition.meals.filter(meal => weeklyKeySet.has(meal.date)),
    recipes: state.recipes
  });
  const preparationPack = getWeeklyPreparationPack(state);
  const reviewFlow = getWeeklyReviewFlow(state);
  const reviewSummary = getWeeklyReviewSummary(state);
  const calibration = getWeeklyCalibrationBoard(state);
  const operationalTimeline = getOperationalTimeline(state);
  const todayDecisionBoard = getTodayDecisionBoard(state);

  return `
    <section id="planning-panel" class="panel stack">
      <div class="section-head">
        <div>
          <p class="eyebrow">🗓️ Semana</p>
          <h3>Planificar la semana</h3>
        </div>
        <p class="muted">Plan, huecos y reset.</p>
      </div>

      ${pageDock([
        { id: "planning-summary", label: "Resumen" },
        { id: "planning-week", label: "Centro" },
        { id: "planning-workflows", label: "Flujo" },
        { id: "planning-management", label: "Gestión" }
      ])}

      <div id="planning-week" class="planning-focus-grid section-block">
        <section id="planning-summary" class="subpanel stack rail-card planning-hero-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">Semana real</p>
              <h4>Centro operativo</h4>
              <p class="entry-note">Plan, agenda y ejecución.</p>
            </div>
          </div>
          <section class="planning-summary compact-metrics">
            <article class="summary-card">
              <p class="eyebrow">Readiness</p>
              <p class="metric">${preparationPack.readinessScore}</p>
              <p class="entry-meta">${preparationPack.headline}</p>
            </article>
            <article class="summary-card">
              <p class="eyebrow">Hoy</p>
              <p class="metric">${eventsToday(state.calendar.events)}</p>
              <p class="entry-meta">eventos en agenda</p>
            </article>
            <article class="summary-card">
              <p class="eyebrow">Comida</p>
              <p class="metric">${summary.plannedMeals}</p>
              <p class="entry-meta">${summary.doneMeals} hechas</p>
            </article>
            <article class="summary-card">
              <p class="eyebrow">Entreno</p>
              <p class="metric">${summary.plannedSessions}</p>
              <p class="entry-meta">${summary.doneSessions} hechos</p>
            </article>
            <article class="summary-card">
              <p class="eyebrow">Tolerancia</p>
              <p class="metric">${tolerance.mealsWithReaction}/${tolerance.meals}</p>
              <p class="entry-meta">postcomidas registradas</p>
            </article>
          </section>
          <div class="button-row button-row-start">
            <button class="primary compact" data-action="apply-weekly-reset-routine">Aplicar reset</button>
            <button class="ghost compact" data-action="apply-weekly-nutrition-pack">Pack nutricional</button>
            <button class="ghost compact" data-action="apply-weekly-calibration-pack">Recalibrar</button>
          </div>
        </section>

        <section class="subpanel stack rail-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">Cola semanal</p>
              <h4>Lo siguiente a resolver</h4>
            </div>
          </div>
          <div class="timeline-list">${operationalTimelineItems(operationalTimeline)}</div>
        </section>
      </div>

      <div id="planning-workflows" class="section-block">
        ${collapsiblePanel(
          "Reset semanal",
          "Secuencia de preparación",
          `
            <section class="planning-summary compact-metrics">
              <article class="summary-card">
                <p class="eyebrow">Checklist</p>
                <p class="metric">${preparationPack.checklist.done}/${preparationPack.checklist.total}</p>
                <p class="entry-meta">estado actual</p>
              </article>
              <article class="summary-card">
                <p class="eyebrow">Sugerencias</p>
                <p class="metric">${preparationPack.suggestions.length}</p>
                <p class="entry-meta">acciones detectadas</p>
              </article>
              <article class="summary-card">
                <p class="eyebrow">Variedad</p>
                <p class="metric">${preparationPack.nutritionReview.variety.covered}/${preparationPack.nutritionReview.variety.total}</p>
                <p class="entry-meta">familias cubiertas</p>
              </article>
            </section>
            ${preparationPackActions()}
            <div class="stack">${preparationPackItems(preparationPack)}</div>
          `,
          false
        )}

        <section class="fold-grid">
        ${collapsiblePanel(
          "Tablero semanal",
          "Ver los 7 días",
          `<div class="planner-grid">${weeklyBoard(state)}</div>`
        )}

        ${collapsiblePanel(
          "Planner asistido",
          "Huecos que se pueden cerrar ya",
          `<div class="stack">${gapFillItems(state, preparationPack)}</div>`
        )}

        ${collapsiblePanel(
          "Pack nutricional",
          "Compra y meal prep ya convertibles en sistema",
          `<div class="stack">${nutritionPrepItems(preparationPack)}</div>`
        )}

        ${collapsiblePanel(
          "Recalibración",
          "Lo que la semana real te está pidiendo",
          `
            <div class="button-row">
              <button class="ghost compact" data-action="apply-weekly-calibration-pack">Aplicar recalibración</button>
              <button class="ghost compact" data-action="save-weekly-calibration-note">Guardar nota</button>
            </div>
            <div class="stack">${calibrationItems(calibration)}</div>
          `
        )}

        ${collapsiblePanel("Soporte", "Bloques rápidos para que la semana salga", `<div class="stack">${supportBlockItems(todayDecisionBoard.supportBlocks)}</div>`)}

        ${collapsiblePanel(
          "Revisión semanal",
          "Orden recomendado",
          `
            <section class="planning-summary compact-metrics">
              <article class="summary-card">
                <p class="eyebrow">Progreso</p>
                <p class="metric">${reviewSummary.done}/${reviewSummary.total}</p>
                <p class="entry-meta">${reviewSummary.completion}% completado</p>
              </article>
              <article class="summary-card">
                <p class="eyebrow">Pendientes</p>
                <p class="metric">${reviewSummary.pending}</p>
                <p class="entry-meta">${reviewSummary.attention} con tensión real</p>
              </article>
              <article class="summary-card">
                <p class="eyebrow">Siguiente</p>
                <p class="metric">${reviewSummary.nextStep?.title || "Cerrado"}</p>
                <p class="entry-meta">${reviewSummary.nextStep?.status === "attention" ? "requiere decisión" : reviewSummary.nextStep?.status || "sin pasos abiertos"}</p>
              </article>
            </section>
            <div class="stack">${reviewFlowItems(reviewFlow)}</div>
          `
        )}
        </section>
      </div>

      <div id="planning-management" class="section-block">
        ${collapsiblePanel(
          "Gestión semanal",
          "Checklist, desajustes y agenda",
          `
            <div class="fold-grid">
            ${collapsiblePanel(
              "Reset semanal",
              "Checklist de preparación",
              `
                <div class="stack">${weeklyPrepItems(state)}</div>
                <form id="weekly-form" class="stack">
                  <div class="field-grid">
                    <label><span>Tarea</span><input name="title" placeholder="Ej. dejar 2 cenas preparadas" required></label>
                    <label><span>Día de reset</span><select name="resetDay"><option ${resetDay === "Domingo" ? "selected" : ""}>Domingo</option><option ${resetDay === "Lunes" ? "selected" : ""}>Lunes</option><option ${resetDay === "Sábado" ? "selected" : ""}>Sábado</option></select></label>
                  </div>
                  <button class="primary" type="submit">Guardar tarea semanal</button>
                </form>
                <div class="stack">${checklistItems(state)}</div>
              `
            )}

            ${collapsiblePanel(
              "Reset sugerido",
              "Tareas automáticas",
              `<div class="stack">${suggestedChecklistItems(state)}</div>`
            )}

            ${collapsiblePanel(
              "Lectura rápida",
              "Desajustes visibles",
              `
                <div class="stack">
                  <article class="entry">
                    <div>
                      <p class="entry-title">Comidas planificadas vs registradas</p>
                      <p class="entry-meta">${summary.plannedMeals} previstas - ${summary.loggedMeals} registradas</p>
                    </div>
                  </article>
                  <article class="entry">
                    <div>
                      <p class="entry-title">Entrenos previstos vs ejecutados</p>
                      <p class="entry-meta">${summary.plannedSessions} previstos - ${summary.executedSessions} registrados</p>
                    </div>
                  </article>
                  <article class="entry">
                    <div>
                      <p class="entry-title">Siguiente paso útil</p>
                      <p class="entry-meta">Cerrar adherencia semanal y luego conectar energía, síntomas y descanso.</p>
                    </div>
                  </article>
                  <article class="entry">
                    <div>
                      <p class="entry-title">Siguiente acción en nutrición</p>
                      <p class="entry-meta">${nutritionReview.nextAction}</p>
                    </div>
                  </article>
                  <article class="entry">
                    <div>
                      <p class="entry-title">Lectura salud</p>
                      <p class="entry-meta">${weeklyHealth.signals.length ? weeklyHealth.signals.map(signal => signal.title).join(" - ") : "Sin señales destacadas esta semana"}</p>
                    </div>
                  </article>
                </div>
              `
            )}

            ${collapsiblePanel(
              "Agenda",
              "Calendario y bloques",
              `
                <div class="planning-grid">
                  <section class="subpanel stack">
                    <div class="section-head">
                      <div>
                        <p class="eyebrow">Calendario</p>
                        <h4>Nuevo evento</h4>
                      </div>
                    </div>
                    <form id="event-form" class="stack">
                      <div class="field-grid">
                        <label><span>Titulo</span><input name="title" placeholder="Ej. Cita gine" required></label>
                        <label><span>Categoria</span><input name="category" placeholder="Salud, trabajo, personal..."></label>
                      </div>
                      <div class="field-grid">
                        <label><span>Fecha</span><input name="date" type="date" value="${todayKey()}" required></label>
                        <label><span>Hora</span><input name="time" type="time"></label>
                      </div>
                      <label><span>Nota</span><textarea name="note" rows="3" placeholder="Detalles o recordatorios"></textarea></label>
                      <button class="primary" type="submit">Guardar evento</button>
                    </form>
                    <div class="stack">${eventItems(state.calendar.events)}</div>
                  </section>

                  <section class="subpanel stack">
                    <div class="section-head">
                      <div>
                        <p class="eyebrow">Horario</p>
                        <h4>Nuevo bloque</h4>
                      </div>
                    </div>
                    <form id="block-form" class="stack">
                      <div class="field-grid">
                        <label><span>Titulo</span><input name="title" placeholder="Ej. Deep work o meal prep" required></label>
                        <label><span>Dia</span><input name="day" placeholder="Ej. Lunes" required></label>
                      </div>
                      <div class="field-grid">
                        <label><span>Inicio</span><input name="start" type="time" required></label>
                        <label><span>Fin</span><input name="end" type="time" required></label>
                      </div>
                      <label><span>Categoria</span><input name="category" placeholder="Trabajo, salud, descanso..."></label>
                      <button class="primary" type="submit">Guardar bloque</button>
                    </form>
                    <div class="stack">${blockItems(state.schedule.blocks)}</div>
                  </section>
                </div>
              `
            )}
            </div>
          `
        )}
      </div>
    </section>
  `;
}
