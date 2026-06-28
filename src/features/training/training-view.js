import { EXERCISE_LIBRARY, EXERCISE_LIBRARY_GROUPS, TRAINING_TYPES } from "../../domain/catalogs.js";
import { getWeeklyHealthInsights } from "../../domain/insights.js";
import { getUpcomingPlannedSessions } from "../../domain/plans.js";
import { formatPlanStatus, formatSuggestionReason } from "../../ui/formatters.js";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value) {
  return Number(value || 0).toFixed(0);
}

function weeklyTotals(sessions) {
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() - 6);
  const minKey = minDate.toISOString().slice(0, 10);

  return sessions
    .filter(session => session.date >= minKey)
    .reduce(
      (accumulator, session) => ({
        count: accumulator.count + 1,
        minutes: accumulator.minutes + Number(session.duration || 0),
        load: accumulator.load + Number(session.loadKg || 0),
        distance: accumulator.distance + Number(session.distanceKm || 0)
      }),
      { count: 0, minutes: 0, load: 0, distance: 0 }
    );
}

function sessionItems(sessions) {
  if (sessions.length === 0) {
    return `<p class="muted">Todavia no hay sesiones registradas en esta nueva app.</p>`;
  }

  return sessions
    .slice()
    .sort((left, right) => String(right.date).localeCompare(String(left.date)))
    .slice(0, 8)
    .map(
      session => `
        <article class="entry">
          <div>
            <p class="entry-title">${session.date} · ${session.type} · ${session.activity || "sin detalle"}</p>
            <p class="entry-meta">${formatNumber(session.duration)} min${session.rpe ? ` · RPE ${session.rpe}` : ""}${session.loadKg ? ` · ${formatNumber(session.loadKg)} kg` : ""}${session.distanceKm ? ` · ${session.distanceKm} km` : ""}</p>
            <p class="entry-note">Energia ${session.preEnergy ?? "-"} · Recuperacion ${session.recoveryScore ?? "-"} · Molestias ${session.sorenessScore ?? "-"}</p>
            ${session.notes ? `<p class="entry-note">${session.notes}</p>` : ""}
          </div>
          <button class="ghost compact" data-action="delete-session" data-id="${session.id}">Eliminar</button>
        </article>
      `
    )
    .join("");
}

function routineItems(routines) {
  if (routines.length === 0) {
    return `<p class="muted">Todavia no has guardado rutinas base.</p>`;
  }

  return routines
    .map(
      routine => `
        <article class="entry">
          <div>
            <p class="entry-title">${routine.name}</p>
            <p class="entry-meta">${routine.focus || "Sin foco"} · ${routine.exercises || ""}</p>
          </div>
          <button class="ghost compact" data-action="delete-routine" data-id="${routine.id}">Eliminar</button>
        </article>
      `
    )
    .join("");
}

function plannedSessionItems(state) {
  const plannedSessions = getUpcomingPlannedSessions(state);
  if (plannedSessions.length === 0) {
    return `<p class="muted">Todavia no hay sesiones futuras programadas.</p>`;
  }

  return plannedSessions
    .slice(0, 8)
    .map(
      session => `
        <article class="entry">
          <div>
            <p class="entry-title">${session.date} · ${session.type} · ${session.activity}</p>
            <p class="entry-meta">${formatNumber(session.duration)} min${session.routineName ? ` · ${session.routineName}` : ""} · ${formatPlanStatus(session.status)}</p>
            ${session.reason ? `<p class="entry-note">Sugerencia generada por: ${formatSuggestionReason(session.reason)}</p>` : ""}
            ${session.notes ? `<p class="entry-note">${session.notes}</p>` : ""}
          </div>
          <div class="button-row">
            <button class="primary compact" data-action="complete-planned-session" data-id="${session.id}">Ejecutar</button>
            <button class="ghost compact" data-action="cycle-planned-session-status" data-id="${session.id}">Estado</button>
            <button class="ghost compact" data-action="delete-planned-session" data-id="${session.id}">Eliminar</button>
          </div>
        </article>
      `
    )
    .join("");
}

function libraryGroupItems() {
  return EXERCISE_LIBRARY_GROUPS.map(
    group => `
      <article class="summary-card">
        <p class="eyebrow">${group.title}</p>
        <p class="entry-meta">${group.items.slice(0, 6).join(" · ")}</p>
      </article>
    `
  ).join("");
}

function weeklyCrossSignals(state) {
  const health = getWeeklyHealthInsights(state);
  const signals = health.signals
    .filter(signal => ["training", "training-energy", "fatigue", "recovery", "cycle-phase"].includes(signal.kind))
    .slice(0, 4);

  if (signals.length === 0) {
    return `<p class="muted">Aun no hay suficientes cruces entre entreno, recuperación y ciclo para una lectura semanal potente.</p>`;
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

export function renderTrainingFeature(state) {
  const totals = weeklyTotals(state.training.sessions);
  const typeOptions = TRAINING_TYPES.map(type => `<option value="${type}">${type}</option>`).join("");
  const exerciseOptions = EXERCISE_LIBRARY.map(exercise => `<option value="${exercise}"></option>`).join("");

  return `
    <section id="training-panel" class="panel stack">
      <div class="section-head">
        <div>
          <p class="eyebrow">Entreno migrado</p>
          <h3>Registro de sesiones y rutinas</h3>
        </div>
        <p class="muted">El registro ya capta mejor energia, recuperacion y molestias para cruzarlo con descanso, ciclo y planificacion futura.</p>
      </div>

      <section class="training-summary">
        <article class="summary-card">
          <p class="eyebrow">7 dias</p>
          <p class="metric">${totals.count} sesiones</p>
          <p class="entry-meta">${formatNumber(totals.minutes)} min</p>
        </article>
        <article class="summary-card">
          <p class="eyebrow">Carga</p>
          <p class="metric">${formatNumber(totals.load)} kg</p>
          <p class="entry-meta">volumen simple semanal</p>
        </article>
        <article class="summary-card">
          <p class="eyebrow">Cardio</p>
          <p class="metric">${Number(totals.distance || 0).toFixed(1)} km</p>
          <p class="entry-meta">distancia semanal</p>
        </article>
      </section>

      <section class="subpanel stack">
        <div class="section-head">
          <div>
            <p class="eyebrow">Biblioteca V1</p>
            <h4>Base real de ejercicios y bloques</h4>
          </div>
        </div>
        <section class="dashboard-summary">${libraryGroupItems()}</section>
      </section>

      <section class="subpanel stack">
        <div class="section-head">
          <div>
            <p class="eyebrow">Lectura cruzada</p>
            <h4>Entreno frente a sueño, recuperación y ciclo</h4>
          </div>
        </div>
        <div class="stack">${weeklyCrossSignals(state)}</div>
      </section>

      <div class="training-grid">
        <section class="subpanel stack">
          <div class="section-head">
            <div>
              <p class="eyebrow">Nueva sesion</p>
              <h4>Registrar entreno</h4>
            </div>
          </div>
          <form id="training-form" class="stack">
            <div class="field-grid">
              <label><span>Fecha</span><input name="date" type="date" value="${todayKey()}" required></label>
              <label><span>Tipo</span><select name="type" required>${typeOptions}</select></label>
            </div>
            <div class="field-grid">
              <label><span>Actividad</span><input name="activity" list="exercise-library" placeholder="Ej. Hip thrust o running" required></label>
              <label><span>Duracion (min)</span><input name="duration" type="number" step="1" min="0" value="60" required></label>
            </div>
            <datalist id="exercise-library">${exerciseOptions}</datalist>
            <div class="field-grid four">
              <label><span>RPE</span><input name="rpe" type="number" step="1" min="1" max="10" value="7"></label>
              <label><span>Carga kg</span><input name="loadKg" type="number" step="1" min="0" value="0"></label>
              <label><span>Distancia km</span><input name="distanceKm" type="number" step="0.1" min="0" value="0"></label>
              <label><span>Rutina usada</span><input name="routineName" placeholder="Opcional"></label>
            </div>
            <div class="field-grid">
              <label><span>Energia previa (1-5)</span><input name="preEnergy" type="number" min="1" max="5" value="3"></label>
              <label><span>Recuperacion (1-5)</span><input name="recoveryScore" type="number" min="1" max="5" value="3"></label>
            </div>
            <div class="field-grid">
              <label><span>Molestias (1-5)</span><input name="sorenessScore" type="number" min="1" max="5" value="1"></label>
              <label><span>Notas</span><input name="notes" placeholder="Sensaciones, molestias, contexto..."></label>
            </div>
            <button class="primary" type="submit">Guardar sesion</button>
          </form>
          <div class="stack">${sessionItems(state.training.sessions)}</div>
        </section>

        <section class="subpanel stack">
          <div class="section-head">
            <div>
              <p class="eyebrow">Programacion</p>
              <h4>Sesion futura</h4>
            </div>
          </div>
          <form id="planned-session-form" class="stack">
            <div class="field-grid">
              <label><span>Fecha</span><input name="date" type="date" value="${todayKey()}" required></label>
              <label><span>Tipo</span><select name="type" required>${typeOptions}</select></label>
            </div>
            <div class="field-grid">
              <label><span>Actividad</span><input name="activity" list="exercise-library" placeholder="Ej. Upper, running suave..." required></label>
              <label><span>Duracion (min)</span><input name="duration" type="number" step="1" min="1" value="60" required></label>
            </div>
            <div class="field-grid">
              <label><span>Rutina base</span><input name="routineName" placeholder="Opcional"></label>
              <label><span>Estado</span><select name="status"><option value="planned">Previsto</option><option value="partial">Parcial</option><option value="skipped">Omitido</option><option value="done">Hecho</option></select></label>
            </div>
            <label><span>Notas</span><textarea name="notes" rows="3" placeholder="Objetivo, sensaciones esperadas, recordatorios..."></textarea></label>
            <button class="primary" type="submit">Programar sesion</button>
          </form>
          <div class="stack">${plannedSessionItems(state)}</div>
        </section>

        <section class="subpanel stack">
          <div class="section-head">
            <div>
              <p class="eyebrow">Rutinas</p>
              <h4>Guardar base reutilizable</h4>
            </div>
          </div>
          <form id="routine-form" class="stack">
            <div class="field-grid">
              <label><span>Nombre</span><input name="name" placeholder="Ej. Lower A" required></label>
              <label><span>Foco</span><input name="focus" placeholder="Gluteo, espalda, cardio..." required></label>
            </div>
            <label><span>Ejercicios</span><textarea name="exercises" rows="4" placeholder="Una linea por ejercicio o estructura de la sesion"></textarea></label>
            <button class="primary" type="submit">Guardar rutina</button>
          </form>
          <div class="stack">${routineItems(state.training.routines)}</div>
        </section>
      </div>
    </section>
  `;
}
