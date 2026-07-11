import { getWeeklyAutoSummary } from "../domain/insights.js";
import {
  getDailyCommandCenter,
  getTodayDecisionBoard,
  getWeeklyPreparationPack,
  getWeeklyReviewSummary
} from "../domain/weekly.js";
import { localDateKey } from "../domain/date.js";
import { emptyState, featureHeader, sectionCard, viewSwitcher } from "../ui/feature-layout.js";
import { VARIETY_FAMILY_RULES, varietyFamiliesFromText } from "../domain/personal-nutrition.js";

const FAMILY_LABELS = {
  "Cereal/tuberculo": "Cereal / tubérculo",
  "Ave y huevos": "Ave y huevos",
  "Carne roja y cerdo": "Carne roja y cerdo",
  "Pescado y marisco": "Pescado y marisco",
  "Proteina vegetal": "Proteína vegetal",
  Verduras: "Verduras",
  Fruta: "Fruta",
  "Lacteos/alternativos": "Lácteos / alternativos"
};

function todayKey() {
  return localDateKey(new Date());
}

function todayHeadline() {
  const date = new Date();
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${dayNames[date.getDay()]} · ${date.getDate()} ${monthNames[date.getMonth()]}`;
}

function statCard(label, value, detail = "") {
  return `
    <article class="summary-card summary-card-soft">
      <p class="eyebrow">${label}</p>
      <p class="metric">${value}</p>
      ${detail ? `<p class="entry-meta">${detail}</p>` : ""}
    </article>
  `;
}

function quickAction(label, action, tone = "") {
  return `<button class="quick-action-button ${tone}" type="button" data-action="${action.type}"${action.capture ? ` data-capture="${action.capture}"` : ""}>${label}</button>`;
}

function shortcutButton(label, tab, view) {
  return `
    <button class="shortcut-pill" type="button" data-action="open-module-view" data-tab="${tab}" data-view="${view}">
      <span class="module-card-label">${label}</span>
    </button>
  `;
}

function captureSwitcher(current) {
  const items = [
    { id: "meal", label: "Comida" },
    { id: "training", label: "Entreno" },
    { id: "checkin", label: "Síntoma" },
    { id: "sleep", label: "Sueño" }
  ];

  return `
    <nav class="view-switcher compact-switcher" aria-label="Tipo de captura">
      ${items
        .map(
          item => `
            <button
              class="view-switcher-chip${item.id === current ? " is-active" : ""}"
              type="button"
              data-action="set-home-capture"
              data-capture="${item.id}"
              aria-pressed="${item.id === current ? "true" : "false"}"
            >
              ${item.label}
            </button>
          `
        )
        .join("")}
    </nav>
  `;
}

function familyOptions() {
  return `
    <option value="">Sin definir</option>
    ${VARIETY_FAMILY_RULES.map(rule => `<option value="${rule.family}">${FAMILY_LABELS[rule.family] || rule.family}</option>`).join("")}
  `;
}

function quickMealCapture() {
  return `
    <form id="quick-meal-form" class="stack">
      <div class="field-grid">
        <label><span>Tipo</span><select name="type"><option>Desayuno</option><option selected>Comida</option><option>Cena</option><option>Snack</option></select></label>
        <label><span>Nombre</span><input name="name" placeholder="Ej. bowl, tortilla, yogur" required></label>
      </div>
      <label><span>Grupo principal</span><select name="primaryFamily">${familyOptions()}</select></label>
      <details class="panel panel-toned disclosure-panel compact-disclosure">
        <summary class="disclosure-summary"><div><p class="eyebrow">Opcional</p><h4>Más detalle</h4></div></summary>
        <div class="stack disclosure-body">
          <label><span>Grupo secundario</span><select name="secondaryFamily">${familyOptions()}</select></label>
          <label><span>Postcomida</span><input name="reaction" placeholder="Opcional"></label>
        </div>
      </details>
      <button class="primary" type="submit">Guardar comida rápida</button>
    </form>
  `;
}

function quickTrainingCapture(today) {
  return `
    <form id="quick-training-form" class="stack">
      <div class="field-grid">
        <label><span>Fecha</span><input name="date" type="date" value="${today}" required></label>
        <label><span>Tipo</span><input name="type" value="Fuerza" required></label>
      </div>
      <div class="field-grid">
        <label><span>Actividad</span><input name="activity" placeholder="Ej. upper o caminar" required></label>
        <label><span>Duración</span><input name="duration" type="number" min="1" value="45" required></label>
      </div>
      <details class="panel panel-toned disclosure-panel compact-disclosure">
        <summary class="disclosure-summary"><div><p class="eyebrow">Opcional</p><h4>Carga y contexto</h4></div></summary>
        <div class="stack disclosure-body">
          <div class="field-grid four">
            <label><span>RPE</span><input name="rpe" type="number" min="1" max="10" value="6"></label>
            <label><span>Carga</span><input name="loadKg" type="number" min="0" value="0"></label>
            <label><span>Distancia</span><input name="distanceKm" type="number" step="0.1" min="0" value="0"></label>
            <label><span>Rutina</span><input name="routineName" placeholder="Opcional"></label>
          </div>
        </div>
      </details>
      <button class="primary" type="submit">Guardar entreno</button>
    </form>
  `;
}

function quickCheckinCapture() {
  return `
    <form id="quick-checkin-form" class="stack">
      <div class="field-grid">
        <label><span>Síntoma</span><input name="name" placeholder="Ej. fatiga o hinchazón" required></label>
        <label><span>Intensidad</span><input name="intensity" type="number" min="1" max="5" value="3" required></label>
      </div>
      <div class="field-grid">
        <label><span>Energía</span><input name="energy" type="number" min="1" max="5" value="3"></label>
        <label><span>Ánimo</span><input name="mood" type="number" min="1" max="5" value="3"></label>
      </div>
      <label><span>Nota</span><input name="note" placeholder="Contexto rápido"></label>
      <button class="primary" type="submit">Guardar síntoma</button>
    </form>
  `;
}

function quickSleepCapture(today) {
  return `
    <form id="quick-sleep-form" class="stack">
      <div class="field-grid">
        <label><span>Fecha</span><input name="date" type="date" value="${today}" required></label>
        <label><span>Horas</span><input name="hours" type="number" step="0.1" min="0" placeholder="7,5"></label>
      </div>
      <label><span>Calidad</span><input name="quality" type="number" min="1" max="5" value="3" required></label>
      <details class="panel panel-toned disclosure-panel compact-disclosure">
        <summary class="disclosure-summary"><div><p class="eyebrow">Opcional</p><h4>Horario y nota</h4></div></summary>
        <div class="stack disclosure-body">
          <div class="field-grid">
            <label><span>Hora de acostarte</span><input name="sleepStart" type="time"></label>
            <label><span>Hora de levantarte</span><input name="sleepEnd" type="time"></label>
          </div>
          <label><span>Nota</span><input name="notes" placeholder="Cafeína, estrés..."></label>
        </div>
      </details>
      <button class="primary" type="submit">Guardar sueño</button>
    </form>
  `;
}

function todayFoodFamilies(state, today) {
  return Array.from(
    new Set(
      state.nutrition.meals
        .filter(meal => meal.date === today)
        .flatMap(meal =>
          (Array.isArray(meal.items) ? meal.items : []).flatMap(item => {
            const direct = Array.isArray(item.families) ? item.families.filter(Boolean) : [];
            const inferred = varietyFamiliesFromText(`${item.name || ""} ${item.ingredientsText || ""}`.trim());
            return [...direct, ...inferred];
          })
        )
    )
  );
}

function latestSleepContext(state) {
  const entries = Object.entries(state.sleepEntries || {}).sort((left, right) => right[0].localeCompare(left[0]));
  const latest = entries[0]?.[1];
  if (!latest) return "";
  const span = latest.sleepStart && latest.sleepEnd ? ` · ${latest.sleepStart} → ${latest.sleepEnd}` : "";
  return `${Number(latest.hours || 0).toFixed(1)} h${span}`;
}

function captureContext(currentCapture) {
  if (currentCapture === "training") return "Guardar una sesión rápida sin salir de hoy.";
  if (currentCapture === "checkin") return "Registrar un síntoma en menos de un minuto.";
  if (currentCapture === "sleep") return "Apuntar la noche con horario y calidad.";
  return "Registrar una comida por grupos de alimentos.";
}

function renderCaptureBody(currentCapture, today) {
  if (currentCapture === "training") return quickTrainingCapture(today);
  if (currentCapture === "checkin") return quickCheckinCapture();
  if (currentCapture === "sleep") return quickSleepCapture(today);
  return quickMealCapture();
}

function compactFocusTitle(dailyCommand) {
  const plannedCount = dailyCommand.mealProgress.total + dailyCommand.sessionProgress.total;
  if (dailyCommand.blockers.length > 0) return "Bajar fricción hoy";
  if (plannedCount > 0) return "Ejecutar lo previsto";
  if (dailyCommand.loggedMealsToday.length > 0 || dailyCommand.executedSessionsToday.length > 0) return "Cerrar con calma";
  return "Registrar lo mínimo útil";
}

function compactFocusDetail(dailyCommand, weeklyPreparation) {
  const plannedCount = dailyCommand.mealProgress.total + dailyCommand.sessionProgress.total;
  if (plannedCount > 0) return `${plannedCount} bloque(s) previstos · ritmo semanal ${weeklyPreparation.readinessScore}/100`;
  if (dailyCommand.loggedMealsToday.length > 0 || dailyCommand.executedSessionsToday.length > 0) return "Ya hay señales de hoy. Solo toca mantener el hilo.";
  return "Empieza por una comida, un check-in o una nota.";
}

function reviewItems(items) {
  if (!items.length) return emptyState("Nada urgente. Hoy la idea es mantenerlo simple.");
  return items.map(item => `<article class="entry"><div><p class="entry-title">${item}</p></div></article>`).join("");
}

function noteItems(notes) {
  const entries = Object.entries(notes || {})
    .filter(([, value]) => String(value || "").trim())
    .slice(0, 4);
  if (!entries.length) return emptyState("Todavía no has guardado notas rápidas.");
  return entries
    .map(
      ([key, value]) => `
        <article class="entry">
          <div>
            <p class="entry-title">${key}</p>
            <p class="entry-note">${String(value).trim()}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function nextActionCard(dailyCommand, autoSummary) {
  const primary = dailyCommand.topPriority?.title || dailyCommand.focusAreas[0] || "Mantener el día simple";
  const note = autoSummary.watchouts[0] || dailyCommand.blockers[0] || "Sin alertas prioritarias ahora mismo.";
  return `
    <article class="summary-card summary-card-soft rail-card">
      <p class="eyebrow">Siguiente</p>
      <p class="entry-title">${primary}</p>
      <p class="entry-note">${note}</p>
    </article>
  `;
}

function supportShortcuts() {
  return `
    <div class="shortcut-row shortcut-row-scroll">
      ${shortcutButton("Registrar comida", "nutrition", "log")}
      ${shortcutButton("Planner comida", "nutrition", "plan")}
      ${shortcutButton("Síntoma", "wellbeing", "symptom")}
      ${shortcutButton("Programar entreno", "training", "plan")}
      ${shortcutButton("Registrar sueño", "recovery", "sleep")}
      ${shortcutButton("Biblioteca", "library", "add")}
    </div>
  `;
}

function compactBulletList(items, emptyText) {
  if (!items.length) return emptyState(emptyText);
  return `
    <div class="mini-list">
      ${items
        .slice(0, 4)
        .map(item => `<article class="mini-list-item"><span class="mini-list-dot"></span><p class="entry-title">${item}</p></article>`)
        .join("")}
    </div>
  `;
}

function compactSignalColumn(title, items, emptyText) {
  return `
    <section class="subpanel stack summary-card-soft">
      <p class="eyebrow">${title}</p>
      ${compactBulletList(items, emptyText)}
    </section>
  `;
}

function operationalQueue(decisionBoard) {
  const queue = [
    ...decisionBoard.doNow.slice(0, 2),
    ...decisionBoard.captureNow.slice(0, 1),
    ...decisionBoard.lighten.slice(0, 1)
  ];
  return compactBulletList(queue, "Hoy no hay una cola especialmente cargada.");
}

function carryoverPreview(carryovers) {
  if (!carryovers.length) return emptyState("Sin arrastres cercanos. Mejor así.");
  return carryovers
    .slice(0, 3)
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.kind} · ${item.title}</p>
            <p class="entry-meta">${item.date} · ${item.status}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function goalItems(goals) {
  const items = Array.isArray(goals) ? goals : [];
  if (!items.length) return emptyState("Todavía no has guardado objetivos.");
  return items
    .slice(0, 6)
    .map(
      goal => `
        <article class="entry">
          <div>
            <p class="entry-title">${goal.title}</p>
            <p class="entry-meta">${goal.area || "General"}${goal.target ? ` · ${goal.target}` : ""}${goal.completed ? " · cerrado" : " · en curso"}</p>
            ${goal.notes ? `<p class="entry-note">${goal.notes}</p>` : ""}
          </div>
          <div class="button-row">
            <button class="${goal.completed ? "primary" : "ghost"} compact" type="button" data-action="toggle-goal" data-id="${goal.id}">${goal.completed ? "Cerrado" : "Cerrar"}</button>
            <button class="ghost compact" type="button" data-action="delete-goal" data-id="${goal.id}">Eliminar</button>
          </div>
        </article>
      `
    )
    .join("");
}

function habitItems(habits) {
  const items = Array.isArray(habits) ? habits : [];
  if (!items.length) return emptyState("Todavía no has guardado hábitos.");
  return items
    .slice(0, 6)
    .map(
      habit => `
        <article class="entry">
          <div>
            <p class="entry-title">${habit.title}</p>
            <p class="entry-meta">${habit.cadence || "Frecuencia libre"}${habit.activeToday ? " · hecho hoy" : " · pendiente hoy"}</p>
            ${habit.notes ? `<p class="entry-note">${habit.notes}</p>` : ""}
          </div>
          <div class="button-row">
            <button class="${habit.activeToday ? "primary" : "ghost"} compact" type="button" data-action="toggle-habit" data-id="${habit.id}">${habit.activeToday ? "Hecho" : "Marcar"}</button>
            <button class="ghost compact" type="button" data-action="delete-habit" data-id="${habit.id}">Eliminar</button>
          </div>
        </article>
      `
    )
    .join("");
}

function readingSnapshot(state) {
  const books = Array.isArray(state.library?.books) ? state.library.books : [];
  const year = String(new Date().getFullYear());
  const finishedThisYear = books.filter(book => String(book.finishedAt || "").startsWith(year)).length;
  const active = books.filter(book => book.status === "reading").length;
  if (!books.length) {
    return {
      title: "Biblioteca vacía",
      detail: "Todavía no has guardado lecturas."
    };
  }
  if (active > 0) {
    return {
      title: `${active} lectura(s) activas`,
      detail: `${finishedThisYear} libro(s) terminados este año.`
    };
  }
  return {
    title: `${finishedThisYear} libro(s) este año`,
    detail: "Puedes guardar valoración, fecha y notas."
  };
}

function formatDateTimeLabel(value) {
  if (!value) return "Aún no";
  try {
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "Aún no";
  }
}

function readinessTone(score) {
  if (score >= 70) return "Fluido";
  if (score >= 40) return "Intermedio";
  return "Ligero";
}

export function renderDashboardFeature(state, options = {}) {
  const currentView = options.currentView || (options.homeCapture && options.homeCapture !== "meal" ? "capture" : "overview");
  const currentCapture = options.homeCapture || "meal";
  const today = todayKey();
  const dailyCommand = getDailyCommandCenter(state, today);
  const decisionBoard = getTodayDecisionBoard(state, today);
  const weeklyPreparation = getWeeklyPreparationPack(state);
  const weeklyReviewSummary = getWeeklyReviewSummary(state);
  const autoSummary = getWeeklyAutoSummary(state, today);
  const displayName = state.profile.displayName || "";
  const autoLockMinutes = Number(state.appMeta.autoLockMinutes || 0);
  const familiesToday = todayFoodFamilies(state, today);
  const latestSleep = latestSleepContext(state);
  const lockLabel = autoLockMinutes > 0 ? `${autoLockMinutes} min` : "manual";
  const lastUnlock = formatDateTimeLabel(state.appMeta.lastUnlockedAt);
  const lastImport = formatDateTimeLabel(state.appMeta.lastImportAt);
  const lastBackup = formatDateTimeLabel(state.appMeta.lastBackupExportAt);
  const lastPassphraseChange = formatDateTimeLabel(state.appMeta.lastPassphraseChangeAt);
  const reading = readingSnapshot(state);

  let body = "";

  if (currentView === "capture") {
    body = `
      ${sectionCard(
        "Captura",
        "Registrar sin fricción",
        `
          ${captureSwitcher(currentCapture)}
          <p class="muted">${captureContext(currentCapture)}</p>
          <div class="capture-surface compact-surface">
            ${renderCaptureBody(currentCapture, today)}
          </div>
        `,
        "section-card-tinted section-card-home"
      )}
    `;
  } else if (currentView === "review") {
    body = `
      ${sectionCard(
        "Cerrar hoy",
        "Cierre breve",
        `
          <section class="dashboard-summary compact-metrics feature-metrics-soft">
            ${statCard("Comida", `${dailyCommand.mealProgress.done}/${dailyCommand.mealProgress.total}`, "hecho")}
            ${statCard("Entreno", `${dailyCommand.sessionProgress.done}/${dailyCommand.sessionProgress.total}`, "hecho")}
            ${statCard("Agua", `${dailyCommand.hydrationToday}/${dailyCommand.hydrationGoal}`, "vasos")}
            ${statCard("Semana", `${weeklyReviewSummary.completion}%`, "revisión")}
          </section>
          <div class="button-row button-row-start button-row-soft">
            <button class="primary compact" data-action="add-water">+1 vaso</button>
            <button class="ghost compact" data-action="apply-suggested-meal-slots">Completar comidas</button>
            <button class="ghost compact" data-action="apply-suggested-sessions">Completar entrenos</button>
          </div>
        `,
        "section-card-hero section-card-home"
      )}
      ${sectionCard(
        "Lectura",
        "Cómo va la semana",
        `
          <div class="reading-grid reading-grid-triple">
            ${compactSignalColumn("Va bien", autoSummary.highlights, "Aún faltan más registros para una señal positiva clara.")}
            ${compactSignalColumn("Vigilar", autoSummary.watchouts, "No hay alertas fuertes ahora mismo.")}
            ${compactSignalColumn("Revisar", autoSummary.reviewItems, "Todavía no hay una revisión dominante.")}
          </div>
        `,
        "section-card-glass section-card-home-light"
      )}
      ${sectionCard(
        "Guiado",
        "Hacer, suavizar y capturar",
        `
          <div class="reading-grid">
            <section class="subpanel stack summary-card-soft"><p class="eyebrow">Hacer</p>${reviewItems(decisionBoard.doNow)}</section>
            <section class="subpanel stack summary-card-soft"><p class="eyebrow">Suavizar</p>${reviewItems(decisionBoard.lighten)}</section>
            <section class="subpanel stack summary-card-soft"><p class="eyebrow">Capturar</p>${reviewItems(decisionBoard.captureNow)}</section>
          </div>
        `,
        "section-card-glass section-card-home-light"
      )}
    `;
  } else if (currentView === "settings") {
    body = `
      ${sectionCard(
        "Ajustes",
        "Tu base local",
        `
          <section class="dashboard-summary compact-metrics feature-metrics-soft">
            ${statCard("Nombre", displayName || "Tu espacio", "visible")}
            ${statCard("Bloqueo", lockLabel, "actual")}
          </section>
          <details class="panel panel-toned disclosure-panel compact-disclosure">
            <summary class="disclosure-summary"><div><p class="eyebrow">Perfil</p><h4>Editar base personal</h4></div></summary>
            <div class="stack disclosure-body">
              <form id="profile-form" class="stack inline-form-soft">
                <div class="field-grid">
                  <label><span>Nombre visible</span><input name="displayName" placeholder="Cómo quieres verte aquí" value="${displayName}"></label>
                  <label><span>Autobloqueo (min)</span><input name="autoLockMinutes" type="number" min="0" max="120" value="${autoLockMinutes}" required></label>
                </div>
                <p class="muted">Usa 0 para bloquear solo manualmente. Si este contexto sigue abierto, la app intentará recordarte sin pedir la clave otra vez.</p>
                <button class="primary" type="submit">Guardar ajustes</button>
              </form>
            </div>
          </details>
        `,
        "section-card-tinted section-card-home"
      )}
      <details class="panel panel-toned disclosure-panel compact-disclosure">
        <summary class="disclosure-summary"><div><p class="eyebrow">Seguridad</p><h4>Clave y copia</h4></div></summary>
        <div class="stack disclosure-body">
          <section class="dashboard-summary compact-metrics feature-metrics-soft">
            ${statCard("Bloqueo", lockLabel, "actual")}
            ${statCard("Último acceso", lastUnlock, "sesión")}
            ${statCard("Última copia", lastBackup, "exportada")}
            ${statCard("Última importación", lastImport, "base")}
          </section>
          <article class="entry"><div><p class="entry-title">${lastBackup === "Aún no" ? "Copia pendiente" : "Copia disponible"}</p><p class="entry-note">${lastBackup === "Aún no" ? "Conviene exportar una antes de cambiar de contexto o publicar una build nueva." : "Ya existe una copia cifrada exportada desde este contexto."}</p></div></article>
          <article class="entry"><div><p class="entry-title">Cambio de clave</p><p class="entry-note">Último cambio: ${lastPassphraseChange}</p></div></article>
          <details class="panel panel-toned disclosure-panel compact-disclosure">
            <summary class="disclosure-summary"><div><p class="eyebrow">Clave</p><h4>Cambiar clave local</h4></div></summary>
            <div class="stack disclosure-body">
              <form id="change-passphrase-form" class="stack inline-form-soft">
                <div class="field-grid">
                  <label><span>Nueva clave local</span><input name="nextPassphrase" type="password" minlength="8" placeholder="Mínimo 8 caracteres" required></label>
                  <label><span>Confirmar</span><input name="nextPassphraseConfirm" type="password" minlength="8" placeholder="Repite la clave" required></label>
                </div>
                <button class="primary" type="submit">Cambiar clave</button>
              </form>
            </div>
          </details>
          <details class="panel panel-toned disclosure-panel compact-disclosure">
            <summary class="disclosure-summary"><div><p class="eyebrow">Copia</p><h4>Exportar o importar</h4></div></summary>
            <div class="stack disclosure-body">
              <form id="backup-export-form" class="stack inline-form-soft">
                <div class="field-grid">
                  <label><span>Clave del archivo</span><input name="backupPassphrase" type="password" minlength="8" placeholder="Clave del archivo" required></label>
                  <label><span>Confirmar</span><input name="backupPassphraseConfirm" type="password" minlength="8" placeholder="Repite la clave" required></label>
                </div>
                <button class="ghost compact" type="submit">Exportar copia cifrada</button>
              </form>
              <form id="backup-import-form" class="stack inline-form-soft">
                <div class="field-grid">
                  <label><span>Clave del archivo</span><input name="backupImportPassphrase" type="password" minlength="8" placeholder="Clave del archivo" required></label>
                  <label class="file-button compact-file auth-file"><input id="import-file-settings" name="backupFile" type="file" accept=".json,application/json" required>Elegir archivo</label>
                </div>
                <p class="muted">La importación reemplaza el contenido actual de este contexto local.</p>
                <button class="ghost compact" type="submit">Importar copia</button>
              </form>
              <button id="reset-vault-button" class="ghost compact" type="button">Limpiar este contexto</button>
            </div>
          </details>
        </div>
      </details>
      <details class="panel panel-toned disclosure-panel compact-disclosure">
        <summary class="disclosure-summary"><div><p class="eyebrow">Notas</p><h4>Recordatorios rápidos</h4></div></summary>
        <div class="stack disclosure-body">
          <form id="note-form" class="stack inline-form-soft">
            <label><span>Clave</span><input name="key" placeholder="Ej. hoy o ideas" required></label>
            <label><span>Contenido</span><textarea name="value" rows="4" placeholder="Escribe una nota corta" required></textarea></label>
            <button class="primary" type="submit">Guardar nota</button>
          </form>
          <div class="stack">${noteItems(state.notes)}</div>
        </div>
      </details>
      <details class="panel panel-toned disclosure-panel compact-disclosure">
        <summary class="disclosure-summary"><div><p class="eyebrow">Ritmo</p><h4>Objetivos y hábitos</h4></div></summary>
        <div class="stack disclosure-body">
          <div class="reading-grid">
            <section class="subpanel stack summary-card-soft">
              <p class="eyebrow">Objetivo</p>
              <form id="goal-form" class="stack">
                <div class="field-grid">
                  <label><span>Título</span><input name="title" placeholder="Ej. Leer 12 libros" required></label>
                  <label><span>Área</span><input name="area" placeholder="Lectura, salud, trabajo..."></label>
                </div>
                <div class="field-grid">
                  <label><span>Meta</span><input name="target" placeholder="Ej. 12/2026 o 3 veces/semana"></label>
                  <label><span>Nota</span><input name="notes" placeholder="Qué significa cumplirlo"></label>
                </div>
                <button class="primary" type="submit">Guardar objetivo</button>
              </form>
              <div class="stack stack-tight">${goalItems(state.goals)}</div>
            </section>
            <section class="subpanel stack summary-card-soft">
              <p class="eyebrow">Hábito</p>
              <form id="habit-form" class="stack">
                <div class="field-grid">
                  <label><span>Título</span><input name="title" placeholder="Ej. Caminar o leer" required></label>
                  <label><span>Frecuencia</span><input name="cadence" placeholder="Diario, 3/semana..."></label>
                </div>
                <label><span>Nota</span><input name="notes" placeholder="Disparador, contexto o intención"></label>
                <button class="primary" type="submit">Guardar hábito</button>
              </form>
              <div class="stack stack-tight">${habitItems(state.habits)}</div>
            </section>
          </div>
        </div>
      </details>
    `;
  } else {
    body = `
      <div class="stack stack-tight">
        ${sectionCard(
          "Ahora",
          compactFocusTitle(dailyCommand),
          `
            <div class="home-hero-stack">
              <p class="muted">${compactFocusDetail(dailyCommand, weeklyPreparation)}</p>
              <section class="dashboard-summary compact-metrics feature-metrics-soft">
                ${statCard("Ritmo", `${weeklyPreparation.readinessScore}/100`, readinessTone(weeklyPreparation.readinessScore))}
                ${statCard("Comidas", dailyCommand.loggedMealsToday.length, "registradas")}
                ${statCard("Agua", `${dailyCommand.hydrationToday}/${dailyCommand.hydrationGoal}`, "vasos")}
                ${statCard("Entreno", dailyCommand.executedSessionsToday.length, "sesiones")}
              </section>
              ${latestSleep ? `<p class="muted">Último sueño: ${latestSleep}</p>` : ""}
              <div class="button-row button-row-start button-row-soft">
                <button class="ghost compact" type="button" data-action="open-module-view" data-tab="home" data-view="capture">Capturar</button>
                <button class="ghost compact" type="button" data-action="open-module-view" data-tab="nutrition" data-view="log">Comida</button>
                <button class="ghost compact" type="button" data-action="open-module-view" data-tab="home" data-view="review">Cerrar hoy</button>
              </div>
            </div>
          `,
          "section-card-hero section-card-home rail-card"
        )}
        <div class="home-reading-grid">
          ${nextActionCard(dailyCommand, autoSummary)}
          <article class="summary-card summary-card-soft rail-card">
            <p class="eyebrow">Semana</p>
            <p class="entry-title">${weeklyPreparation.headline}</p>
            <p class="entry-note">${autoSummary.reviewItems[0] || "Todo bastante estable por ahora."}</p>
            <p class="entry-note">${reading.title}</p>
          </article>
        </div>
      </div>
      ${sectionCard(
        "Captura rápida",
        "Lo útil al instante",
        `
          <div class="quick-actions-grid">
            ${quickAction("Agua", { type: "add-water" }, "quick-action-water")}
            ${quickAction("Comida", { type: "set-home-capture", capture: "meal" }, "quick-action-food")}
            ${quickAction("Entreno", { type: "set-home-capture", capture: "training" }, "quick-action-train")}
            ${quickAction("Síntoma", { type: "set-home-capture", capture: "checkin" }, "quick-action-health")}
          </div>
          <div class="stack stack-tight home-shortcuts-wrap">${supportShortcuts()}</div>
        `,
        "section-card-glass section-card-home-light"
      )}
      <details class="panel panel-toned compact-vault-bar disclosure-panel">
        <summary class="disclosure-summary">
          <div>
            <p class="eyebrow">Más de hoy</p>
            <h4>Cola, arrastres y revisión</h4>
          </div>
        </summary>
        <div class="stack disclosure-body">
          <div class="stack stack-tight">
            ${operationalQueue(decisionBoard)}
            <div class="button-row button-row-start button-row-soft">
              <button class="ghost compact" data-action="apply-suggested-meal-slots">Comidas</button>
              <button class="ghost compact" data-action="apply-suggested-sessions">Entrenos</button>
            </div>
          </div>
          <div class="home-reading-grid">
            <section class="subpanel stack summary-card-soft">
              <p class="eyebrow">Arrastres</p>
              <div class="stack stack-tight">${carryoverPreview(decisionBoard.carryovers)}</div>
            </section>
            <section class="subpanel stack summary-card-soft">
              <p class="eyebrow">A revisar</p>
              ${compactBulletList(autoSummary.reviewItems, "Todavía no hay una revisión prioritaria clara.")}
            </section>
          </div>
        </div>
      </details>
    `;
  }

  return `
    <section id="home-panel" class="panel stack app-feature-shell">
      ${featureHeader(todayHeadline(), "Tu día", "", { emblem: "◌", emblemTone: "home" })}
      ${viewSwitcher("home", currentView, [
        { id: "overview", label: "Resumen" },
        { id: "capture", label: "Capturar" },
        { id: "review", label: "Cerrar hoy" },
        { id: "settings", label: "Personal" }
      ])}
      ${body}
    </section>
  `;
}
