import { getWeeklyCalibrationBoard } from "../../domain/weekly.js";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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
    return `<p class="muted">Aun no hay noches registradas.</p>`;
  }

  return items
    .map(
      ([date, value]) => `
        <article class="entry">
          <div>
            <p class="entry-title">${date}</p>
            <p class="entry-meta">${Number(value.hours || 0).toFixed(1)} h · calidad ${value.quality || 3}/5</p>
            ${value.notes ? `<p class="entry-note">${value.notes}</p>` : ""}
          </div>
          <button class="ghost compact" data-action="delete-sleep" data-date="${date}">Eliminar</button>
        </article>
      `
    )
    .join("");
}

function calibrationDayItems(calibration) {
  if (calibration.dayEntries.length === 0) {
    return `<p class="muted">Aun no hay datos suficientes para recalibrar la semana.</p>`;
  }

  return calibration.dayEntries
    .map(
      day => `
        <article class="entry">
          <div>
            <p class="entry-title">${day.date}</p>
            <p class="entry-meta">${day.status} · presion ${day.pressureScore.toFixed(1)} · sueno ${day.sleepHours ? `${day.sleepHours.toFixed(1)} h` : "sin dato"}</p>
            <p class="entry-note">${day.recommendation}</p>
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
          <p class="eyebrow">Recuperacion migrada</p>
          <h3>Sueno y recalibracion</h3>
        </div>
        <p class="muted">El descanso ya no se registra aislado: empieza a usarse para leer la presion real de la semana.</p>
      </div>

      <section class="recovery-summary">
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
          <p class="eyebrow">Dias sobrecargados</p>
          <p class="metric">${calibration.overloadedDays}</p>
          <p class="entry-meta">${calibration.watchDays} en vigilancia</p>
        </article>
        <article class="summary-card">
          <p class="eyebrow">Ajuste clave</p>
          <p class="metric">${calibration.topPressureDay?.date || "estable"}</p>
          <p class="entry-meta">${calibration.nextAdjustment}</p>
        </article>
      </section>

      <div class="planning-grid">
        <section class="subpanel stack">
          <div class="section-head">
            <div>
              <p class="eyebrow">Nueva noche</p>
              <h4>Registrar sueno</h4>
            </div>
          </div>
          <form id="sleep-form" class="stack">
            <div class="field-grid">
              <label><span>Fecha</span><input name="date" type="date" value="${todayKey()}" required></label>
              <label><span>Horas</span><input name="hours" type="number" step="0.1" min="0" value="7.5" required></label>
            </div>
            <div class="field-grid">
              <label><span>Calidad (1-5)</span><input name="quality" type="number" min="1" max="5" value="3" required></label>
              <label><span>Hora de dormir</span><input name="sleepStart" type="time"></label>
            </div>
            <div class="field-grid">
              <label><span>Hora de despertar</span><input name="sleepEnd" type="time"></label>
              <label><span>Notas</span><input name="notes" placeholder="Cafeina, estres, despertares..."></label>
            </div>
            <button class="primary" type="submit">Guardar noche</button>
          </form>
          <div class="stack">${sleepItems(state.sleepEntries)}</div>
        </section>

        <section class="subpanel stack">
          <div class="section-head">
            <div>
              <p class="eyebrow">Lectura semanal</p>
              <h4>Mapa de presion y recuperacion</h4>
            </div>
          </div>
          <div class="button-row">
            <button class="ghost compact" data-action="apply-weekly-calibration-pack">Aplicar recalibracion</button>
            <button class="ghost compact" data-action="save-weekly-calibration-note">Guardar nota</button>
          </div>
          <div class="stack">${calibrationDayItems(calibration)}</div>
        </section>
      </div>
    </section>
  `;
}
