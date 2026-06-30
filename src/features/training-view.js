import { getWeeklyHealthInsights } from "../domain/insights.js";
import { getPlannedSessions } from "../domain/plans.js";
import { formatCycleContextLabel } from "../ui/formatters.js";

const TRAINING_TYPES = ["Fuerza", "Cardio", "Movilidad", "Recuperacion"];
const EXERCISE_LIBRARY = [
  "Hip thrust",
  "Sentadilla",
  "Peso muerto rumano",
  "Prensa",
  "Remo",
  "Jalon al pecho",
  "Press banca",
  "Press militar",
  "Core",
  "Running",
  "Bici",
  "Pilates",
  "Movilidad cadera"
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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

function weeklyTotals(sessions) {
  const keys = new Set();
  const base = new Date();
  for (let index = 0; index < 7; index += 1) {
    const day = new Date(base);
    day.setDate(base.getDate() - index);
    keys.add(day.toISOString().slice(0, 10));
  }

  return sessions
    .filter(session => keys.has(session.date))
    .reduce(
      (totals, session) => ({
        count: totals.count + 1,
        minutes: totals.minutes + Number(session.duration || 0),
        load: totals.load + Number(session.loadKg || 0),
        distance: totals.distance + Number(session.distanceKm || 0)
      }),
      { count: 0, minutes: 0, load: 0, distance: 0 }
    );
}

function upcomingSessions(state) {
  const today = todayKey();
  return getPlannedSessions(state)
    .filter(session => session.date >= today)
    .sort((left, right) => `${left.date}-${left.type}`.localeCompare(`${right.date}-${right.type}`));
}

function recentSessionItems(items) {
  const sessions = items
    .slice()
    .sort((left, right) => `${right.date}-${right.type}`.localeCompare(`${left.date}-${left.type}`))
    .slice(0, 5);

  if (sessions.length === 0) {
    return `<p class="muted">Aún no hay sesiones registradas.</p>`;
  }

  return sessions
    .map(
      session => `
        <article class="entry">
          <div>
            <p class="entry-title">${session.date} · ${session.type}</p>
            <p class="entry-meta">${session.activity} · ${session.duration} min${session.rpe ? ` · RPE ${session.rpe}` : ""}</p>
          </div>
          <button class="ghost compact" data-action="delete-training" data-id="${session.id}">Eliminar</button>
        </article>
      `
    )
    .join("");
}

function plannedSessionItems(state) {
  const items = upcomingSessions(state);
  if (items.length === 0) {
    return `<p class="muted">Aún no hay sesiones programadas.</p>`;
  }

  return items
    .slice(0, 6)
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.date} · ${item.type}</p>
            <p class="entry-meta">${item.activity} · ${item.duration} min · ${item.status || "planned"}</p>
          </div>
          <div class="button-row">
            <button class="ghost compact" data-action="cycle-planned-session-status" data-id="${item.id}" data-status="done">Hecho</button>
            <button class="ghost compact" data-action="cycle-planned-session-status" data-id="${item.id}" data-status="skipped">Omitir</button>
          </div>
        </article>
      `
    )
    .join("");
}

function routineItems(items) {
  if (items.length === 0) {
    return `<p class="muted">Aún no hay rutinas guardadas.</p>`;
  }

  return items
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.name}</p>
            <p class="entry-meta">${item.focus}</p>
          </div>
          <button class="ghost compact" data-action="delete-routine" data-id="${item.id}">Eliminar</button>
        </article>
      `
    )
    .join("");
}

function libraryItems() {
  return [
    { title: "Fuerza", items: EXERCISE_LIBRARY.slice(0, 8) },
    { title: "Cardio", items: EXERCISE_LIBRARY.slice(8, 11) },
    { title: "Movilidad", items: EXERCISE_LIBRARY.slice(11) }
  ]
    .map(
      group => `
        <article class="summary-card">
          <p class="eyebrow">${group.title}</p>
          <p class="entry-meta">${group.items.join(" · ")}</p>
        </article>
      `
    )
    .join("");
}

function crossSignals(state) {
  const health = getWeeklyHealthInsights(state);
  const items = [
    `Ciclo: ${formatCycleContextLabel(health.cycleContext)}`,
    `Señales activas: ${health.signals.length}`,
    `Recuperación baja: ${health.signals.filter(signal => signal.kind === "recovery").length}`,
    `Energía media: ${health.avgEnergy ? health.avgEnergy.toFixed(1) : "-"} / 5`
  ];

  return items.map(item => `<article class="entry"><div><p class="entry-title">${item}</p></div></article>`).join("");
}

export function renderTrainingFeature(state) {
  const totals = weeklyTotals(state.training.sessions);
  const typeOptions = TRAINING_TYPES.map(type => `<option value="${type}">${type}</option>`).join("");
  const exerciseOptions = EXERCISE_LIBRARY.map(exercise => `<option value="${exercise}"></option>`).join("");

  return `
    <section id="training-panel" class="panel stack">
      <div class="section-head">
        <div>
          <p class="eyebrow">Entreno</p>
          <h3>Entrenar sin ruido</h3>
        </div>
        <p class="muted">Registrar, programar y leer carga.</p>
      </div>

      <div class="training-focus-grid section-block">
        <section class="subpanel stack rail-card training-hero-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">Resumen</p>
              <h4>Carga semanal visible</h4>
            </div>
          </div>
          <section class="training-summary compact-metrics">
            <article class="summary-card">
              <p class="eyebrow">7 dias</p>
              <p class="metric">${totals.count}</p>
              <p class="entry-meta">${totals.minutes} min</p>
            </article>
            <article class="summary-card">
              <p class="eyebrow">Carga</p>
              <p class="metric">${totals.load}</p>
              <p class="entry-meta">kg movidos</p>
            </article>
            <article class="summary-card">
              <p class="eyebrow">Cardio</p>
              <p class="metric">${Number(totals.distance || 0).toFixed(1)}</p>
              <p class="entry-meta">km</p>
            </article>
            <article class="summary-card">
              <p class="eyebrow">Programadas</p>
              <p class="metric">${upcomingSessions(state).length}</p>
              <p class="entry-meta">sesiones futuras</p>
            </article>
          </section>
          ${collapsiblePanel("Lectura cruzada", "Entreno, recuperacion y ciclo", `<div class="stack">${crossSignals(state)}</div>`)}
          ${collapsiblePanel("Reciente", "Ultimas sesiones", `<div class="stack">${recentSessionItems(state.training.sessions)}</div>`)}
        </section>

        <section class="subpanel stack rail-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">Registrar</p>
              <h4>Acciones rápidas</h4>
            </div>
          </div>
          <datalist id="exercise-library">${exerciseOptions}</datalist>
          ${collapsiblePanel(
            "Nueva sesión",
            "Guardar sesión",
            `
              <form id="training-form" class="stack">
                <div class="field-grid">
                  <label><span>Fecha</span><input name="date" type="date" value="${todayKey()}" required></label>
                  <label><span>Tipo</span><select name="type" required>${typeOptions}</select></label>
                </div>
                <div class="field-grid">
                  <label><span>Actividad</span><input name="activity" list="exercise-library" placeholder="Ej. running o sentadilla" required></label>
                  <label><span>Duración (min)</span><input name="duration" type="number" step="1" min="0" value="60" required></label>
                </div>
                <div class="field-grid four">
                  <label><span>RPE</span><input name="rpe" type="number" step="1" min="1" max="10" value="7"></label>
                  <label><span>Carga kg</span><input name="loadKg" type="number" step="1" min="0" value="0"></label>
                  <label><span>Distancia km</span><input name="distanceKm" type="number" step="0.1" min="0" value="0"></label>
                  <label><span>Rutina</span><input name="routineName" placeholder="Opcional"></label>
                </div>
                <button class="primary" type="submit">Guardar sesión</button>
              </form>
            `
          )}
          ${collapsiblePanel(
            "Programar",
            "Crear sesión futura",
            `
              <form id="planned-session-form" class="stack">
                <div class="field-grid">
                  <label><span>Fecha</span><input name="date" type="date" value="${todayKey()}" required></label>
                  <label><span>Tipo</span><select name="type" required>${typeOptions}</select></label>
                </div>
                <div class="field-grid">
                  <label><span>Actividad</span><input name="activity" list="exercise-library" placeholder="Ej. upper o movilidad" required></label>
                  <label><span>Duración (min)</span><input name="duration" type="number" step="1" min="1" value="60" required></label>
                </div>
                <div class="field-grid">
                  <label><span>Rutina base</span><input name="routineName" placeholder="Opcional"></label>
                  <label><span>Estado</span><select name="status"><option value="planned">Previsto</option><option value="partial">Parcial</option><option value="done">Hecho</option><option value="skipped">Omitido</option></select></label>
                </div>
                <label><span>Notas</span><input name="notes" placeholder="Objetivo o ajuste"></label>
                <button class="primary" type="submit">Programar sesión</button>
              </form>
            `
          )}
        </section>
      </div>

      <section class="fold-grid section-block">
        ${collapsiblePanel("Programadas", "Sesiones futuras", `<div class="stack">${plannedSessionItems(state)}</div>`)}
        ${collapsiblePanel(
          "Rutinas",
          "Guardar base reutilizable",
          `
            <form id="routine-form" class="stack">
              <div class="field-grid">
                <label><span>Nombre</span><input name="name" placeholder="Ej. Pierna A" required></label>
                <label><span>Enfoque</span><input name="focus" placeholder="Fuerza gluteo, cardio..." required></label>
              </div>
              <button class="primary" type="submit">Guardar rutina</button>
            </form>
            <div class="stack">${routineItems(state.training.routines)}</div>
          `
        )}
        ${collapsiblePanel("Biblioteca V1", "Ejercicios base", `<section class="dashboard-summary">${libraryItems()}</section>`)}
      </section>
    </section>
  `;
}
