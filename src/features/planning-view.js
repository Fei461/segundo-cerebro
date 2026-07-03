import { getPlannedMeals, getPlannedSessions } from "../domain/plans.js";
import {
  currentWeekStartKey,
  getOperationalTimeline,
  getSuggestedWeeklyTasks,
  getWeeklyChecklist,
  getWeeklyPreparationPack,
  getWeeklyReviewFlow,
  getWeeklyReviewSummary
} from "../domain/weekly.js";
import { getWeeklyAutoSummary } from "../domain/insights.js";
import { addDaysToDateKey, localDateKey, weekStartKeyFromLocalDate } from "../domain/date.js";
import { formatSuggestionReason } from "../ui/formatters.js";
import { emptyState, featureHeader, sectionCard, viewSwitcher } from "../ui/feature-layout.js";

function todayKey() {
  return localDateKey(new Date());
}

function weekKeys() {
  const startKey = weekStartKeyFromLocalDate(new Date());
  return Array.from({ length: 7 }, (_, index) => addDaysToDateKey(startKey, index));
}

function statCard(label, value, detail) {
  return `
    <article class="summary-card summary-card-soft">
      <p class="eyebrow">${label}</p>
      <p class="metric">${value}</p>
      <p class="entry-meta">${detail}</p>
    </article>
  `;
}

function weeklySummary(state) {
  const days = weekKeys();
  const keys = new Set(days);
  const plannedMeals = getPlannedMeals(state).filter(meal => keys.has(meal.date));
  const plannedSessions = getPlannedSessions(state).filter(session => keys.has(session.date));
  const events = state.calendar.events.filter(event => keys.has(event.date));
  const blocks = state.schedule.blocks.filter(block => days.includes(block.day));
  return {
    plannedMeals: plannedMeals.length,
    plannedSessions: plannedSessions.length,
    events: events.length,
    blocks: blocks.length
  };
}

function eventItems(events) {
  if (!events.length) return emptyState("Aún no hay eventos guardados.");
  return events
    .slice()
    .sort((left, right) => `${left.date}-${left.time || "99:99"}`.localeCompare(`${right.date}-${right.time || "99:99"}`))
    .slice(0, 4)
    .map(
      event => `
        <article class="entry">
          <div>
            <p class="entry-title">${event.title}</p>
            <p class="entry-meta">${event.date}${event.time ? ` · ${event.time}` : ""}${event.category ? ` · ${event.category}` : ""}</p>
          </div>
          <button class="ghost compact" data-action="delete-event" data-id="${event.id}">Eliminar</button>
        </article>
      `
    )
    .join("");
}

function blockItems(blocks) {
  if (!blocks.length) return emptyState("Aún no hay bloques guardados.");
  return blocks
    .slice()
    .sort((left, right) => `${left.day}-${left.start}`.localeCompare(`${right.day}-${right.start}`))
    .slice(0, 4)
    .map(
      block => `
        <article class="entry">
          <div>
            <p class="entry-title">${block.title}</p>
            <p class="entry-meta">${block.day} · ${block.start} a ${block.end}</p>
          </div>
          <button class="ghost compact" data-action="delete-block" data-id="${block.id}">Eliminar</button>
        </article>
      `
    )
    .join("");
}

function checklistItems(state) {
  const items = getWeeklyChecklist(state, currentWeekStartKey());
  if (!items.length) return emptyState("Aún no hay checklist semanal guardada.");
  return items
    .slice(0, 5)
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.title}</p>
            <p class="entry-meta">${item.done ? "cerrado" : "pendiente"}</p>
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

function nextResetPreview(reviewFlow) {
  const next = reviewFlow[0];
  if (!next) return emptyState("Todavía no hay una secuencia clara.");
  return `<article class="entry"><div><p class="entry-title">${next.title}</p><p class="entry-note">${next.detail}</p></div></article>`;
}

function weeklySuggestionPreview(items) {
  if (!items.length) return emptyState("No hay sugerencias pendientes ahora mismo.");
  return items
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.title}</p>
            ${item.reason ? `<p class="entry-note">${formatSuggestionReason(item.reason, item.reason)}</p>` : ""}
          </div>
          <button class="ghost compact" data-action="add-weekly-suggestion" data-title="${item.title.replace(/"/g, "&quot;")}">Añadir</button>
        </article>
      `
    )
    .join("");
}

function reviewFlowPreview(reviewFlow) {
  if (!reviewFlow.length) return emptyState("Todavía no hay un orden de revisión claro.");
  return reviewFlow
    .slice(0, 3)
    .map(step => `<article class="entry"><div><p class="entry-title">${step.title}</p><p class="entry-note">${step.detail}</p></div></article>`)
    .join("");
}

function weekStrip(state) {
  const days = weekKeys();
  const meals = getPlannedMeals(state);
  const sessions = getPlannedSessions(state);
  const events = state.calendar.events || [];
  return `
    <div class="week-strip week-strip-scroll">
      ${days
        .map(date => {
          const dateObj = new Date(date);
          const label = ["D", "L", "M", "X", "J", "V", "S"][dateObj.getDay()];
          const mealCount = meals.filter(item => item.date === date).length;
          const sessionCount = sessions.filter(item => item.date === date).length;
          const eventCount = events.filter(item => item.date === date).length;
          return `
            <article class="week-strip-day week-strip-day-compact">
              <p class="eyebrow">${label}</p>
              <p class="metric metric-small">${date.slice(-2)}</p>
              <p class="entry-meta">${mealCount} c · ${sessionCount} e · ${eventCount} a</p>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function summaryPreview(items, emptyText) {
  if (!items.length) return emptyState(emptyText);
  return items.slice(0, 3).map(item => `<article class="entry"><div><p class="entry-title">${item}</p></div></article>`).join("");
}

function timelinePreview(items) {
  if (!items.length) return emptyState("Todavía no hay una secuencia operativa clara para los próximos días.");
  return items
    .slice(0, 6)
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.date} · ${item.title}</p>
            <p class="entry-meta">${item.kind}${item.time ? ` · ${item.time}` : ""}</p>
            ${item.detail ? `<p class="entry-note">${item.detail}</p>` : ""}
          </div>
        </article>
      `
    )
    .join("");
}

export function renderPlanningFeature(state, options = {}) {
  const currentView = options.currentView || "overview";
  const prep = getWeeklyPreparationPack(state);
  const reviewSummary = getWeeklyReviewSummary(state);
  const weeklySummaryData = weeklySummary(state);
  const weeklySuggestions = getSuggestedWeeklyTasks(state).slice(0, 3);
  const reviewFlow = getWeeklyReviewFlow(state).slice(0, 4);
  const autoSummary = getWeeklyAutoSummary(state);
  const timeline = getOperationalTimeline(state);

  let body = "";

  if (currentView === "agenda") {
    body = `
      <div class="planning-focus-grid">
        ${sectionCard(
          "Agenda",
          "Evento",
          `
            <details class="panel panel-toned disclosure-panel compact-disclosure">
              <summary class="disclosure-summary"><div><p class="eyebrow">Añadir</p><h4>Evento</h4></div></summary>
              <div class="stack disclosure-body">
                <form id="event-form" class="stack">
                  <div class="field-grid">
                    <label><span>Título</span><input name="title" placeholder="Ej. cita o compra" required></label>
                    <label><span>Categoría</span><input name="category" placeholder="Personal, salud..."></label>
                  </div>
                  <div class="field-grid">
                    <label><span>Fecha</span><input name="date" type="date" value="${todayKey()}" required></label>
                    <label><span>Hora</span><input name="time" type="time"></label>
                  </div>
                  <button class="primary" type="submit">Guardar evento</button>
                </form>
              </div>
            </details>
          `,
          "section-card-tinted section-card-planning"
        )}
        ${sectionCard(
          "Bloque",
          "Apoyo semanal",
          `
            <details class="panel panel-toned disclosure-panel compact-disclosure">
              <summary class="disclosure-summary"><div><p class="eyebrow">Añadir</p><h4>Bloque</h4></div></summary>
              <div class="stack disclosure-body">
                <form id="block-form" class="stack">
                  <div class="field-grid">
                    <label><span>Título</span><input name="title" placeholder="Ej. batch cooking" required></label>
                    <label><span>Día</span><input name="day" value="Domingo" required></label>
                  </div>
                  <div class="field-grid">
                    <label><span>Inicio</span><input name="start" type="time" value="10:00" required></label>
                    <label><span>Fin</span><input name="end" type="time" value="11:00" required></label>
                  </div>
                  <button class="primary" type="submit">Guardar bloque</button>
                </form>
              </div>
            </details>
          `,
          "section-card-glass section-card-planning-light"
        )}
      </div>
      <div class="planning-focus-grid">
        ${sectionCard("Eventos", "Lo guardado", `<div class="stack stack-tight">${eventItems(state.calendar.events)}</div>`, "section-card-glass section-card-planning-light")}
        ${sectionCard("Bloques", "Apoyos suaves", `<div class="stack stack-tight">${blockItems(state.schedule.blocks)}</div>`, "section-card-glass section-card-planning-light")}
      </div>
      ${sectionCard("Próximos días", "Línea operativa", `<div class="stack stack-tight">${timelinePreview(timeline)}</div>`, "section-card-glass section-card-planning-light")}
    `;
  } else if (currentView === "reset") {
    body = `
      ${sectionCard(
        "Reset semanal",
        "Poner la semana en orden",
        `
          <div class="button-row button-row-start button-row-soft">
            <button class="primary compact" data-action="apply-weekly-reset-routine">Aplicar reset</button>
            <button class="ghost compact" data-action="apply-weekly-nutrition-pack">Preparar comidas</button>
            <button class="ghost compact" data-action="apply-weekly-calibration-pack">Ajustar ritmo</button>
          </div>
          <div class="stack stack-tight">${reviewFlowPreview(reviewFlow)}</div>
        `,
        "section-card-hero section-card-planning"
      )}
      ${sectionCard(
        "Checklist",
        "Lo que quieres dejar cerrado",
        `
          <details class="panel panel-toned disclosure-panel compact-disclosure">
            <summary class="disclosure-summary"><div><p class="eyebrow">Añadir</p><h4>Tarea semanal</h4></div></summary>
            <div class="stack disclosure-body">
              <form id="weekly-form" class="stack">
                <div class="field-grid">
                  <label><span>Tarea</span><input name="title" placeholder="Ej. compra base" required></label>
                  <label><span>Día reset</span><input name="resetDay" value="Domingo" required></label>
                </div>
                <button class="primary" type="submit">Guardar checklist</button>
              </form>
            </div>
          </details>
          <div class="stack stack-tight">${checklistItems(state)}</div>
        `,
        "section-card-glass section-card-planning-light"
      )}
      ${sectionCard("Bajada real", "Lo que tocaría después", `<div class="stack stack-tight">${timelinePreview(timeline)}</div>`, "section-card-glass section-card-planning-light")}
    `;
  } else {
    body = `
      <div class="planning-focus-grid">
        ${sectionCard(
          "Semana",
          "Centro semanal",
          `
            <section class="dashboard-summary compact-metrics feature-metrics-soft">
              ${statCard("Ritmo", `${prep.readinessScore}/100`, "semana")}
              ${statCard("Comidas", weeklySummaryData.plannedMeals, "previstas")}
              ${statCard("Entrenos", weeklySummaryData.plannedSessions, "programados")}
              ${statCard("Revisión", `${reviewSummary.completion}%`, "avance")}
            </section>
            ${weekStrip(state)}
            <div class="button-row button-row-start button-row-soft">
              <button class="ghost compact" data-action="apply-suggested-meal-slots">Completar comidas</button>
              <button class="ghost compact" data-action="apply-suggested-sessions">Completar entrenos</button>
            </div>
          `,
          "section-card-hero section-card-planning"
        )}
        ${sectionCard(
          "Lectura real",
          "Cómo está de verdad",
          `
            <section class="dashboard-summary compact-metrics feature-metrics-soft">
              ${statCard("Eventos", weeklySummaryData.events, "guardados")}
              ${statCard("Bloques", weeklySummaryData.blocks, "de apoyo")}
              ${statCard("Checklist", getWeeklyChecklist(state, currentWeekStartKey()).length, "pasos")}
              ${statCard("Reset", reviewFlow.length, "gestos")}
            </section>
            <article class="entry"><div><p class="entry-title">${autoSummary.headline}</p></div></article>
            <div class="stack stack-tight">${summaryPreview(autoSummary.highlights, "Aún no hay highlights suficientes esta semana.")}</div>
          `,
          "section-card-glass section-card-planning-light"
        )}
      </div>
      ${sectionCard(
        "Siguiente",
        "Huecos que puedes cerrar",
        `
          <div class="planning-focus-grid planning-focus-grid-compact">
            <div class="stack stack-tight">${weeklySuggestionPreview(weeklySuggestions)}</div>
            <div class="stack stack-tight">
              ${nextResetPreview(reviewFlow)}
              <article class="entry">
                <div>
                  <p class="entry-title">${prep.nutritionReview?.nextAction || "Todavía no hay una lectura nutricional clara"}</p>
                  <p class="entry-note">${prep.watchouts?.[0] || "Cuando cierres más comidas, aquí aparecerá el siguiente ajuste útil."}</p>
                </div>
              </article>
            </div>
          </div>
        `,
        "section-card-glass section-card-planning-light"
      )}
      <details class="panel panel-toned compact-vault-bar disclosure-panel">
        <summary class="disclosure-summary">
          <div>
            <p class="eyebrow">Más semana</p>
            <h4>Próximos días, checklist y revisión</h4>
          </div>
        </summary>
        <div class="stack disclosure-body">
          ${sectionCard("Próximos días", "Cómo baja a agenda real", `<div class="stack stack-tight">${timelinePreview(timeline)}</div>`, "section-card-glass section-card-planning-light")}
          <div class="planning-focus-grid planning-focus-grid-compact">
            ${sectionCard("Checklist", "Lo que merece quedar hecho", `<div class="stack stack-tight">${summaryPreview(getWeeklyChecklist(state, currentWeekStartKey()).filter(item => !item.done).map(item => item.title), "Sin checklist pendiente ahora mismo.")}</div>`, "section-card-glass section-card-planning-light")}
            ${sectionCard("Revisión", "Qué mirar al final de semana", `<div class="stack stack-tight">${summaryPreview(autoSummary.reviewItems, "Aún faltan más datos para una revisión clara.")}</div>`, "section-card-glass section-card-planning-light")}
          </div>
        </div>
      </details>
    `;
  }

  return `
    <section id="planning-panel" class="panel stack app-feature-shell">
      ${featureHeader("Semana", "Planificar sin ruido", "", { emblem: "▫", emblemTone: "planning" })}
      ${viewSwitcher("planning", currentView, [
        { id: "overview", label: "Resumen" },
        { id: "agenda", label: "Agenda" },
        { id: "reset", label: "Reset" }
      ])}
      <div class="sr-only">
        Compra y meal prep ya convertibles en sistema
        Lo que la semana real te está pidiendo
      </div>
      ${body}
    </section>
  `;
}
