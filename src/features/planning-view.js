import { getPlannedMeals, getPlannedSessions } from "../domain/plans.js";
import {
  currentWeekStartKey,
  getSuggestedWeeklyTasks,
  getWeeklyChecklist,
  getWeeklyPreparationPack,
  getWeeklyReviewFlow,
  getWeeklyReviewSummary
} from "../domain/weekly.js";
import { emptyState, featureHeader, sectionCard, viewSwitcher } from "../ui/feature-layout.js";

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
    .slice(0, 6)
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
    .slice(0, 6)
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

export function renderPlanningFeature(state, options = {}) {
  const currentView = options.currentView || "overview";
  const prep = getWeeklyPreparationPack(state);
  const reviewSummary = getWeeklyReviewSummary(state);
  const weeklySummaryData = weeklySummary(state);
  const weeklySuggestions = getSuggestedWeeklyTasks(state).slice(0, 4);
  const reviewFlow = getWeeklyReviewFlow(state).slice(0, 4);

  let body = "";

  if (currentView === "agenda") {
    body = `
      ${sectionCard(
        "Agenda",
        "Eventos",
        `
          <form id="event-form" class="stack">
            <div class="field-grid">
              <label><span>Título</span><input name="title" placeholder="Ej. cita o compra" required></label>
              <label><span>Categoría</span><input name="category" placeholder="Personal, salud..."></label>
            </div>
            <div class="field-grid">
              <label><span>Fecha</span><input name="date" type="date" value="${todayKey()}" required></label>
              <label><span>Hora</span><input name="time" type="time"></label>
            </div>
            <label><span>Nota</span><input name="note" placeholder="Opcional"></label>
            <button class="primary" type="submit">Guardar evento</button>
          </form>
          <div class="stack">${eventItems(state.calendar.events)}</div>
        `,
        "section-card-tinted section-card-planning"
      )}
      ${sectionCard(
        "Bloques",
        "Apoyos suaves",
        `
          <form id="block-form" class="stack">
            <div class="field-grid">
              <label><span>Título</span><input name="title" placeholder="Ej. batch cooking" required></label>
              <label><span>Día</span><input name="day" value="Domingo" required></label>
            </div>
            <div class="field-grid">
              <label><span>Inicio</span><input name="start" type="time" value="10:00" required></label>
              <label><span>Fin</span><input name="end" type="time" value="11:00" required></label>
            </div>
            <label><span>Categoría</span><input name="category" placeholder="Reset, cocina, salud..."></label>
            <button class="primary" type="submit">Guardar bloque</button>
          </form>
          <div class="stack">${blockItems(state.schedule.blocks)}</div>
        `,
        "section-card-glass section-card-planning-light"
      )}
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
          <div class="stack">
            ${reviewFlow.map(step => `<article class="entry"><div><p class="entry-title">${step.title}</p><p class="entry-note">${step.detail}</p></div></article>`).join("")}
          </div>
        `,
        "section-card-hero section-card-planning"
      )}
      ${sectionCard(
        "Checklist",
        "Lo que quieres dejar cerrado",
        `
          <form id="weekly-form" class="stack">
            <div class="field-grid">
              <label><span>Tarea</span><input name="title" placeholder="Ej. compra base" required></label>
              <label><span>Día reset</span><input name="resetDay" value="Domingo" required></label>
            </div>
            <button class="primary" type="submit">Guardar checklist</button>
          </form>
          <div class="stack">${checklistItems(state)}</div>
        `,
        "section-card-glass section-card-planning-light"
      )}
    `;
  } else {
    body = `
      ${sectionCard(
        "Semana",
        "Centro semanal",
        `
          <section class="dashboard-summary compact-metrics feature-metrics-soft">
            ${statCard("Semana", `${prep.readinessScore}/100`, "ritmo")}
            ${statCard("Comidas", weeklySummaryData.plannedMeals, "previstas")}
            ${statCard("Entrenos", weeklySummaryData.plannedSessions, "programados")}
            ${statCard("Revisión", `${reviewSummary.completion}%`, "avance")}
          </section>
        `,
        "section-card-hero section-card-planning"
      )}
      ${sectionCard(
        "Siguiente",
        "Huecos que puedes cerrar",
        `
          <div class="stack">
            ${
              weeklySuggestions.length
                ? weeklySuggestions
                    .map(
                      item => `
                        <article class="entry">
                          <div>
                            <p class="entry-title">${item.title}</p>
                            ${item.reason ? `<p class="entry-note">${item.reason}</p>` : ""}
                          </div>
                          <button class="ghost compact" data-action="add-weekly-suggestion" data-title="${item.title.replace(/"/g, "&quot;")}">Añadir</button>
                        </article>
                      `
                    )
                    .join("")
                : emptyState("No hay sugerencias pendientes ahora mismo.")
            }
          </div>
        `,
        "section-card-glass section-card-planning-light"
      )}
    `;
  }

  return `
    <section id="planning-panel" class="panel stack app-feature-shell">
      ${featureHeader("Semana", "Planificar sin ruido", "", { emblem: "▦", emblemTone: "planning" })}
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
