import { getWeeklyCalibrationBoard } from "../domain/weekly.js";
import { localDateKey } from "../domain/date.js";
import { emptyState, featureHeader, sectionCard, viewSwitcher } from "../ui/feature-layout.js";

function todayKey() {
  return localDateKey(new Date());
}

function recentSleepEntries(entries) {
  return Object.entries(entries || {})
    .sort((left, right) => right[0].localeCompare(left[0]))
    .slice(0, 6);
}

function averageHours(entries) {
  const values = recentSleepEntries(entries).map(([, value]) => Number(value.hours || 0));
  if (!values.length) return "0.0";
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
}

function latestSleepSpan(entries) {
  const latest = recentSleepEntries(entries)[0]?.[1];
  if (!latest) return "Sin datos";
  if (latest.sleepStart && latest.sleepEnd) return `${latest.sleepStart} → ${latest.sleepEnd}`;
  return "Horario pendiente";
}

function latestSleepNote(entries) {
  const latest = recentSleepEntries(entries)[0]?.[1];
  if (!latest?.notes) return "";
  return String(latest.notes).trim();
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

function sleepItems(entries) {
  const items = recentSleepEntries(entries);
  if (!items.length) return emptyState("Aún no hay noches registradas.");
  return items
    .map(
      ([date, value]) => `
        <article class="entry">
          <div>
            <p class="entry-title">${date}</p>
            <p class="entry-meta">
              ${Number(value.hours || 0).toFixed(1)} h · calidad ${value.quality || 3}/5
              ${value.sleepStart || value.sleepEnd ? ` · ${value.sleepStart || "--:--"} → ${value.sleepEnd || "--:--"}` : ""}
            </p>
            ${value.notes ? `<p class="entry-note">${value.notes}</p>` : ""}
          </div>
          <button class="ghost compact" data-action="delete-sleep" data-date="${date}">Eliminar</button>
        </article>
      `
    )
    .join("");
}

function calibrationDayItems(calibration) {
  if (!calibration.dayEntries.length) return emptyState("Aún no hay datos suficientes para esta lectura.");
  return calibration.dayEntries
    .slice(0, 4)
    .map(
      day => `
        <article class="entry">
          <div>
            <p class="entry-title">${day.date}</p>
            <p class="entry-meta">${day.status} · presión ${day.pressureScore.toFixed(1)} · sueño ${day.sleepHours ? `${day.sleepHours.toFixed(1)} h` : "sin dato"}</p>
          </div>
        </article>
      `
    )
    .join("");
}

export function renderRecoveryFeature(state, options = {}) {
  const currentView = options.currentView || "overview";
  const calibration = getWeeklyCalibrationBoard(state);

  let body = "";

  if (currentView === "sleep") {
    body = `
      ${sectionCard(
        "Registrar",
        "Guardar noche",
        `
          <form id="sleep-form" class="stack">
            <div class="field-grid">
              <label><span>Fecha</span><input name="date" type="date" value="${todayKey()}" required></label>
              <label><span>Horas</span><input name="hours" type="number" step="0.1" min="0" placeholder="Opcional si rellenas horario"></label>
            </div>
            <div class="field-grid">
              <label><span>Hora de acostarte</span><input name="sleepStart" type="time"></label>
              <label><span>Hora de levantarte</span><input name="sleepEnd" type="time"></label>
            </div>
            <label><span>Nota</span><input name="notes" placeholder="Cafeína, estrés, despertares..."></label>
            <div class="field-grid">
              <label><span>Calidad (1-5)</span><input name="quality" type="number" min="1" max="5" value="3" required></label>
            </div>
            <button class="primary" type="submit">Guardar noche</button>
          </form>
        `,
        "section-card-tinted section-card-recovery"
      )}
    `;
  } else if (currentView === "history") {
    body = sectionCard("Historial", "Noches recientes", `<div class="stack stack-tight">${sleepItems(state.sleepEntries)}</div>`, "section-card-glass section-card-recovery-light");
  } else {
    body = `
      ${sectionCard(
        "Semana",
        "Descanso y ajuste",
        `
          <section class="dashboard-summary compact-metrics feature-metrics-soft">
            ${statCard("Media 7d", `${averageHours(state.sleepEntries)} h`, "promedio")}
            ${statCard("Registros", Object.keys(state.sleepEntries).length, "noches")}
            ${statCard("Horario", latestSleepSpan(state.sleepEntries), "última noche")}
            ${statCard("Vigilancia", calibration.watchDays, "días")}
          </section>
          ${latestSleepNote(state.sleepEntries) ? `<p class="muted">Última nota: ${latestSleepNote(state.sleepEntries)}</p>` : ""}
          <div class="button-row button-row-start button-row-soft">
            <button class="ghost compact" type="button" data-action="open-module-view" data-tab="recovery" data-view="sleep">Registrar</button>
            <button class="primary compact" data-action="apply-weekly-calibration-pack">Ajustar semana</button>
          </div>
        `,
        "section-card-hero section-card-recovery"
      )}
      <div class="planning-focus-grid planning-focus-grid-compact">
        ${sectionCard("Detalle", "Días a mirar", `<div class="stack stack-tight">${calibrationDayItems(calibration)}</div>`, "section-card-glass section-card-recovery-light")}
        ${sectionCard("Historial", "Noches recientes", `<div class="stack stack-tight">${sleepItems(state.sleepEntries).split("</article>").slice(0, 3).join("</article>")}</div>`, "section-card-glass section-card-recovery-light")}
      </div>
    `;
  }

  return `
    <section id="recovery-panel" class="panel stack app-feature-shell">
      ${featureHeader("Sueño", "Dormir y ajustar", "", { emblem: "☾", emblemTone: "recovery" })}
      ${viewSwitcher("recovery", currentView, [
        { id: "overview", label: "Resumen" },
        { id: "sleep", label: "Registrar" },
        { id: "history", label: "Historial" }
      ])}
      <div class="sr-only">Mapa de presión y recuperación</div>
      ${body}
    </section>
  `;
}
