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
  return {
    plannedMeals: getPlannedMeals(state).filter(meal => keys.has(meal.date)).length,
    plannedSessions: getPlannedSessions(state).filter(session => keys.has(session.date)).length,
    events: state.calendar.events.filter(event => keys.has(event.date)).length,
    blocks: state.schedule.blocks.filter(block => days.includes(block.day)).length
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
    .slice(0, 4)
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.title}</p>
            <p class="entry-meta">${item.done ? "cerrado" : "pendiente"}</p>
          </div>
          <button class="${item.done ? "primary" : "ghost"} compact" data-action="toggle-weekly-task" data-id="${item.id}">${item.done ? "Hecho" : "Marcar"}</button>
        </article>
      `
    )
    .join("");
}

function weeklySuggestionPreview(items) {
  if (!items.length) return emptyState("No hay sugerencias pendientes ahora mismo.");
  return items
    .slice(0, 2)
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

function timelinePreview(items) {
  if (!items.length) return emptyState("Todavía no hay una secuencia operativa clara.");
  return items
    .slice(0, 3)
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.date} · ${item.title}</p>
            <p class="entry-meta">${item.kind}${item.time ? ` · ${item.time}` : ""}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function planningRibbon(prep, reviewSummary, timeline) {
  const pills = [
    `${prep.readinessScore}/100 ritmo`,
    `${reviewSummary.completion}% revisión`,
    `${timeline.length} bloque(s)`
  ];
  return `<div class="premium-pill-row">${pills.map(item => `<span class="premium-pill">${item}</span>`).join("")}</div>`;
}

function compactSuggestionLead(items) {
  const first = items[0];
  if (!first) return emptyState("No hay huecos urgentes ahora mismo.");
  return `
    <div class="mini-entry-list">
      <article class="mini-entry">
        <p class="entry-title">${first.title}</p>
        <p class="entry-meta">${first.reason ? formatSuggestionReason(first.reason, first.reason) : "Puedes cerrarlo ya."}</p>
      </article>
    </div>
  `;
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
        ${sectionCard(
          "Agenda",
          "Movimientos de semana",
          `
          ${planningRibbon(prep, reviewSummary, timeline)}
          <article class="summary-card summary-card-soft summary-card-premium">
            <p class="entry-title">${state.calendar.events.length} evento(s) · ${state.schedule.blocks.length} bloque(s)</p>
            <p class="entry-meta">${weeklySummaryData.plannedMeals} comida(s) y ${weeklySummaryData.plannedSessions} entreno(s) previstos.</p>
          </article>
          <details class="panel panel-toned disclosure-panel compact-disclosure">
            <summary class="disclosure-summary"><div><p class="eyebrow">Nuevo</p><h4>Evento</h4></div></summary>
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
          <details class="panel panel-toned disclosure-panel compact-disclosure">
            <summary class="disclosure-summary"><div><p class="eyebrow">Nuevo</p><h4>Bloque</h4></div></summary>
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
        "section-card-hero section-card-planning"
      )}
      <div class="planning-focus-grid">
        ${sectionCard("Eventos", "Lo guardado", `<div class="stack stack-tight">${eventItems(state.calendar.events)}</div>`, "section-card-glass section-card-planning-light")}
        ${sectionCard("Bloques", "Apoyos suaves", `<div class="stack stack-tight">${blockItems(state.schedule.blocks)}</div>`, "section-card-glass section-card-planning-light")}
      </div>
    `;
  } else if (currentView === "reset") {
    body = `
      <div class="planning-focus-grid">
        ${sectionCard(
          "Reset",
          "Semana en orden",
          `
            ${planningRibbon(prep, reviewSummary, timeline)}
            <article class="summary-card summary-card-soft summary-card-premium">
              <p class="eyebrow">Orden sugerido</p>
              <p class="entry-title">${reviewFlow[0]?.title || "Preparar la semana"}</p>
              <p class="entry-meta">${reviewFlow[0]?.detail || "Cerrar lo básico primero."}</p>
            </article>
            <div class="button-row button-row-start button-row-soft">
              <button class="primary compact" data-action="apply-weekly-reset-routine">Aplicar reset</button>
              <button class="ghost compact" data-action="apply-weekly-nutrition-pack">Preparar comidas</button>
              <button class="ghost compact" data-action="apply-weekly-calibration-pack">Ajustar ritmo</button>
            </div>
          `,
          "section-card-hero section-card-planning"
        )}
        ${sectionCard(
          "Checklist",
          "Lo que quieres cerrar",
          `
            <form id="weekly-form" class="stack">
              <div class="field-grid">
                <label><span>Tarea</span><input name="title" placeholder="Ej. compra base" required></label>
                <label><span>Día reset</span><input name="resetDay" value="Domingo" required></label>
              </div>
              <button class="primary" type="submit">Guardar checklist</button>
            </form>
            <div class="stack stack-tight">${checklistItems(state)}</div>
          `,
          "section-card-glass section-card-planning-light"
        )}
      </div>
      <details class="panel panel-toned disclosure-panel compact-disclosure">
        <summary class="disclosure-summary"><div><p class="eyebrow">Orden</p><h4>Secuencia completa</h4></div></summary>
        <div class="stack disclosure-body">
          ${reviewFlow
            .map(step => `<article class="entry"><div><p class="entry-title">${step.title}</p><p class="entry-note">${step.detail}</p></div></article>`)
            .join("")}
        </div>
      </details>
    `;
  } else {
    body = `
      <div class="planning-focus-grid">
        ${sectionCard(
          "Semana",
          "Centro semanal",
        `
          ${planningRibbon(prep, reviewSummary, timeline)}
            <article class="summary-card summary-card-soft summary-card-premium">
              <p class="entry-title">${autoSummary.headline}</p>
              <p class="entry-meta">${prep.headline}</p>
            </article>
            ${weekStrip(state)}
          `,
          "section-card-hero section-card-planning"
        )}
        ${sectionCard(
          "Siguiente",
          "Huecos que puedes cerrar",
          `
            ${compactSuggestionLead(weeklySuggestions)}
            <div class="button-row button-row-start button-row-soft">
              <button class="ghost compact" data-action="apply-suggested-meal-slots">Comidas</button>
              <button class="ghost compact" data-action="apply-suggested-sessions">Entrenos</button>
            </div>
          `,
          "section-card-glass section-card-planning-light"
        )}
      </div>
      <details class="panel panel-toned disclosure-panel compact-disclosure">
        <summary class="disclosure-summary"><div><p class="eyebrow">Flujo</p><h4>Próximos días</h4></div></summary>
        <div class="stack disclosure-body">${timelinePreview(timeline)}</div>
      </details>
    `;
  }

  return `
    <section id="planning-panel" class="panel stack app-feature-shell" data-view="${currentView}">
      ${featureHeader("Semana", "Planificar sin ruido", "", { emblem: "▫", emblemTone: "planning", artSrc: "./icons/scene-planning.svg" })}
      ${viewSwitcher("planning", currentView, [
        { id: "overview", label: "Resumen" },
        { id: "agenda", label: "Agenda" },
        { id: "reset", label: "Reset" }
      ])}
      ${body}
    </section>
  `;
}

