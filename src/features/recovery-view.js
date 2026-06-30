import { getWeeklyCalibrationBoard } from "../domain/weekly.js";

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

function recentSleepEntries(entries) {
  return Object.entries(entries || {})
    .sort((left, right) => right[0].localeCompare(left[0]))
    .slice(0, 7);
}

function averageHours(entries) {
  const values = recentSleepEntries(entries).map(([, value]) => Number(value.hours || 0));
  if (values.length === 0) return "0.0";
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
}

function sleepItems(entries) {
  const items = recentSleepEntries(entries);
  if (items.length === 0) {
    return `<p class="muted">Aún no hay noches registradas.</p>`;
  }

  return items
    .map(
      ([date, value]) => `
        <article class="entry">
          <div>
            <p class="entry-title">${date}</p>
            <p class="entry-meta">${Number(value.hours || 0).toFixed(1)} h · calidad ${value.quality || 3}/5</p>
          </div>
          <button class="ghost compact" data-action="delete-sleep" data-date="${date}">Eliminar</button>
        </article>
      `
    )
    .join("");
}

function calibrationDayItems(calibration) {
  if (calibration.dayEntries.length === 0) {
    return `<p class="muted">Aún no hay datos suficientes para recalibrar la semana.</p>`;
  }

  return calibration.dayEntries
    .map(
      day => `
        <article class="entry">
          <div>
            <p class="entry-title">${day.date}</p>
            <p class="entry-meta">${day.status} · presion ${day.pressureScore.toFixed(1)} · sueno ${day.sleepHours ? `${day.sleepHours.toFixed(1)} h` : "sin dato"}</p>
          </div>
        </article>
      `
    )
    .join("");
}

export function renderRecoveryFeature(state) {
  const calibration = getWeeklyCalibrationBoard(state);

  return `
    <section id="recovery-panel" class="panel stack">
      <div class="section-head">
        <div>
          <p class="eyebrow">Revisión</p>
          <h3>Descanso y reajuste</h3>
        </div>
        <p class="muted">Dormir, leer carga y ajustar.</p>
      </div>

      <div class="recovery-focus-grid section-block">
        <section class="subpanel stack rail-card panel-toned recovery-hero-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">Lectura semanal</p>
              <h4>Mapa de presión y recuperación</h4>
            </div>
          </div>
          <section class="recovery-summary compact-metrics">
            <article class="summary-card">
              <p class="eyebrow">Media 7d</p>
              <p class="metric">${averageHours(state.sleepEntries)} h</p>
              <p class="entry-meta">promedio reciente</p>
            </article>
            <article class="summary-card">
              <p class="eyebrow">Registros</p>
              <p class="metric">${Object.keys(state.sleepEntries).length}</p>
              <p class="entry-meta">noches guardadas</p>
            </article>
            <article class="summary-card">
              <p class="eyebrow">Sobrecarga</p>
              <p class="metric">${calibration.overloadedDays}</p>
              <p class="entry-meta">${calibration.watchDays} en vigilancia</p>
            </article>
            <article class="summary-card">
              <p class="eyebrow">Ajuste</p>
              <p class="metric">${calibration.topPressureDay?.date || "estable"}</p>
              <p class="entry-meta">${calibration.nextAdjustment}</p>
            </article>
          </section>
          <div class="button-row">
            <button class="ghost compact" data-action="apply-weekly-calibration-pack">Aplicar recalibración</button>
            <button class="ghost compact" data-action="save-weekly-calibration-note">Guardar nota</button>
          </div>
          ${collapsiblePanel("Detalle", "Días a vigilar", `<div class="stack">${calibrationDayItems(calibration)}</div>`)}
        </section>

        <section class="subpanel stack rail-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">Registrar</p>
              <h4>Nueva noche</h4>
            </div>
          </div>
          ${collapsiblePanel(
            "Sueño",
            "Guardar noche",
            `
              <form id="sleep-form" class="stack">
                <div class="field-grid">
                  <label><span>Fecha</span><input name="date" type="date" value="${todayKey()}" required></label>
                  <label><span>Horas</span><input name="hours" type="number" step="0.1" min="0" value="7.5" required></label>
                </div>
                <div class="field-grid">
                  <label><span>Calidad (1-5)</span><input name="quality" type="number" min="1" max="5" value="3" required></label>
                  <label><span>Nota</span><input name="notes" placeholder="Cafeína, estrés, despertares..."></label>
                </div>
                <button class="primary" type="submit">Guardar noche</button>
              </form>
            `
          )}
        </section>
      </div>

      <section class="fold-grid section-block">
        ${collapsiblePanel("Noches guardadas", "Ver historial reciente", `<div class="stack">${sleepItems(state.sleepEntries)}</div>`)}
      </section>
    </section>
  `;
}
