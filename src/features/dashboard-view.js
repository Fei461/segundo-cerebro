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
    ${VARIETY_FAMILY_RULES.map(rule => `<option value="${rule.family}">${rule.family}</option>`).join("")}
  `;
}

function quickMealCapture() {
  return `
    <form id="quick-meal-form" class="stack">
      <div class="field-grid">
        <label><span>Tipo</span><select name="type"><option>Desayuno</option><option selected>Comida</option><option>Cena</option><option>Snack</option></select></label>
        <label><span>Nombre</span><input name="name" placeholder="Ej. bowl, tortilla, yogur" required></label>
      </div>
      <div class="field-grid">
        <label><span>Grupo principal</span><select name="primaryFamily">${familyOptions()}</select></label>
        <label><span>Grupo secundario</span><select name="secondaryFamily">${familyOptions()}</select></label>
      </div>
      <label><span>Postcomida</span><input name="reaction" placeholder="Sensación rápida"></label>
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
        <summary class="disclosure-summary"><div><p class="eyebrow">Opcional</p><h4>Métricas extra</h4></div></summary>
        <div class="stack disclosure-body">
          <div class="field-grid four">
            <label><span>RPE</span><input name="rpe" type="number" min="1" max="10" value="6"></label>
            <label><span>Carga</span><input name="loadKg" type="number" min="0" value="0"></label>
            <label><span>Distancia</span><input name="distanceKm" type="number" step="0.1" min="0" value="0"></label>
            <label><span>Rutina</span><input name="routineName" placeholder="Opcional"></label>
          </div>
        </div>
      </details>
      <button class="primary" type="submit">Guardar entreno rápido</button>
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
      <details class="panel panel-toned disclosure-panel compact-disclosure">
        <summary class="disclosure-summary"><div><p class="eyebrow">Opcional</p><h4>Energía y nota</h4></div></summary>
        <div class="stack disclosure-body">
          <div class="field-grid">
            <label><span>Energía</span><input name="energy" type="number" min="1" max="5" value="3"></label>
            <label><span>Ánimo</span><input name="mood" type="number" min="1" max="5" value="3"></label>
          </div>
          <label><span>Nota</span><input name="note" placeholder="Contexto rápido"></label>
        </div>
      </details>
      <button class="primary" type="submit">Guardar check-in</button>
    </form>
  `;
}

function quickSleepCapture(today) {
  return `
    <form id="quick-sleep-form" class="stack">
      <div class="field-grid">
        <label><span>Fecha</span><input name="date" type="date" value="${today}" required></label>
        <label><span>Horas</span><input name="hours" type="number" step="0.1" min="0" placeholder="Opcional si rellenas horario"></label>
      </div>
      <div class="field-grid">
        <label><span>Hora de acostarte</span><input name="sleepStart" type="time"></label>
        <label><span>Hora de levantarte</span><input name="sleepEnd" type="time"></label>
      </div>
      <div class="field-grid">
        <label><span>Calidad</span><input name="quality" type="number" min="1" max="5" value="3" required></label>
        <label><span>Nota</span><input name="notes" placeholder="Cafeína, estrés..."></label>
      </div>
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
  if (currentCapture === "training") return "Registrar una sesión rápida con lo justo.";
  if (currentCapture === "checkin") return "Guardar un síntoma sin salir de hoy.";
  if (currentCapture === "sleep") return "Apuntar la noche con horario y calidad.";
  return "Guardar una comida por grupos de alimentos.";
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
  if (plannedCount > 0) return `${plannedCount} bloque(s) previstos. Semana ${weeklyPreparation.readinessScore}/100.`;
  if (dailyCommand.loggedMealsToday.length > 0 || dailyCommand.executedSessionsToday.length > 0) return "Ya hay señales de hoy. Solo toca mantener el hilo.";
  return "Empieza con una comida, un check-in o una nota.";
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
      ${shortcutButton("Planner", "nutrition", "plan")}
      ${shortcutButton("Síntoma", "wellbeing", "symptom")}
      ${shortcutButton("Programar entreno", "training", "plan")}
      ${shortcutButton("Registrar sueño", "recovery", "sleep")}
      ${shortcutButton("Reset semanal", "planning", "reset")}
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

function operationalQueue(decisionBoard) {
  const queue = [
    ...decisionBoard.doNow.slice(0, 2),
    ...decisionBoard.captureNow.slice(0, 1),
    ...decisionBoard.lighten.slice(0, 1)
  ];
  return compactBulletList(queue, "Hoy no hay una cola operativa especialmente cargada.");
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
        "Cerrar el día",
        `
          <section class="dashboard-summary compact-metrics feature-metrics-soft">
            ${statCard("Comida", `${dailyCommand.mealProgress.done}/${dailyCommand.mealProgress.total}`, "hecho")}
            ${statCard("Entreno", `${dailyCommand.sessionProgress.done}/${dailyCommand.sessionProgress.total}`, "hecho")}
            ${statCard("Agua", `${dailyCommand.hydrationToday}/${dailyCommand.hydrationGoal}`, "vasos")}
            ${statCard("Revisión", `${weeklyReviewSummary.completion}%`, "semana")}
          </section>
          <div class="button-row button-row-start button-row-soft">
            <button class="primary compact" data-action="add-water">+1 vaso</button>
            <button class="ghost compact" data-action="apply-suggested-meal-slots">Completar comidas</button>
            <button class="ghost compact" data-action="apply-suggested-sessions">Completar entrenos</button>
          </div>
          <article class="entry"><div><p class="entry-title">Dejar el día cerrado sin salir de aquí</p></div></article>
        `,
        "section-card-hero section-card-home"
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
          <article class="entry">
            <div>
              <p class="entry-title">Lectura semanal automática</p>
              <p class="entry-note">${autoSummary.headline}</p>
            </div>
          </article>
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
          <form id="profile-form" class="stack inline-form-soft">
            <div class="field-grid">
              <label><span>Nombre visible</span><input name="displayName" placeholder="Cómo quieres verte aquí" value="${displayName}"></label>
              <label><span>Autobloqueo (min)</span><input name="autoLockMinutes" type="number" min="0" max="120" value="${autoLockMinutes}" required></label>
            </div>
            <p class="muted">Usa 0 para bloquear solo manualmente. Mientras este mismo contexto siga abierto, la app intentará recordarte sin pedir la clave otra vez.</p>
            <button class="primary" type="submit">Guardar ajustes</button>
          </form>
        `,
        "section-card-tinted section-card-home"
      )}
      ${sectionCard(
        "Seguridad",
        "Vault y backup",
        `
          <section class="dashboard-summary compact-metrics feature-metrics-soft">
            ${statCard("Bloqueo", lockLabel, "actual")}
            ${statCard("Último acceso", lastUnlock, "vault")}
            ${statCard("Último backup", lastBackup, "exportado")}
            ${statCard("Última importación", lastImport, "base")}
          </section>
          <article class="entry"><div><p class="entry-title">Cambio de passphrase</p><p class="entry-note">Último cambio: ${lastPassphraseChange}</p></div></article>
          <form id="change-passphrase-form" class="stack inline-form-soft">
            <div class="field-grid">
              <label><span>Nueva passphrase</span><input name="nextPassphrase" type="password" minlength="8" placeholder="Mínimo 8 caracteres" required></label>
              <label><span>Confirmar</span><input name="nextPassphraseConfirm" type="password" minlength="8" placeholder="Repite la clave" required></label>
            </div>
            <button class="primary" type="submit">Cambiar passphrase</button>
          </form>
          <details class="panel panel-toned disclosure-panel compact-disclosure">
            <summary class="disclosure-summary"><div><p class="eyebrow">Backup</p><h4>Exportar o importar</h4></div></summary>
            <div class="stack disclosure-body">
              <form id="backup-export-form" class="stack inline-form-soft">
                <div class="field-grid">
                  <label><span>Passphrase backup</span><input name="backupPassphrase" type="password" minlength="8" placeholder="Clave del archivo" required></label>
                  <label><span>Confirmar</span><input name="backupPassphraseConfirm" type="password" minlength="8" placeholder="Repite la clave" required></label>
                </div>
                <button class="ghost compact" type="submit">Exportar backup cifrado</button>
              </form>
              <form id="backup-import-form" class="stack inline-form-soft">
                <div class="field-grid">
                  <label><span>Passphrase backup</span><input name="backupImportPassphrase" type="password" minlength="8" placeholder="Clave del archivo" required></label>
                  <label class="file-button compact-file auth-file"><input id="import-file-settings" name="backupFile" type="file" accept=".json,application/json" required>Elegir archivo</label>
                </div>
                <p class="muted">La importación reemplaza el contenido actual de este contexto local.</p>
                <button class="ghost compact" type="submit">Importar backup</button>
              </form>
              <button id="reset-vault-button" class="ghost compact" type="button">Restablecer este contexto</button>
            </div>
          </details>
        `,
        "section-card-glass section-card-home-light"
      )}
      ${sectionCard(
        "Notas",
        "Recordatorios rápidos",
        `
          <form id="note-form" class="stack inline-form-soft">
            <label><span>Clave</span><input name="key" placeholder="Ej. hoy o ideas" required></label>
            <label><span>Contenido</span><textarea name="value" rows="4" placeholder="Escribe una nota corta" required></textarea></label>
            <button class="primary" type="submit">Guardar nota</button>
          </form>
          <div class="stack">${noteItems(state.notes)}</div>
        `,
        "section-card-glass section-card-home-light"
      )}
    `;
  } else {
    body = `
      <div class="home-rail-grid home-rail-grid-dual">
        ${sectionCard(
          "Ahora",
          compactFocusTitle(dailyCommand),
          `
            <div class="home-hero-stack">
              <p class="muted">${compactFocusDetail(dailyCommand, weeklyPreparation)}</p>
              <section class="dashboard-summary compact-metrics feature-metrics-soft">
                ${statCard("Comidas", dailyCommand.loggedMealsToday.length, "registradas")}
                ${statCard("Agua", `${dailyCommand.hydrationToday}/${dailyCommand.hydrationGoal}`, "vasos")}
                ${statCard("Entreno", dailyCommand.executedSessionsToday.length, "sesiones")}
                ${statCard("Grupos", familiesToday.length, "cubiertos hoy")}
              </section>
              ${latestSleep ? `<p class="muted">Último sueño: ${latestSleep}</p>` : ""}
              <div class="button-row button-row-start button-row-soft">
                <button class="primary compact" data-action="add-water">+1 vaso</button>
                <button class="ghost compact" type="button" data-action="open-module-view" data-tab="home" data-view="capture">Capturar</button>
                <button class="ghost compact" type="button" data-action="open-module-view" data-tab="home" data-view="review">Cerrar hoy</button>
              </div>
            </div>
          `,
          "section-card-hero section-card-home rail-card"
        )}
        <div class="stack stack-tight home-side-stack">
          ${nextActionCard(dailyCommand, autoSummary)}
          <article class="summary-card summary-card-soft rail-card">
            <p class="eyebrow">Semana</p>
            <p class="entry-title">${weeklyPreparation.headline}</p>
            <p class="entry-note">${autoSummary.reviewItems[0] || "Sigue registrando para afinar la lectura semanal."}</p>
          </article>
        </div>
      </div>
      ${sectionCard(
        "Siguiente",
        "Lo que toca sin ruido",
        `
          ${operationalQueue(decisionBoard)}
          <div class="button-row button-row-start button-row-soft">
            <button class="ghost compact" data-action="apply-suggested-meal-slots">Completar comidas</button>
            <button class="ghost compact" data-action="apply-suggested-sessions">Completar entrenos</button>
          </div>
        `,
        "section-card-glass section-card-home-light"
      )}
      ${sectionCard(
        "Captura rápida",
        "Entrar y registrar",
        `
          <div class="quick-actions-grid">
            ${quickAction("Agua", { type: "add-water" }, "quick-action-water")}
            ${quickAction("Comida", { type: "set-home-capture", capture: "meal" }, "quick-action-food")}
            ${quickAction("Entreno", { type: "set-home-capture", capture: "training" }, "quick-action-train")}
            ${quickAction("Síntoma", { type: "set-home-capture", capture: "checkin" }, "quick-action-health")}
          </div>
          <div class="stack stack-tight">
            <p class="eyebrow">Shortcuts</p>
            ${supportShortcuts()}
          </div>
        `,
        "section-card-glass section-card-home-light"
      )}
      ${sectionCard(
        "Arrastres y lectura",
        "Lo mínimo que conviene mirar",
        `
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
        `,
        "section-card-glass section-card-home-light"
      )}
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
      <div class="sr-only">
        Siguiente paso operativo
        Actualizar previsto vs real sin salir de home
        Guardar comida rápida
        Hacer, suavizar y capturar
        Lectura semanal automática
        Checklist de prueba real
      </div>
      ${body}
    </section>
  `;
}
