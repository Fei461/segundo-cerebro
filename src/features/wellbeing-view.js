import {
  CYCLE_SYMPTOM_GROUPS,
  CYCLE_SYMPTOM_LIBRARY,
  DIGESTION_STATES,
  ENERGY_LEVELS,
  MOOD_LEVELS
} from "../domain/catalogs.js";
import { getCycleSupportSuggestions, getWeeklyHealthInsights } from "../domain/insights.js";

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

function recentSymptoms(symptomLog) {
  return Object.entries(symptomLog || {})
    .sort((left, right) => right[0].localeCompare(left[0]))
    .slice(0, 8);
}

function medicationToday(medication, date) {
  return medication.meds.map(med => ({
    ...med,
    taken: Boolean((medication.log?.[date] || []).includes(med.id))
  }));
}

function renderSymptoms(symptomLog) {
  const entries = recentSymptoms(symptomLog);
  if (entries.length === 0) {
    return `<p class="muted">Aún no has registrado síntomas.</p>`;
  }

  return entries
    .map(
      ([date, items]) => `
        <article class="entry">
          <div>
            <p class="entry-title">${date}</p>
            <p class="entry-meta">${items.map(item => `${item.name} (${item.intensity}/5)`).join(" · ")}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function renderMedications(medication) {
  const entries = medicationToday(medication, todayKey());
  if (entries.length === 0) {
    return `<p class="muted">Aún no hay medicaciones guardadas.</p>`;
  }

  return entries
    .map(
      med => `
        <article class="entry">
          <div>
            <p class="entry-title">${med.name}</p>
            <p class="entry-meta">${med.dose || "sin dosis"}${med.notes ? ` · ${med.notes}` : ""}</p>
          </div>
          <div class="button-row">
            <button class="${med.taken ? "primary" : "ghost"} compact" data-action="toggle-med" data-id="${med.id}">${med.taken ? "Tomado hoy" : "Marcar hoy"}</button>
            <button class="ghost compact" data-action="delete-med" data-id="${med.id}">Eliminar</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderSymptomGroups() {
  return CYCLE_SYMPTOM_GROUPS.map(
    group => `
      <article class="summary-card">
        <p class="eyebrow">${group.title}</p>
        <p class="entry-meta">${group.items.slice(0, 6).join(" · ")}</p>
      </article>
    `
  ).join("");
}

function renderSupportSuggestions(suggestions) {
  if (suggestions.length === 0) {
    return `<p class="muted">Aún faltan datos para sugerencias por fase.</p>`;
  }

  return suggestions.map(item => `<article class="entry"><div><p class="entry-title">${item}</p></div></article>`).join("");
}

export function renderWellbeingFeature(state) {
  const today = todayKey();
  const periodToday = state.cycle.periodDays.includes(today);
  const symptomCount = Object.values(state.cycle.symptomLog || {}).reduce((sum, items) => sum + items.length, 0);
  const weeklyHealth = getWeeklyHealthInsights(state);
  const supportSuggestions = getCycleSupportSuggestions(state);
  const symptomOptions = CYCLE_SYMPTOM_LIBRARY.map(symptom => `<option value="${symptom}"></option>`).join("");
  const digestionOptions = DIGESTION_STATES.map(item => `<option value="${item}">${item}</option>`).join("");
  const energyOptions = ENERGY_LEVELS.map(level => `<option value="${level}">${level}</option>`).join("");
  const moodOptions = MOOD_LEVELS.map(level => `<option value="${level}">${level}</option>`).join("");
  const cycleSignals = weeklyHealth.signals
    .filter(signal => signal.kind === "cycle" || signal.kind === "cycle-phase" || signal.kind === "energy" || signal.kind === "mood")
    .map(signal => signal.title);

  return `
    <section id="wellbeing-panel" class="panel stack">
      <div class="section-head">
        <div>
          <p class="eyebrow">Salud</p>
          <h3>Ciclo y síntomas</h3>
        </div>
        <p class="muted">Captura rápida y lectura simple.</p>
      </div>

      <section class="wellbeing-summary compact-metrics section-block">
        <article class="summary-card">
          <p class="eyebrow">Ciclo</p>
          <p class="metric">${state.cycle.periodDays.length}</p>
          <button class="${periodToday ? "primary" : "ghost"} compact" data-action="toggle-period">${periodToday ? "Quitar hoy" : "Marcar hoy"}</button>
        </article>
        <article class="summary-card">
          <p class="eyebrow">Síntomas</p>
          <p class="metric">${symptomCount}</p>
          <p class="entry-meta">registros acumulados</p>
        </article>
        <article class="summary-card">
          <p class="eyebrow">Medicación</p>
          <p class="metric">${state.medication.meds.length}</p>
          <p class="entry-meta">items activos</p>
        </article>
        <article class="summary-card">
          <p class="eyebrow">Fase actual</p>
          <p class="metric">${weeklyHealth.cycleContext.label}</p>
          <p class="entry-meta">${weeklyHealth.dominantSymptoms[0]?.name || "sin patrón dominante"}</p>
        </article>
      </section>

      <div class="training-grid section-block">
        <section class="subpanel stack rail-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">Lectura y soporte</p>
              <h4>Ciclo, energía y sugerencias</h4>
            </div>
          </div>
          <article class="entry">
            <div>
              <p class="entry-title">Fase y señales</p>
              <p class="entry-meta">${weeklyHealth.cycleContext.label}</p>
              <p class="entry-note">${cycleSignals.length ? cycleSignals.join(" · ") : "Sin señales dominantes esta semana."}</p>
            </div>
          </article>
          <article class="entry">
            <div>
              <p class="entry-title">Sugerencias accionables para hoy y la semana</p>
            </div>
          </article>
          <div class="stack">${renderSupportSuggestions(supportSuggestions)}</div>
        </section>

        <section class="subpanel stack rail-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">Registrar</p>
              <h4>Captura rápida</h4>
            </div>
          </div>
          <datalist id="cycle-symptom-library">${symptomOptions}</datalist>
          ${collapsiblePanel(
            "Síntoma",
            "Guardar síntoma",
            `
              <form id="symptom-form" class="stack">
                <div class="field-grid">
                  <label><span>Fecha</span><input name="date" type="date" value="${today}" required></label>
                  <label><span>Síntoma</span><input name="name" list="cycle-symptom-library" placeholder="Ej. cólicos o dolor ovulatorio" required></label>
                </div>
                <div class="field-grid">
                  <label><span>Intensidad (1-5)</span><input name="intensity" type="number" min="1" max="5" value="3" required></label>
                  <label><span>Digestión</span><select name="digestion"><option value="">Opcional</option>${digestionOptions}</select></label>
                </div>
                <div class="field-grid">
                  <label><span>Energía (1-5)</span><select name="energy"><option value="">Opcional</option>${energyOptions}</select></label>
                  <label><span>Ánimo (1-5)</span><select name="mood"><option value="">Opcional</option>${moodOptions}</select></label>
                </div>
                <label><span>Nota</span><input name="note" placeholder="Opcional"></label>
                <button class="primary" type="submit">Guardar síntoma</button>
              </form>
            `
          )}
          ${collapsiblePanel(
            "Medicación",
            "Añadir medicación",
            `
              <form id="med-form" class="stack">
                <div class="field-grid">
                  <label><span>Nombre</span><input name="name" placeholder="Ej. Magnesio" required></label>
                  <label><span>Dosis</span><input name="dose" placeholder="Ej. 1 cápsula"></label>
                </div>
                <label><span>Notas</span><input name="notes" placeholder="Horario o aclaración"></label>
                <button class="primary" type="submit">Guardar medicación</button>
              </form>
            `
          )}
          <div class="stack">${renderMedications(state.medication)}</div>
        </section>
      </div>

      <section class="fold-grid section-block">
        ${collapsiblePanel("Últimos síntomas", "Ver registros", `<div class="stack">${renderSymptoms(state.cycle.symptomLog)}</div>`)}
        ${collapsiblePanel("Biblioteca V1", "Síntomas base y familias operativas", `<section class="dashboard-summary">${renderSymptomGroups()}</section>`)}
      </section>
    </section>
  `;
}
