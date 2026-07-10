import { getWeeklyHealthInsights } from "../domain/insights.js";
import { getPlannedSessions } from "../domain/plans.js";
import { addDaysToDateKey, localDateKey } from "../domain/date.js";
import { formatCycleContextLabel, formatPlanStatus } from "../ui/formatters.js";
import { emptyState, featureHeader, sectionCard, viewSwitcher } from "../ui/feature-layout.js";

const TRAINING_TYPES = ["Fuerza", "Cardio", "Movilidad", "Recuperación", "Natación"];
const TRAINING_STRUCTURES = ["Simple", "Circuito", "Series", "Técnica", "Intervalos"];
const EXERCISE_GROUPS = [
  {
    title: "Fuerza tren inferior",
    items: ["Hip thrust", "Sentadilla", "Peso muerto rumano", "Prensa", "Zancadas", "Puente glúteo"]
  },
  {
    title: "Fuerza tren superior",
    items: ["Remo", "Jalón al pecho", "Press banca", "Press militar", "Face pull", "Curl bíceps"]
  },
  {
    title: "Cardio y base",
    items: ["Running", "Bici", "Elíptica", "Caminata inclinada", "Saltar cuerda"]
  },
  {
    title: "Movilidad y core",
    items: ["Core", "Pilates", "Movilidad cadera", "Movilidad dorsal", "Estiramientos", "Yoga suave"]
  },
  {
    title: "Natación",
    items: ["Crol", "Espalda", "Braza", "Patada con tabla", "Pull buoy", "Series 50m", "Series 100m"]
  }
];

function todayKey() {
  return localDateKey(new Date());
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

function weeklyTotals(sessions) {
  const keys = new Set();
  const base = todayKey();
  for (let index = 0; index < 7; index += 1) {
    keys.add(addDaysToDateKey(base, -index));
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

function exerciseOptions() {
  return EXERCISE_GROUPS.flatMap(group => group.items).map(exercise => `<option value="${exercise}"></option>`).join("");
}

function sessionMeta(session) {
  const parts = [
    session.activity,
    session.duration ? `${session.duration} min` : "",
    session.structure || "",
    session.rpe ? `RPE ${session.rpe}` : ""
  ].filter(Boolean);
  return parts.join(" · ");
}

function sessionExercisePreview(session) {
  const exercises = Array.isArray(session.exercises) ? session.exercises : [];
  if (!exercises.length) return "";
  return `<p class="entry-note">${exercises.slice(0, 3).join(" · ")}</p>`;
}

function recentSessionItems(items, limit = 5) {
  const sessions = items
    .slice()
    .sort((left, right) => `${right.date}-${right.type}`.localeCompare(`${left.date}-${left.type}`))
    .slice(0, limit);

  if (!sessions.length) return emptyState("Aún no hay sesiones registradas.");

  return sessions
    .map(
      session => `
        <article class="entry">
          <div>
            <p class="entry-title">${session.date} · ${session.type}</p>
            <p class="entry-meta">${sessionMeta(session)}</p>
            ${sessionExercisePreview(session)}
          </div>
          <button class="ghost compact" data-action="delete-session" data-id="${session.id}">Eliminar</button>
        </article>
      `
    )
    .join("");
}

function plannedSessionItems(items, limit = 5) {
  if (!items.length) return emptyState("Aún no hay sesiones programadas.");

  return items
    .slice(0, limit)
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.date} · ${item.type}</p>
            <p class="entry-meta">${sessionMeta(item)} · ${formatPlanStatus(item.status)}</p>
            ${sessionExercisePreview(item)}
          </div>
          <div class="button-row">
            <button class="primary compact" data-action="complete-planned-session" data-id="${item.id}">Hecho</button>
            <button class="ghost compact" data-action="cycle-planned-session-status" data-id="${item.id}">Estado</button>
            <button class="ghost compact" data-action="delete-planned-session" data-id="${item.id}">Eliminar</button>
          </div>
        </article>
      `
    )
    .join("");
}

function routineItems(items) {
  if (!items.length) return emptyState("Aún no hay rutinas guardadas.");

  return items
    .slice(0, 6)
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.name}</p>
            <p class="entry-meta">${item.focus}</p>
            ${Array.isArray(item.exercises) && item.exercises.length ? `<p class="entry-note">${item.exercises.slice(0, 4).join(" · ")}</p>` : ""}
          </div>
          <button class="ghost compact" data-action="delete-routine" data-id="${item.id}">Eliminar</button>
        </article>
      `
    )
    .join("");
}

function libraryItems() {
  return EXERCISE_GROUPS.map(
    group => `
      <article class="summary-card summary-card-soft">
        <p class="eyebrow">${group.title}</p>
        <p class="entry-meta">${group.items.join(" · ")}</p>
      </article>
    `
  ).join("");
}

function nextPlannedHeadline(plannedSessions) {
  const next = plannedSessions[0];
  if (!next) return emptyState("No hay una siguiente sesión marcada todavía.");
  return `
    <article class="entry">
      <div>
        <p class="entry-title">${next.type} · ${next.activity}</p>
        <p class="entry-meta">${next.date} · ${next.duration} min · ${formatPlanStatus(next.status)}</p>
        ${sessionExercisePreview(next)}
      </div>
    </article>
  `;
}

function signalPreview(health) {
  if (!health.signals.length) return emptyState("Sin señales activas relevantes ahora mismo.");
  return health.signals
    .slice(0, 2)
    .map(signal => `<article class="entry"><div><p class="entry-title">${signal.title}</p><p class="entry-note">${signal.detail}</p></div></article>`)
    .join("");
}

function typeDistribution(items) {
  const totals = items.reduce((map, item) => {
    const key = String(item.type || "Otro");
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map());

  if (!totals.size) return emptyState("Todavía no hay sesiones registradas esta semana.");

  return Array.from(totals.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([name, count]) => `<article class="entry"><div><p class="entry-title">${name}</p><p class="entry-meta">${count} sesión(es)</p></div></article>`)
    .join("");
}

export function renderTrainingFeature(state, options = {}) {
  const currentView = options.currentView || "overview";
  const totals = weeklyTotals(state.training.sessions);
  const typeOptions = TRAINING_TYPES.map(type => `<option value="${type}">${type}</option>`).join("");
  const structureOptions = TRAINING_STRUCTURES.map(type => `<option value="${type}">${type}</option>`).join("");
  const plannedSessions = getPlannedSessions(state)
    .filter(session => session.date >= todayKey())
    .sort((left, right) => `${left.date}-${left.type}`.localeCompare(`${right.date}-${right.type}`));
  const health = getWeeklyHealthInsights(state);

  let body = "";

  if (currentView === "log") {
    body = `
      <div class="training-focus-grid">
        ${sectionCard(
          "Registrar",
          "Guardar sesión",
          `
            <datalist id="exercise-library">${exerciseOptions()}</datalist>
            <form id="training-form" class="stack">
              <div class="field-grid">
                <label><span>Fecha</span><input name="date" type="date" value="${todayKey()}" required></label>
                <label><span>Tipo</span><select name="type" required>${typeOptions}</select></label>
              </div>
              <div class="field-grid">
                <label><span>Actividad</span><input name="activity" list="exercise-library" placeholder="Ej. sentadilla, crol o running" required></label>
                <label><span>Duración</span><input name="duration" type="number" min="1" value="60" required></label>
              </div>
              <details class="panel panel-toned disclosure-panel compact-disclosure">
                <summary class="disclosure-summary"><div><p class="eyebrow">Opcional</p><h4>Circuito, métricas y notas</h4></div></summary>
                <div class="stack disclosure-body">
                  <div class="field-grid">
                    <label><span>Estructura</span><select name="structure"><option value="">Simple</option>${structureOptions}</select></label>
                    <label><span>Rutina</span><input name="routineName" placeholder="Ej. Pierna A o Natación técnica"></label>
                  </div>
                  <label><span>Ejercicios o bloques</span><textarea name="exercises" rows="4" placeholder="Un ejercicio por línea. Ej.&#10;Sentadilla 4x8&#10;Hip thrust 4x10&#10;Core 3 rondas"></textarea></label>
                  <div class="field-grid four">
                    <label><span>RPE</span><input name="rpe" type="number" min="1" max="10" placeholder="1-10"></label>
                    <label><span>Carga kg</span><input name="loadKg" type="number" min="0" placeholder="Opcional"></label>
                    <label><span>Distancia km</span><input name="distanceKm" type="number" step="0.1" min="0" placeholder="Opcional"></label>
                    <label><span>Energía previa</span><input name="preEnergy" type="number" min="1" max="5" placeholder="1-5"></label>
                  </div>
                  <div class="field-grid">
                    <label><span>Recuperación</span><input name="recoveryScore" type="number" min="1" max="5" placeholder="1-5"></label>
                    <label><span>Molestias</span><input name="sorenessScore" type="number" min="1" max="5" placeholder="1-5"></label>
                  </div>
                  <label><span>Notas</span><input name="notes" placeholder="Sensaciones, técnica, ritmo o contexto"></label>
                </div>
              </details>
              <button class="primary" type="submit">Guardar sesión</button>
            </form>
          `,
          "section-card-tinted section-card-training"
        )}
        ${sectionCard("Reciente", "Últimas sesiones", `<div class="stack stack-tight">${recentSessionItems(state.training.sessions)}</div>`, "section-card-glass section-card-training-light")}
      </div>
    `;
  } else if (currentView === "plan") {
    body = `
      ${sectionCard(
        "Programar",
        "Sesión futura",
        `
          <datalist id="exercise-library">${exerciseOptions()}</datalist>
          <form id="planned-session-form" class="stack">
            <div class="field-grid">
              <label><span>Fecha</span><input name="date" type="date" value="${todayKey()}" required></label>
              <label><span>Tipo</span><select name="type" required>${typeOptions}</select></label>
            </div>
            <div class="field-grid">
              <label><span>Actividad</span><input name="activity" list="exercise-library" placeholder="Ej. upper, movilidad o crol" required></label>
              <label><span>Duración</span><input name="duration" type="number" min="1" value="60" required></label>
            </div>
            <details class="panel panel-toned disclosure-panel compact-disclosure">
              <summary class="disclosure-summary"><div><p class="eyebrow">Opcional</p><h4>Estructura y notas</h4></div></summary>
              <div class="stack disclosure-body">
                <div class="field-grid">
                  <label><span>Estructura</span><select name="structure"><option value="">Simple</option>${structureOptions}</select></label>
                  <label><span>Estado</span><select name="status"><option value="planned">Previsto</option><option value="partial">Parcial</option><option value="done">Hecho</option><option value="skipped">Omitido</option></select></label>
                </div>
                <label><span>Rutina base</span><input name="routineName" placeholder="Opcional"></label>
                <label><span>Notas</span><input name="notes" placeholder="Objetivo, marcas o ajuste esperado"></label>
              </div>
            </details>
            <button class="primary" type="submit">Programar sesión</button>
          </form>
        `,
        "section-card-tinted section-card-training"
      )}
      <div class="training-focus-grid">
        ${sectionCard("Próximas", "Lo ya programado", `<div class="stack stack-tight">${plannedSessionItems(plannedSessions)}</div>`, "section-card-glass section-card-training-light")}
        ${sectionCard(
          "Rutinas",
          "Base reutilizable",
          `
            <form id="routine-form" class="stack">
              <div class="field-grid">
                <label><span>Nombre</span><input name="name" placeholder="Ej. Pierna A" required></label>
                <label><span>Enfoque</span><input name="focus" placeholder="Fuerza glúteo, natación técnica..." required></label>
              </div>
              <label><span>Ejercicios</span><textarea name="exercises" rows="4" placeholder="Un ejercicio por línea"></textarea></label>
              <button class="primary" type="submit">Guardar rutina</button>
            </form>
            <div class="stack stack-tight">${routineItems(state.training.routines)}</div>
          `,
          "section-card-glass section-card-training-light"
        )}
      </div>
    `;
  } else if (currentView === "library") {
    body = sectionCard("Biblioteca", "Ejercicios y formatos base", `<section class="dashboard-summary compact-metrics">${libraryItems()}</section>`, "section-card-glass section-card-training-light");
  } else {
    body = `
      <div class="training-focus-grid">
        ${sectionCard(
          "Resumen",
          "Carga semanal",
          `
            <section class="dashboard-summary compact-metrics feature-metrics-soft">
              ${statCard("Sesiones", totals.count, `${totals.minutes} min`)}
              ${statCard("Carga", totals.load, "kg")}
              ${statCard("Cardio", Number(totals.distance || 0).toFixed(1), "km")}
              ${statCard("Futuras", plannedSessions.length, "programadas")}
            </section>
            <div class="button-row button-row-start button-row-soft">
              <button class="ghost compact" type="button" data-action="open-module-view" data-tab="training" data-view="log">Registrar</button>
              <button class="ghost compact" type="button" data-action="open-module-view" data-tab="training" data-view="plan">Programar</button>
            </div>
          `,
          "section-card-hero section-card-training"
        )}
        ${sectionCard(
          "Cruce",
          "Energía y recuperación",
          `
            <article class="entry"><div><p class="entry-title">Ciclo</p><p class="entry-meta">${formatCycleContextLabel(health.cycleContext)}</p></div></article>
            <article class="entry"><div><p class="entry-title">Energía media</p><p class="entry-meta">${health.avgEnergy ? health.avgEnergy.toFixed(1) : "-"} / 5</p></div></article>
            <div class="stack stack-tight">${signalPreview(health)}</div>
            <div class="button-row button-row-start button-row-soft">
              <button class="ghost compact" type="button" data-action="open-module-view" data-tab="recovery" data-view="overview">Ver sueño</button>
              <button class="ghost compact" type="button" data-action="create-support-block" data-kind="recovery">Bloque suave</button>
            </div>
          `,
          "section-card-glass section-card-training-light"
        )}
      </div>
      ${sectionCard(
        "Siguiente",
        "Próxima sesión",
        `
          ${nextPlannedHeadline(plannedSessions)}
          <div class="stack stack-tight">${typeDistribution(state.training.sessions.filter(session => session.date >= addDaysToDateKey(todayKey(), -6)))}</div>
          <div class="button-row button-row-start button-row-soft">
            <button class="ghost compact" type="button" data-action="open-module-view" data-tab="training" data-view="library">Base</button>
          </div>
        `,
        "section-card-glass section-card-training-light"
      )}
    `;
  }

  return `
    <section id="training-panel" class="panel stack app-feature-shell">
      ${featureHeader("Entreno", "Entrenar sin ruido", "", { emblem: "△", emblemTone: "training" })}
      ${viewSwitcher("training", currentView, [
        { id: "overview", label: "Resumen" },
        { id: "log", label: "Registrar" },
        { id: "plan", label: "Programar" },
        { id: "library", label: "Base" }
      ])}
      ${body}
    </section>
  `;
}
