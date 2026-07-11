import { getWeeklyHealthInsights } from "../domain/insights.js";
import { getPlannedSessions } from "../domain/plans.js";
import { addDaysToDateKey, localDateKey } from "../domain/date.js";
import { formatCycleContextLabel, formatPlanStatus } from "../ui/formatters.js";
import { emptyState, featureHeader, sectionCard, viewSwitcher } from "../ui/feature-layout.js";

const TRAINING_TYPES = ["Fuerza", "Cardio", "Movilidad", "Recuperación", "Natación"];
const TRAINING_STRUCTURES = ["Simple", "Circuito", "Series", "Técnica", "Intervalos"];
const EXERCISE_GROUPS = [
  {
    title: "Fuerza inferior",
    items: ["Hip thrust", "Sentadilla", "Peso muerto rumano", "Prensa", "Zancadas", "Puente glúteo"]
  },
  {
    title: "Fuerza superior",
    items: ["Remo", "Jalón al pecho", "Press banca", "Press militar", "Face pull", "Curl bíceps"]
  },
  {
    title: "Cardio",
    items: ["Running", "Bici", "Elíptica", "Caminata inclinada", "Saltar cuerda"]
  },
  {
    title: "Movilidad",
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
  for (let index = 0; index < 7; index += 1) keys.add(addDaysToDateKey(base, -index));
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

function normalizeExercisePool(state) {
  const custom = Array.isArray(state.training?.customExercises) ? state.training.customExercises.map(item => item.name) : [];
  return [...new Set([...EXERCISE_GROUPS.flatMap(group => group.items), ...custom])];
}

function exerciseOptions(state) {
  return normalizeExercisePool(state).map(exercise => `<option value="${exercise}"></option>`).join("");
}

function sessionMeta(session) {
  return [
    session.activity,
    session.duration ? `${session.duration} min` : "",
    session.structure || "",
    session.rpe ? `RPE ${session.rpe}` : ""
  ]
    .filter(Boolean)
    .join(" · ");
}

function sessionExercisePreview(session) {
  const exercises = Array.isArray(session.exercises) ? session.exercises : [];
  if (!exercises.length) return "";
  return `<p class="entry-note">${exercises.slice(0, 3).join(" · ")}</p>`;
}

function recentSessionItems(items, limit = 4) {
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

function plannedSessionItems(items, limit = 4) {
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
          </div>
        </article>
      `
    )
    .join("");
}

function routineItems(items) {
  if (!items.length) return emptyState("Aún no hay plantillas guardadas.");
  return items
    .slice(0, 4)
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

function customExerciseItems(items) {
  if (!items.length) return emptyState("Todavía no has añadido ejercicios propios.");
  return items
    .slice(0, 6)
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.name}</p>
            <p class="entry-meta">${item.type}</p>
            ${item.notes ? `<p class="entry-note">${item.notes}</p>` : ""}
          </div>
        </article>
      `
    )
    .join("");
}

function bestByActivity(items) {
  const map = new Map();
  items.forEach(session => {
    const key = String(session.activity || "").trim();
    if (!key) return;
    const current = map.get(key) || { loadKg: 0, distanceKm: 0, duration: 0 };
    map.set(key, {
      loadKg: Math.max(current.loadKg, Number(session.loadKg || 0)),
      distanceKm: Math.max(current.distanceKm, Number(session.distanceKm || 0)),
      duration: Math.max(current.duration, Number(session.duration || 0))
    });
  });
  return Array.from(map.entries())
    .slice(0, 6)
    .map(([activity, best]) => ({
      activity,
      detail: [best.loadKg ? `${best.loadKg} kg` : "", best.distanceKm ? `${best.distanceKm} km` : "", best.duration ? `${best.duration} min` : ""]
        .filter(Boolean)
        .join(" · ")
    }))
    .filter(item => item.detail);
}

function prPreview(items) {
  const prs = bestByActivity(items);
  if (!prs.length) return emptyState("Los mejores registros aparecerán cuando acumules más sesiones.");
  return prs
    .map(item => `<article class="entry"><div><p class="entry-title">${item.activity}</p><p class="entry-meta">${item.detail}</p></div></article>`)
    .join("");
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

function timerLabel(restTimer = {}) {
  if (!restTimer.endsAt) return "Listo";
  const remaining = Math.max(0, Math.ceil((restTimer.endsAt - Date.now()) / 1000));
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function timerButtons() {
  return `
    <div class="button-row button-row-start button-row-soft">
      <button class="ghost compact" type="button" data-action="start-rest-timer" data-seconds="60">1 min</button>
      <button class="ghost compact" type="button" data-action="start-rest-timer" data-seconds="90">1,5 min</button>
      <button class="ghost compact" type="button" data-action="start-rest-timer" data-seconds="120">2 min</button>
      <button class="ghost compact" type="button" data-action="clear-rest-timer">Parar</button>
    </div>
  `;
}

export function renderTrainingFeature(state, options = {}) {
  const currentView = options.currentView || "overview";
  const restTimer = options.restTimer || {};
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
          "Sesión hecha",
          `
            <datalist id="exercise-library">${exerciseOptions(state)}</datalist>
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
                <summary class="disclosure-summary"><div><p class="eyebrow">Opcional</p><h4>Estructura y métricas</h4></div></summary>
                <div class="stack disclosure-body">
                  <div class="field-grid">
                    <label><span>Estructura</span><select name="structure"><option value="">Simple</option>${structureOptions}</select></label>
                    <label><span>Rutina</span><input name="routineName" placeholder="Ej. Pierna A o Agua técnica"></label>
                  </div>
                  <label><span>Bloques o ejercicios</span><textarea name="exercises" rows="4" placeholder="Un ejercicio por línea. También sirve para circuitos:&#10;3 rondas&#10;Crol 100m&#10;Pull buoy 50m"></textarea></label>
                  <div class="field-grid four">
                    <label><span>RPE</span><input name="rpe" type="number" min="1" max="10" placeholder="1-10"></label>
                    <label><span>Carga kg</span><input name="loadKg" type="number" min="0" placeholder="Opcional"></label>
                    <label><span>Distancia km</span><input name="distanceKm" type="number" step="0.1" min="0" placeholder="Opcional"></label>
                    <label><span>Energía</span><input name="preEnergy" type="number" min="1" max="5" placeholder="1-5"></label>
                  </div>
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
        "Próximas",
        "Lo ya programado",
        `
          <section class="dashboard-summary compact-metrics feature-metrics-soft">
            ${statCard("Futuras", plannedSessions.length, "guardadas")}
            ${statCard("Hechas", plannedSessions.filter(item => item.status === "done").length, "cerradas")}
            ${statCard("Parciales", plannedSessions.filter(item => item.status === "partial").length, "ajuste")}
            ${statCard("Omitidas", plannedSessions.filter(item => item.status === "skipped").length, "saltadas")}
          </section>
          <div class="stack stack-tight">${plannedSessionItems(plannedSessions)}</div>
        `,
        "section-card-hero section-card-training"
      )}
      <details class="panel panel-toned disclosure-panel compact-disclosure">
        <summary class="disclosure-summary"><div><p class="eyebrow">Nueva</p><h4>Programar sesión</h4></div></summary>
        <div class="stack disclosure-body">
          <datalist id="exercise-library">${exerciseOptions(state)}</datalist>
          <form id="planned-session-form" class="stack">
            <div class="field-grid">
              <label><span>Fecha</span><input name="date" type="date" value="${todayKey()}" required></label>
              <label><span>Tipo</span><select name="type" required>${typeOptions}</select></label>
            </div>
            <div class="field-grid">
              <label><span>Actividad</span><input name="activity" list="exercise-library" placeholder="Ej. upper, movilidad o crol" required></label>
              <label><span>Duración</span><input name="duration" type="number" min="1" value="60" required></label>
            </div>
            <div class="field-grid">
              <label><span>Estructura</span><select name="structure"><option value="">Simple</option>${structureOptions}</select></label>
              <label><span>Estado</span><select name="status"><option value="planned">Previsto</option><option value="partial">Parcial</option><option value="done">Hecho</option><option value="skipped">Omitido</option></select></label>
            </div>
            <label><span>Rutina base</span><input name="routineName" placeholder="Opcional"></label>
            <label><span>Notas</span><input name="notes" placeholder="Objetivo o ajuste esperado"></label>
            <button class="primary" type="submit">Programar sesión</button>
          </form>
        </div>
      </details>
      <details class="panel panel-toned disclosure-panel compact-disclosure">
        <summary class="disclosure-summary"><div><p class="eyebrow">Base</p><h4>Rutinas y ejercicios propios</h4></div></summary>
        <div class="stack disclosure-body">
          <div class="training-focus-grid">
        ${sectionCard(
          "Plantillas",
          "Rutinas reutilizables",
          `
            <form id="routine-form" class="stack">
              <div class="field-grid">
                <label><span>Nombre</span><input name="name" placeholder="Ej. Pierna A" required></label>
                <label><span>Enfoque</span><input name="focus" placeholder="Fuerza glúteo, natación técnica..." required></label>
              </div>
              <label><span>Ejercicios</span><textarea name="exercises" rows="4" placeholder="Un ejercicio por línea"></textarea></label>
              <button class="primary" type="submit">Guardar plantilla</button>
            </form>
            <div class="stack stack-tight">${routineItems(state.training.routines)}</div>
          `,
          "section-card-glass section-card-training-light"
        )}
        ${sectionCard(
          "Propios",
          "Ejercicios personalizados",
          `
            <form id="custom-exercise-form" class="stack">
              <div class="field-grid">
                <label><span>Nombre</span><input name="name" placeholder="Ej. 8x50 crol" required></label>
                <label><span>Tipo</span><input name="type" placeholder="Natación, fuerza..." required></label>
              </div>
              <label><span>Nota</span><input name="notes" placeholder="Cuándo te sirve o cómo lo usas"></label>
              <button class="primary" type="submit">Guardar ejercicio</button>
            </form>
            <div class="stack stack-tight">${customExerciseItems(state.training.customExercises || [])}</div>
          `,
          "section-card-glass section-card-training-light"
        )}
          </div>
        </div>
      </details>
    `;
  } else if (currentView === "library") {
    body = sectionCard(
      "Base",
      "Biblioteca útil",
      `
        <section class="dashboard-summary compact-metrics template-grid">
          ${EXERCISE_GROUPS.map(
            group => `
              <article class="summary-card summary-card-soft">
                <p class="eyebrow">${group.title}</p>
                <p class="entry-meta">${group.items.join(" · ")}</p>
              </article>
            `
          ).join("")}
        </section>
        <div class="stack stack-tight">
          ${customExerciseItems(state.training.customExercises || [])}
        </div>
      `,
      "section-card-glass section-card-training-light"
    );
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
              <button class="ghost compact" type="button" data-action="open-module-view" data-tab="training" data-view="library">Base</button>
            </div>
          `,
          "section-card-hero section-card-training"
        )}
        ${sectionCard(
          "Descanso",
          "Temporizador",
          `
            <article class="summary-card summary-card-soft">
              <p class="eyebrow">Rest</p>
              <p class="metric">${timerLabel(restTimer)}</p>
              <p class="entry-meta">rápido entre bloques</p>
            </article>
            ${timerButtons()}
          `,
          "section-card-glass section-card-training-light"
        )}
      </div>
      <div class="training-focus-grid">
        ${sectionCard(
          "Cruce",
          "Energía y recuperación",
          `
            <article class="entry"><div><p class="entry-title">Ciclo</p><p class="entry-meta">${formatCycleContextLabel(health.cycleContext)}</p></div></article>
            <article class="entry"><div><p class="entry-title">Energía media</p><p class="entry-meta">${health.avgEnergy ? health.avgEnergy.toFixed(1) : "-"} / 5</p></div></article>
            <div class="stack stack-tight">${signalPreview(health)}</div>
          `,
          "section-card-glass section-card-training-light"
        )}
        ${sectionCard(
          "Progresión",
          "Tus mejores registros",
          `
            <div class="stack stack-tight">${prPreview(state.training.sessions)}</div>
            <details class="panel panel-toned disclosure-panel compact-disclosure">
              <summary class="disclosure-summary"><div><p class="eyebrow">Semana</p><h4>Reparto por tipo</h4></div></summary>
              <div class="stack disclosure-body">${typeDistribution(state.training.sessions.filter(session => session.date >= addDaysToDateKey(todayKey(), -6)))}</div>
            </details>
          `,
          "section-card-glass section-card-training-light"
        )}
      </div>
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
