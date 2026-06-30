import {
  CYCLE_SYMPTOM_GROUPS,
  CYCLE_SYMPTOM_LIBRARY,
  DIGESTION_STATES,
  ENERGY_LEVELS,
  MOOD_LEVELS
} from "../domain/catalogs.js";
import { getCycleSupportSuggestions, getWeeklyHealthInsights } from "../domain/insights.js";
import { featureHeader, sectionCard, viewSwitcher, emptyState } from "../ui/feature-layout.js";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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

function recentSymptoms(symptomLog) {
  return Object.entries(symptomLog || {})
    .sort((left, right) => right[0].localeCompare(left[0]))
    .slice(0, 6);
}

function medicationToday(medication, date) {
  return medication.meds.map(med => ({
    ...med,
    taken: Boolean((medication.log?.[date] || []).includes(med.id))
  }));
}

function renderSymptoms(symptomLog) {
  const entries = recentSymptoms(symptomLog);
  if (!entries.length) return emptyState("Aún no has registrado síntomas.");
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
  if (!entries.length) return emptyState("Aún no hay medicaciones guardadas.");
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
      <article class="summary-card summary-card-soft">
        <p class="eyebrow">${group.title}</p>
        <p class="entry-meta">${group.items.slice(0, 6).join(" · ")}</p>
      </article>
    `
  ).join("");
}

export function renderWellbeingFeature(state, options = {}) {
  const currentView = options.currentView || "overview";
  const today = todayKey();
  const periodToday = state.cycle.periodDays.includes(today);
  const symptomCount = Object.values(state.cycle.symptomLog || {}).reduce((sum, items) => sum + items.length, 0);
  const health = getWeeklyHealthInsights(state);
  const suggestions = getCycleSupportSuggestions(state).slice(0, 4);
  const symptomOptions = CYCLE_SYMPTOM_LIBRARY.map(symptom => `<option value="${symptom}"></option>`).join("");
  const digestionOptions = DIGESTION_STATES.map(item => `<option value="${item}">${item}</option>`).join("");
  const energyOptions = ENERGY_LEVELS.map(level => `<option value="${level}">${level}</option>`).join("");
  const moodOptions = MOOD_LEVELS.map(level => `<option value="${level}">${level}</option>`).join("");

  let body = "";

  if (currentView === "log") {
    body = `
      ${sectionCard(
        "Síntoma",
        "Registrar lo que notas",
        `
          <datalist id="cycle-symptom-library">${symptomOptions}</datalist>
          <form id="symptom-form" class="stack">
            <div class="field-grid">
              <label><span>Fecha</span><input name="date" type="date" value="${today}" required></label>
              <label><span>Síntoma</span><input name="name" list="cycle-symptom-library" placeholder="Ej. cólicos o dolor ovulatorio" required></label>
            </div>
            <div class="field-grid">
              <label><span>Intensidad</span><input name="intensity" type="number" min="1" max="5" value="3" required></label>
              <label><span>Digestión</span><select name="digestion"><option value="">Opcional</option>${digestionOptions}</select></label>
            </div>
            <div class="field-grid">
              <label><span>Energía</span><select name="energy"><option value="">Opcional</option>${energyOptions}</select></label>
              <label><span>Ánimo</span><select name="mood"><option value="">Opcional</option>${moodOptions}</select></label>
            </div>
            <label><span>Nota</span><input name="note" placeholder="Opcional"></label>
            <button class="primary" type="submit">Guardar síntoma</button>
          </form>
        `
      )}
      ${sectionCard(
        "Medicación",
        "Recordatorio diario",
        `
          <form id="med-form" class="stack">
            <div class="field-grid">
              <label><span>Nombre</span><input name="name" placeholder="Ej. Magnesio" required></label>
              <label><span>Dosis</span><input name="dose" placeholder="Ej. 1 cápsula"></label>
            </div>
            <label><span>Notas</span><input name="notes" placeholder="Horario o aclaración"></label>
            <button class="primary" type="submit">Guardar medicación</button>
          </form>
          <div class="stack stack-tight">${renderMedications(state.medication)}</div>
        `
      )}
    `;
  } else if (currentView === "library") {
    body = `
      ${sectionCard("Historial", "Últimos síntomas", `<div class="stack stack-tight">${renderSymptoms(state.cycle.symptomLog)}</div>`)}
      ${sectionCard("Biblioteca", "Síntomas y familias", `<section class="dashboard-summary compact-metrics">${renderSymptomGroups()}</section>`)}
    `;
  } else {
    body = `
      ${sectionCard(
        "Ciclo",
        "Lectura breve",
        `
          <section class="dashboard-summary compact-metrics feature-metrics-soft">
            ${statCard("Ciclo", state.cycle.periodDays.length, "días")}
            ${statCard("Síntomas", symptomCount, "registros")}
            ${statCard("Medicación", state.medication.meds.length, "items")}
            ${statCard("Fase", health.cycleContext.label, health.dominantSymptoms[0]?.name || "sin patrón")}
          </section>
          <div class="button-row button-row-start button-row-soft">
            <button class="${periodToday ? "primary" : "ghost"} compact" data-action="toggle-period">${periodToday ? "Quitar hoy" : "Marcar hoy"}</button>
          </div>
        `
      )}
      ${sectionCard(
        "Soporte",
        "Lo que conviene mirar",
        `
          <div class="stack stack-tight">
            ${
              suggestions.length
                ? suggestions.map(item => `<article class="entry"><div><p class="entry-title">${item}</p></div></article>`).join("")
                : emptyState("Aún faltan datos para sugerencias por fase.")
            }
          </div>
        `
      )}
    `;
  }

  return `
    <section id="wellbeing-panel" class="panel stack app-feature-shell">
      ${featureHeader("Salud", "Ciclo y síntomas")}
      ${viewSwitcher("wellbeing", currentView, [
        { id: "overview", label: "Resumen" },
        { id: "log", label: "Registrar" },
        { id: "library", label: "Biblioteca" }
      ])}
      <div class="sr-only">
        Fase actual
        Síntomas base y familias operativas
        Sugerencias accionables para hoy y la semana
      </div>
      ${body}
    </section>
  `;
}
