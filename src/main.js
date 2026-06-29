import { createDefaultState } from "./domain/schema.js";
import {
  canonicalizeIngredientName,
  getWeeklyNutritionPrepBoard,
  varietyFamiliesFromText
} from "./domain/personal-nutrition.js";
import {
  applyLoggedMealToPlans,
  applyLoggedSessionToPlans,
  buildLegacyMealPlan,
  getPlannedMeals,
  getPlannedMealsForDate,
  getPlannedSessions,
  removePlannedMeal,
  removePlannedSession,
  replacePlannedMeals,
  replacePlannedMeal,
  replacePlannedSessions,
  replacePlannedSession
} from "./domain/plans.js";
import {
  addWeeklyTasks,
  applyWeeklyResetRoutine,
  currentWeekStartKey,
  ensureWeeklyResetBlock,
  getWeeklyCalibrationBoard,
  getSuggestedWeeklyTasks,
  getSuggestedWeeklySessions,
  getWeeklyPreparationPack,
  getWeeklyChecklist,
  toggleWeeklyReviewStep,
  replaceWeeklyChecklist
} from "./domain/weekly.js";
import { createEncryptedBackup, importEncryptedBackup } from "./storage/backup.js";
import { importLegacyPayload } from "./storage/legacy-import.js";
import { SecureStore } from "./storage/secure-store.js";
import { renderApp } from "./ui/app-shell.js";

const AUTOLOCK_MINUTES = 5;
const secureStore = new SecureStore();
const appElement = document.getElementById("app");

const viewModel = {
  mode: "loading",
  state: createDefaultState(),
  currentTab: "home",
  status: "",
  hasVault: false,
  lockMinutes: AUTOLOCK_MINUTES,
  fatalError: "",
  runtime: {
    isStandalone: false,
    isOnline: true,
    hasServiceWorker: false
  }
};

let autolockTimer = null;
let statusTimer = null;

function setLockMinutesFromState(state) {
  viewModel.lockMinutes = Number(state?.appMeta?.autoLockMinutes || AUTOLOCK_MINUTES);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function todayDayLabel() {
  return ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"][new Date().getDay()];
}

function updateRuntimeStatus() {
  viewModel.runtime = {
    isStandalone:
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator?.standalone === true,
    isOnline: navigator.onLine,
    hasServiceWorker: "serviceWorker" in navigator
  };
}

async function persistState(nextState, successMessage = "") {
  viewModel.state = await secureStore.saveState(nextState);
  setLockMinutesFromState(viewModel.state);
  if (secureStore.isUnlocked()) {
    scheduleAutolock();
  }
  if (successMessage) {
    setStatus(successMessage);
  } else {
    paint();
  }
}

function numberValue(value) {
  return Number(value || 0);
}

function parseRecipeIngredients(rawText) {
  return rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [name, calories, protein, carbs, fat] = line.split("|").map(part => part.trim());
      const canonicalName = canonicalizeIngredientName(name);
      return {
        name,
        canonicalName,
        families: varietyFamiliesFromText(canonicalName || name),
        calories: numberValue(calories),
        protein: numberValue(protein),
        carbs: numberValue(carbs),
        fat: numberValue(fat)
      };
    });
}

function totalsFromIngredients(items) {
  return items.reduce(
    (accumulator, item) => ({
      calories: accumulator.calories + numberValue(item.calories),
      protein: accumulator.protein + numberValue(item.protein),
      carbs: accumulator.carbs + numberValue(item.carbs),
      fat: accumulator.fat + numberValue(item.fat)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function recipeMetaFromIngredients(ingredients, servings) {
  const canonicalIngredients = Array.from(
    new Set(
      ingredients
        .map(item => item.canonicalName || canonicalizeIngredientName(item.name))
        .filter(Boolean)
    )
  );

  const familyCoverage = Array.from(
    new Set(
      ingredients.flatMap(item => Array.isArray(item.families) ? item.families : varietyFamiliesFromText(item.name))
    )
  ).sort();

  const totals = totalsFromIngredients(ingredients);
  return {
    canonicalIngredients,
    familyCoverage,
    perServing: {
      calories: Math.round(totals.calories / servings),
      protein: Math.round(totals.protein / servings),
      carbs: Math.round(totals.carbs / servings),
      fat: Math.round(totals.fat / servings)
    }
  };
}

function findRecipe(recipeId) {
  return viewModel.state.recipes.find(recipe => String(recipe.id) === String(recipeId));
}

async function addMealEntry(payload) {
  const reaction = Array.isArray(payload.reaction)
    ? payload.reaction.filter(Boolean)
    : String(payload.reaction || "")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
  const mealEntry = {
    id: Date.now() + Math.random(),
    date: todayKey(),
    type: payload.type,
    items: [payload.item],
    totals: payload.totals,
    reaction
  };

  const nextState = applyLoggedMealToPlans({
    ...viewModel.state,
    nutrition: {
      ...viewModel.state.nutrition,
      meals: [
        ...viewModel.state.nutrition.meals,
        mealEntry
      ]
    }
  }, mealEntry);

  await persistState(nextState, "Comida guardada.");
}

async function logRecipeToToday(recipeId) {
  const recipe = findRecipe(recipeId);
  if (!recipe) return;

  const perServing = {
    calories: Math.round(recipe.totals.calories / recipe.servings),
    protein: Math.round(recipe.totals.protein / recipe.servings),
    carbs: Math.round(recipe.totals.carbs / recipe.servings),
    fat: Math.round(recipe.totals.fat / recipe.servings)
  };

  await addMealEntry({
    type: "Receta",
    item: { name: recipe.name, ...perServing, recipeId: recipe.id },
    totals: perServing
  });
}

async function logPlannedDay(date) {
  if (date !== todayKey()) {
    setStatus("Solo se loguean automaticamente los planes del dia de hoy.");
    return;
  }

  const entries = getPlannedMealsForDate(viewModel.state, date);

  if (entries.length === 0) {
    setStatus("No hay plan guardado para ese dia.");
    return;
  }

  const newMeals = entries.map(item => {
    const recipe = item.recipeId ? findRecipe(item.recipeId) : null;
    const totals = recipe
      ? {
          calories: Math.round(recipe.totals.calories / recipe.servings),
          protein: Math.round(recipe.totals.protein / recipe.servings),
          carbs: Math.round(recipe.totals.carbs / recipe.servings),
          fat: Math.round(recipe.totals.fat / recipe.servings)
        }
      : {
          calories: numberValue(item.calories),
          protein: numberValue(item.protein),
          carbs: numberValue(item.carbs),
          fat: numberValue(item.fat)
        };

    return {
      id: Date.now() + Math.random(),
      date,
      type: item.slot,
      items: [{ name: item.name, ...totals, recipeId: item.recipeId || null }],
      totals,
      reaction: []
    };
  });

  const plans = getPlannedMealsForDate(viewModel.state, date).reduce((accumulator, meal) => {
    accumulator[String(meal.id)] = { ...meal, status: "done" };
    return accumulator;
  }, {});

  const updatedPlanMeals = getPlannedMeals(viewModel.state).map(meal =>
    plans[String(meal.id)] ? plans[String(meal.id)] : meal
  );

  await persistState(
    {
      ...viewModel.state,
      plans: {
        ...(viewModel.state.plans || {}),
        meals: updatedPlanMeals
      },
      mealPlan: buildLegacyMealPlan(updatedPlanMeals),
      nutrition: {
        ...viewModel.state.nutrition,
        meals: [...viewModel.state.nutrition.meals, ...newMeals]
      }
    },
    "Plan del dia registrado en el log."
  );
}

async function addTrainingSession(payload) {
  const sessionEntry = {
    id: Date.now() + Math.random(),
    ...payload
  };

  const nextState = applyLoggedSessionToPlans({
    ...viewModel.state,
    training: {
      ...viewModel.state.training,
      sessions: [
        ...viewModel.state.training.sessions,
        sessionEntry
      ]
    }
  }, sessionEntry);

  await persistState(nextState, "Sesion guardada.");
}

async function addRoutine(payload) {
  const nextState = {
    ...viewModel.state,
    training: {
      ...viewModel.state.training,
      routines: [
        ...viewModel.state.training.routines,
        {
          id: Date.now() + Math.random(),
          ...payload
        }
      ]
    }
  };

  await persistState(nextState, "Rutina guardada.");
}

async function addPlannedSession(payload) {
  const plannedSession = {
    id: Date.now() + Math.random(),
    status: payload.status || "planned",
    ...payload
  };

  await persistState(replacePlannedSession(viewModel.state, plannedSession), "Sesion programada.");
}

function cyclePlanStatus(currentStatus) {
  const orderedStatuses = ["planned", "done", "partial", "skipped"];
  const index = orderedStatuses.indexOf(currentStatus);
  return orderedStatuses[(index + 1) % orderedStatuses.length];
}

async function addWeeklyTask(payload) {
  const weekKey = currentWeekStartKey();
  const currentChecklist = getWeeklyChecklist(viewModel.state, weekKey);
  const nextState = replaceWeeklyChecklist(
    {
      ...viewModel.state,
      weekly: {
        ...(viewModel.state.weekly || {}),
        resetDay: payload.resetDay
      }
    },
    weekKey,
    [
      ...currentChecklist,
      {
        id: Date.now() + Math.random(),
        title: payload.title,
        done: false
      }
    ]
  );

  await persistState(nextState, "Checklist semanal guardada.");
}

async function addSuggestedWeeklyTasks(titles) {
  const weekKey = currentWeekStartKey();
  const nextState = addWeeklyTasks(
    {
      ...viewModel.state,
      weekly: {
        ...(viewModel.state.weekly || {}),
        resetDay: viewModel.state.weekly?.resetDay || "Domingo"
      }
    },
    weekKey,
    titles
  );

  if (nextState === viewModel.state) {
    setStatus("No habia sugerencias nuevas que anadir.");
    return;
  }

  await persistState(nextState, "Sugerencias anadidas al reset semanal.");
}

async function ensureResetBlockForWeek() {
  const nextState = ensureWeeklyResetBlock(viewModel.state);
  if (nextState === viewModel.state) {
    setStatus("El bloque de reset semanal ya existe.");
    return;
  }

  await persistState(nextState, "Bloque de reset semanal creado.");
}

async function applyResetRoutine() {
  const nextState = applyWeeklyResetRoutine(viewModel.state);
  if (nextState === viewModel.state) {
    setStatus("No habia cambios nuevos para aplicar en el reset semanal.");
    return;
  }

  await persistState(nextState, "Reset semanal aplicado con tareas y bloque sugerido.");
}

async function applySuggestedMealSlots() {
  const suggestedMeals = getWeeklyPreparationPack(viewModel.state).suggestedMealSlots;
  if (suggestedMeals.length === 0) {
    setStatus("No hay huecos de comida pendientes de completar.");
    return;
  }

  const nextState = replacePlannedMeals(
    viewModel.state,
    suggestedMeals.map(meal => ({
      ...meal,
      id: Date.now() + Math.random() + Number.parseInt(String(meal.date).replaceAll("-", ""), 10)
    }))
  );

  await persistState(nextState, "Huecos de comida completados con sugerencias.");
}

async function applySuggestedSessions() {
  const suggestedSessions = getSuggestedWeeklySessions(viewModel.state);
  if (suggestedSessions.length === 0) {
    setStatus("No hay huecos claros de entreno por completar.");
    return;
  }

  const nextState = replacePlannedSessions(
    viewModel.state,
    suggestedSessions.map(session => ({
      ...session,
      id: Date.now() + Math.random() + Number.parseInt(String(session.date).replaceAll("-", ""), 10)
    }))
  );

  await persistState(nextState, "Sesiones futuras sugeridas anadidas.");
}

async function toggleReviewStep(stepKey) {
  if (!stepKey) return;
  const weekKey = currentWeekStartKey();
  const nextState = toggleWeeklyReviewStep(viewModel.state, weekKey, stepKey);
  await persistState(nextState, "Revision semanal actualizada.");
}

async function togglePeriodToday() {
  const today = todayKey();
  const exists = viewModel.state.cycle.periodDays.includes(today);
  const periodDays = exists
    ? viewModel.state.cycle.periodDays.filter(day => day !== today)
    : [...viewModel.state.cycle.periodDays, today].sort();

  await persistState(
    {
      ...viewModel.state,
      cycle: {
        ...viewModel.state.cycle,
        periodDays
      }
    },
    exists ? "Dia de periodo eliminado." : "Dia de periodo registrado."
  );
}

async function addSymptom(payload) {
  const existing = viewModel.state.cycle.symptomLog[payload.date] || [];
  const nextState = {
    ...viewModel.state,
    cycle: {
      ...viewModel.state.cycle,
      symptomLog: {
        ...viewModel.state.cycle.symptomLog,
        [payload.date]: [...existing, payload]
      }
    }
  };

  await persistState(nextState, "Sintoma guardado.");
}

async function setPlannedMealStatus(mealId, status) {
  const meal = getPlannedMeals(viewModel.state).find(entry => String(entry.id) === String(mealId));
  if (!meal) return;
  await persistState(
    replacePlannedMeal(viewModel.state, {
      ...meal,
      status
    }),
    "Estado de la comida planificada actualizado."
  );
}

async function setPlannedSessionStatus(sessionId, status) {
  const session = getPlannedSessions(viewModel.state).find(entry => String(entry.id) === String(sessionId));
  if (!session) return;
  await persistState(
    replacePlannedSession(viewModel.state, {
      ...session,
      status
    }),
    "Estado de la sesion planificada actualizado."
  );
}

async function addMedication(payload) {
  const nextState = {
    ...viewModel.state,
    medication: {
      ...viewModel.state.medication,
      meds: [
        ...viewModel.state.medication.meds,
        {
          id: Date.now() + Math.random(),
          ...payload
        }
      ]
    }
  };

  await persistState(nextState, "Medicacion guardada.");
}

async function toggleMedicationToday(medId) {
  const key = todayKey();
  const todayLog = viewModel.state.medication.log[key] || [];
  const exists = todayLog.includes(medId);
  const nextLog = exists ? todayLog.filter(id => id !== medId) : [...todayLog, medId];

  await persistState(
    {
      ...viewModel.state,
      medication: {
        ...viewModel.state.medication,
        log: {
          ...viewModel.state.medication.log,
          [key]: nextLog
        }
      }
    },
    exists ? "Toma desmarcada." : "Toma registrada."
  );
}

async function addEvent(payload) {
  await persistState(
    {
      ...viewModel.state,
      calendar: {
        ...viewModel.state.calendar,
        events: [...viewModel.state.calendar.events, { id: Date.now() + Math.random(), ...payload }]
      }
    },
    "Evento guardado."
  );
}

function requireText(value, label) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(`Falta ${label}.`);
  }
  return normalized;
}

function requireNumberInRange(value, label, { min = -Infinity, max = Infinity } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} no es valido.`);
  }
  return parsed;
}

function parseImportedFile(rawText) {
  const parsed = JSON.parse(rawText);
  return parsed;
}

function mealPayloadFromFormData(formData) {
  const item = {
    name: requireText(formData.get("name"), "nombre de la comida"),
    calories: requireNumberInRange(formData.get("calories"), "calorias", { min: 0 }),
    protein: requireNumberInRange(formData.get("protein"), "proteina", { min: 0 }),
    carbs: requireNumberInRange(formData.get("carbs"), "carbohidratos", { min: 0 }),
    fat: requireNumberInRange(formData.get("fat"), "grasas", { min: 0 })
  };

  return {
    type: requireText(formData.get("type"), "tipo de comida"),
    item,
    totals: { ...item },
    reaction: String(formData.get("reaction") || "")
  };
}

function trainingPayloadFromFormData(formData) {
  return {
    date: requireText(formData.get("date"), "fecha del entreno"),
    type: requireText(formData.get("type"), "tipo de entreno"),
    activity: requireText(formData.get("activity"), "actividad"),
    duration: requireNumberInRange(formData.get("duration"), "duracion", { min: 1, max: 600 }),
    rpe: requireNumberInRange(formData.get("rpe"), "RPE", { min: 1, max: 10 }),
    loadKg: requireNumberInRange(formData.get("loadKg"), "carga", { min: 0 }),
    distanceKm: requireNumberInRange(formData.get("distanceKm"), "distancia", { min: 0 }),
    routineName: String(formData.get("routineName") || "").trim(),
    preEnergy: requireNumberInRange(formData.get("preEnergy"), "energia previa", { min: 1, max: 5 }),
    recoveryScore: requireNumberInRange(formData.get("recoveryScore"), "recuperacion", { min: 1, max: 5 }),
    sorenessScore: requireNumberInRange(formData.get("sorenessScore"), "molestias", { min: 1, max: 5 }),
    notes: String(formData.get("notes") || "").trim()
  };
}

async function addScheduleBlock(payload) {
  await persistState(
    {
      ...viewModel.state,
      schedule: {
        ...viewModel.state.schedule,
        blocks: [...viewModel.state.schedule.blocks, { id: Date.now() + Math.random(), ...payload }]
      }
    },
    "Bloque guardado."
  );
}

async function createSupportBlock(kind) {
  const day = todayDayLabel();
  const templates = {
    recovery: {
      title: "Recuperacion",
      day,
      start: "21:00",
      end: "21:30",
      category: "Recuperacion"
    },
    "meal-prep": {
      title: "Meal prep express",
      day,
      start: "20:00",
      end: "21:00",
      category: "Nutricion"
    },
    focus: {
      title: "Ajuste de agenda",
      day,
      start: "18:30",
      end: "19:00",
      category: "Planificacion"
    }
  };

  const template = templates[kind];
  if (!template) return;

  const exists = viewModel.state.schedule.blocks.some(
    block =>
      String(block.title || "").trim() === template.title &&
      String(block.day || "").trim() === template.day &&
      String(block.start || "").trim() === template.start
  );

  if (exists) {
    setStatus("Ese bloque de soporte ya existe hoy.");
    return;
  }

  await addScheduleBlock(template);
}

async function addSleepEntry(payload) {
  await persistState(
    {
      ...viewModel.state,
      sleepEntries: {
        ...viewModel.state.sleepEntries,
        [payload.date]: payload
      }
    },
    "Sueño guardado."
  );
}

async function saveNoteEntry(key, value) {
  await persistState(
    {
      ...viewModel.state,
      notes: {
        ...viewModel.state.notes,
        [key]: value
      }
    },
    "Nota guardada."
  );
}

function weeklyNutritionPrepState(state) {
  const startKey = currentWeekStartKey();
  const start = new Date(startKey);
  const weekKeys = new Set();
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    weekKeys.add(date.toISOString().slice(0, 10));
  }
  return getWeeklyNutritionPrepBoard({
    plannedMeals: getPlannedMeals(state).filter(meal => weekKeys.has(meal.date)),
    loggedMeals: state.nutrition.meals.filter(meal => weekKeys.has(meal.date)),
    recipes: state.recipes
  });
}

async function saveWeeklyNutritionNotes() {
  const weekKey = currentWeekStartKey();
  const prepBoard = weeklyNutritionPrepState(viewModel.state);
  const nextState = {
    ...viewModel.state,
    notes: {
      ...viewModel.state.notes,
      [`semana-${weekKey}-compra`]: prepBoard.shoppingNote,
      [`semana-${weekKey}-meal-prep`]: prepBoard.prepNote
    }
  };
  await persistState(nextState, "Notas semanales de compra y meal prep guardadas.");
}

async function applyNutritionPrepPack() {
  const weekKey = currentWeekStartKey();
  const prepBoard = weeklyNutritionPrepState(viewModel.state);
  const withTasks = addWeeklyTasks(viewModel.state, weekKey, prepBoard.checklistTitles);
  const nextState = {
    ...withTasks,
    notes: {
      ...(withTasks.notes || {}),
      [`semana-${weekKey}-compra`]: prepBoard.shoppingNote,
      [`semana-${weekKey}-meal-prep`]: prepBoard.prepNote
    }
  };

  if (nextState === viewModel.state) {
    setStatus("El pack nutricional ya estaba aplicado.");
    return;
  }

  await persistState(nextState, "Pack nutricional semanal aplicado.");
}

async function saveWeeklyCalibrationNote() {
  const weekKey = currentWeekStartKey();
  const calibration = getWeeklyCalibrationBoard(viewModel.state);
  const nextState = {
    ...viewModel.state,
    notes: {
      ...viewModel.state.notes,
      [`semana-${weekKey}-recalibracion`]: calibration.note
    }
  };
  await persistState(nextState, "Nota de recalibracion semanal guardada.");
}

async function applyWeeklyCalibrationPack() {
  const weekKey = currentWeekStartKey();
  const calibration = getWeeklyCalibrationBoard(viewModel.state);
  const withTasks = addWeeklyTasks(viewModel.state, weekKey, calibration.suggestedTasks);
  const nextState = {
    ...withTasks,
    notes: {
      ...(withTasks.notes || {}),
      [`semana-${weekKey}-recalibracion`]: calibration.note
    }
  };

  await persistState(nextState, "Recalibracion semanal aplicada.");
}

function setStatus(message) {
  if (statusTimer) window.clearTimeout(statusTimer);
  viewModel.status = message;
  paint();
  if (message) {
    statusTimer = window.setTimeout(() => {
      viewModel.status = "";
      paint();
    }, 2600);
  }
}

function clearStatus() {
  viewModel.status = "";
  paint();
}

function formatRuntimeError(error) {
  if (!error) return "Error desconocido al arrancar la app.";
  if (error instanceof Error) return error.message || "Error desconocido al arrancar la app.";
  return String(error);
}

function renderFatalApp(message) {
  appElement.innerHTML = `
    <section class="panel stack fatal-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Recuperacion</p>
          <h2>La app no ha podido arrancar bien</h2>
        </div>
      </div>
      <p class="muted">
        No deberias quedarte con una pantalla en blanco. Este aviso deja visible el problema para que podamos corregirlo sin perder tiempo.
      </p>
      <article class="entry">
        <div>
          <p class="entry-title">Detalle tecnico</p>
          <p class="entry-note">${message}</p>
        </div>
      </article>
      <div class="button-row">
        <button class="primary" type="button" data-action="reload-app">Recargar app</button>
      </div>
    </section>
  `;

  const reloadButton = appElement.querySelector("[data-action='reload-app']");
  if (reloadButton) {
    reloadButton.addEventListener("click", () => window.location.reload());
  }
}

function showFatalError(error) {
  viewModel.mode = "fatal";
  viewModel.fatalError = formatRuntimeError(error);
  renderFatalApp(viewModel.fatalError);
}

function paint() {
  if (viewModel.mode === "fatal") {
    renderFatalApp(viewModel.fatalError || "Error desconocido al arrancar la app.");
    return;
  }
  renderApp(appElement, viewModel);
  wireUi();
}

function scheduleAutolock() {
  if (autolockTimer) window.clearTimeout(autolockTimer);
  autolockTimer = window.setTimeout(() => {
    secureStore.lock();
    viewModel.mode = "locked";
    setStatus("La sesion se ha bloqueado por inactividad.");
  }, viewModel.lockMinutes * 60 * 1000);
}

function resetActivityClock() {
  if (secureStore.isUnlocked()) {
    scheduleAutolock();
  }
}

async function exportEncryptedBackup() {
  const state = secureStore.getSessionState();
  if (!state) return;

  const passphrase = window.prompt("Introduce una passphrase para cifrar este backup:");
  if (!passphrase) {
    setStatus("Exportacion cancelada.");
    return;
  }

  const backup = await createEncryptedBackup(state, passphrase);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "segundo-cerebro-backup.json";
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus("Backup cifrado generado.");
}

async function handleLegacyFile(file) {
  const rawText = await file.text();
  const parsed = parseImportedFile(rawText);
  let importedState;

  if (parsed.kind === "encrypted-backup-v1") {
    const passphrase = window.prompt("Introduce la passphrase del backup cifrado:");
    if (!passphrase) {
      throw new Error("Importacion cancelada.");
    }
    importedState = await importEncryptedBackup(rawText, passphrase);
  } else {
    importedState = importLegacyPayload(rawText);
  }

  viewModel.state = await secureStore.saveState(importedState);
  setLockMinutesFromState(viewModel.state);
  scheduleAutolock();
  setStatus("Datos importados a la nueva base.");
}

function openTab(tab) {
  if (!tab) return;
  viewModel.currentTab = tab;
  paint();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function wireUi() {
  const setupForm = document.getElementById("setup-form");
  if (setupForm) {
    setupForm.addEventListener("submit", async event => {
      event.preventDefault();
      const formData = new FormData(setupForm);
      const passphrase = String(formData.get("passphrase") || "");
      const passphraseConfirm = String(formData.get("passphraseConfirm") || "");

      try {
        if (passphrase !== passphraseConfirm) {
          throw new Error("La confirmacion de passphrase no coincide.");
        }
        const state = await secureStore.initializeVault(passphrase);
        viewModel.state = state;
        setLockMinutesFromState(state);
        viewModel.mode = "ready";
        clearStatus();
        scheduleAutolock();
      } catch (error) {
        setStatus(error.message || "No se pudo crear el vault.");
      }
    });
  }

  const unlockForm = document.getElementById("unlock-form");
  if (unlockForm) {
    unlockForm.addEventListener("submit", async event => {
      event.preventDefault();
      const formData = new FormData(unlockForm);
      const passphrase = String(formData.get("passphrase") || "");

      try {
        const state = await secureStore.unlock(passphrase);
        viewModel.state = state;
        setLockMinutesFromState(state);
        viewModel.mode = "ready";
        clearStatus();
        scheduleAutolock();
      } catch {
        setStatus("No se pudo desbloquear. Revisa la passphrase.");
      }
    });
  }

  const lockButton = document.getElementById("lock-button");
  if (lockButton) {
    lockButton.addEventListener("click", () => {
      secureStore.lock();
      viewModel.mode = "locked";
      setStatus("Sesion bloqueada manualmente.");
    });
  }

  const exportButton = document.getElementById("export-button");
  if (exportButton) {
    exportButton.addEventListener("click", exportEncryptedBackup);
  }

  const importFile = document.getElementById("import-file");
  if (importFile) {
    importFile.addEventListener("change", async event => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        await handleLegacyFile(file);
      } catch (error) {
        setStatus(error.message || "No se pudo importar el archivo.");
      } finally {
        event.target.value = "";
      }
    });
  }

  appElement.querySelectorAll("[data-action='open-tab']").forEach(button => {
    button.addEventListener("click", () => {
      openTab(String(button.dataset.tab || "home"));
    });
  });

  const mealForm = document.getElementById("meal-form");
  if (mealForm) {
    mealForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(mealForm);
        await addMealEntry(mealPayloadFromFormData(formData));
        mealForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la comida.");
      }
    });
  }

  const quickMealForm = document.getElementById("quick-meal-form");
  if (quickMealForm) {
    quickMealForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(quickMealForm);
        await addMealEntry(mealPayloadFromFormData(formData));
        quickMealForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la comida rapida.");
      }
    });
  }

  const weightForm = document.getElementById("weight-form");
  if (weightForm) {
    weightForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(weightForm);
        const weight = requireNumberInRange(formData.get("weight"), "peso", { min: 20, max: 400 });
        const nextState = {
          ...viewModel.state,
          nutrition: {
            ...viewModel.state.nutrition,
            weightLog: {
              ...viewModel.state.nutrition.weightLog,
              [todayKey()]: weight
            }
          }
        };

        await persistState(nextState, "Peso guardado.");
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el peso.");
      }
    });
  }

  const recipeForm = document.getElementById("recipe-form");
  if (recipeForm) {
    recipeForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(recipeForm);
        const ingredients = parseRecipeIngredients(String(formData.get("ingredients") || ""));
        if (ingredients.length === 0) {
          throw new Error("La receta necesita al menos un ingrediente.");
        }
        const totals = totalsFromIngredients(ingredients);
        const recipe = {
          id: Date.now(),
          servings: Math.max(1, requireNumberInRange(formData.get("servings"), "raciones", { min: 1, max: 20 })),
          name: requireText(formData.get("name"), "nombre de la receta"),
          ingredients,
          totals,
          createdAt: new Date().toISOString()
        };
        Object.assign(recipe, recipeMetaFromIngredients(ingredients, recipe.servings));

        const nextState = {
          ...viewModel.state,
          recipes: [...viewModel.state.recipes, recipe]
        };

        await persistState(nextState, "Receta guardada.");
        recipeForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la receta.");
      }
    });
  }

  const plannerForm = document.getElementById("planner-form");
  if (plannerForm) {
    plannerForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(plannerForm);
        const date = requireText(formData.get("date"), "fecha del planner");
        const slot = requireText(formData.get("slot"), "slot del planner");
        const recipeId = String(formData.get("recipeId") || "").trim();
        const recipe = recipeId ? findRecipe(recipeId) : null;
        const plannedItem = recipe
          ? {
              id: Date.now() + Math.random(),
              date,
              slot,
              name: recipe.name,
              recipeId: recipe.id,
              calories: Math.round(recipe.totals.calories / recipe.servings),
              protein: Math.round(recipe.totals.protein / recipe.servings),
              carbs: Math.round(recipe.totals.carbs / recipe.servings),
              fat: Math.round(recipe.totals.fat / recipe.servings),
              status: "planned",
              notes: ""
            }
          : {
              id: Date.now() + Math.random(),
              date,
              slot,
              name: requireText(formData.get("name"), "nombre del item planificado"),
              calories: requireNumberInRange(formData.get("calories"), "calorias del item", { min: 0 }),
              protein: 0,
              carbs: 0,
              fat: 0,
              status: "planned",
              notes: ""
            };
        await persistState(replacePlannedMeal(viewModel.state, plannedItem), "Planner actualizado.");
        plannerForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el planner.");
      }
    });
  }

  const trainingForm = document.getElementById("training-form");
  if (trainingForm) {
    trainingForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(trainingForm);
        await addTrainingSession(trainingPayloadFromFormData(formData));
        trainingForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la sesion.");
      }
    });
  }

  const quickTrainingForm = document.getElementById("quick-training-form");
  if (quickTrainingForm) {
    quickTrainingForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(quickTrainingForm);
        await addTrainingSession(trainingPayloadFromFormData(formData));
        quickTrainingForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el entreno rapido.");
      }
    });
  }

  const plannedSessionForm = document.getElementById("planned-session-form");
  if (plannedSessionForm) {
    plannedSessionForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(plannedSessionForm);
        await addPlannedSession({
          date: requireText(formData.get("date"), "fecha de la sesion programada"),
          type: requireText(formData.get("type"), "tipo de sesion"),
          activity: requireText(formData.get("activity"), "actividad programada"),
          duration: requireNumberInRange(formData.get("duration"), "duracion programada", { min: 1, max: 600 }),
          routineName: String(formData.get("routineName") || "").trim(),
          status: requireText(formData.get("status"), "estado"),
          notes: String(formData.get("notes") || "").trim()
        });
        plannedSessionForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo programar la sesion.");
      }
    });
  }

  const routineForm = document.getElementById("routine-form");
  if (routineForm) {
    routineForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(routineForm);
        await addRoutine({
          name: requireText(formData.get("name"), "nombre de la rutina"),
          focus: requireText(formData.get("focus"), "foco de la rutina"),
          exercises: String(formData.get("exercises") || "").trim()
        });
        routineForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la rutina.");
      }
    });
  }

  const symptomForm = document.getElementById("symptom-form");
  if (symptomForm) {
    symptomForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(symptomForm);
        await addSymptom({
          id: Date.now() + Math.random(),
          date: requireText(formData.get("date"), "fecha del sintoma"),
          name: requireText(formData.get("name"), "nombre del sintoma"),
          intensity: requireNumberInRange(formData.get("intensity"), "intensidad", { min: 1, max: 5 }),
          digestion: String(formData.get("digestion") || "").trim(),
          energy: String(formData.get("energy") || "").trim() ? requireNumberInRange(formData.get("energy"), "energia", { min: 1, max: 5 }) : null,
          mood: String(formData.get("mood") || "").trim() ? requireNumberInRange(formData.get("mood"), "animo", { min: 1, max: 5 }) : null,
          note: String(formData.get("note") || "").trim()
        });
        symptomForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el sintoma.");
      }
    });
  }

  const quickCheckinForm = document.getElementById("quick-checkin-form");
  if (quickCheckinForm) {
    quickCheckinForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(quickCheckinForm);
        await addSymptom({
          id: Date.now() + Math.random(),
          date: todayKey(),
          name: requireText(formData.get("name"), "nombre del sintoma"),
          intensity: requireNumberInRange(formData.get("intensity"), "intensidad", { min: 1, max: 5 }),
          digestion: String(formData.get("digestion") || "").trim(),
          energy: String(formData.get("energy") || "").trim() ? requireNumberInRange(formData.get("energy"), "energia", { min: 1, max: 5 }) : null,
          mood: String(formData.get("mood") || "").trim() ? requireNumberInRange(formData.get("mood"), "animo", { min: 1, max: 5 }) : null,
          note: String(formData.get("note") || "").trim()
        });
        quickCheckinForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el check-in rapido.");
      }
    });
  }

  const medForm = document.getElementById("med-form");
  if (medForm) {
    medForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(medForm);
        await addMedication({
          name: requireText(formData.get("name"), "nombre de la medicacion"),
          dose: String(formData.get("dose") || "").trim(),
          notes: String(formData.get("notes") || "").trim()
        });
        medForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la medicacion.");
      }
    });
  }

  const eventForm = document.getElementById("event-form");
  if (eventForm) {
    eventForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(eventForm);
        await addEvent({
          title: requireText(formData.get("title"), "titulo del evento"),
          category: String(formData.get("category") || "").trim(),
          date: requireText(formData.get("date"), "fecha del evento"),
          time: String(formData.get("time") || "").trim(),
          note: String(formData.get("note") || "").trim()
        });
        eventForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el evento.");
      }
    });
  }

  const blockForm = document.getElementById("block-form");
  if (blockForm) {
    blockForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(blockForm);
        const start = requireText(formData.get("start"), "hora de inicio");
        const end = requireText(formData.get("end"), "hora de fin");
        if (end <= start) {
          throw new Error("La hora de fin debe ser posterior al inicio.");
        }
        await addScheduleBlock({
          title: requireText(formData.get("title"), "titulo del bloque"),
          day: requireText(formData.get("day"), "dia del bloque"),
          start,
          end,
          category: String(formData.get("category") || "").trim()
        });
        blockForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el bloque.");
      }
    });
  }

  const sleepForm = document.getElementById("sleep-form");
  if (sleepForm) {
    sleepForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(sleepForm);
        await addSleepEntry({
          date: requireText(formData.get("date"), "fecha del sueño"),
          hours: requireNumberInRange(formData.get("hours"), "horas de sueño", { min: 0, max: 24 }),
          quality: requireNumberInRange(formData.get("quality"), "calidad del sueño", { min: 1, max: 5 }),
          sleepStart: String(formData.get("sleepStart") || "").trim(),
          sleepEnd: String(formData.get("sleepEnd") || "").trim(),
          notes: String(formData.get("notes") || "").trim()
        });
        sleepForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el sueño.");
      }
    });
  }

  const noteForm = document.getElementById("note-form");
  if (noteForm) {
    noteForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(noteForm);
        const key = requireText(formData.get("key"), "clave de la nota");
        const value = requireText(formData.get("value"), "contenido de la nota");
        await saveNoteEntry(key, value);
        noteForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la nota.");
      }
    });
  }

  const profileForm = document.getElementById("profile-form");
  if (profileForm) {
    profileForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(profileForm);
        const displayName = String(formData.get("displayName") || "").trim();
        const autoLockMinutes = requireNumberInRange(formData.get("autoLockMinutes"), "autobloqueo", { min: 1, max: 120 });
        await persistState(
          {
            ...viewModel.state,
            profile: {
              ...viewModel.state.profile,
              displayName
            },
            appMeta: {
              ...viewModel.state.appMeta,
              autoLockMinutes
            }
          },
          "Ajustes guardados."
        );
      } catch (error) {
        setStatus(error.message || "No se pudieron guardar los ajustes.");
      }
    });
  }

  const weeklyForm = document.getElementById("weekly-form");
  if (weeklyForm) {
    weeklyForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(weeklyForm);
        await addWeeklyTask({
          title: requireText(formData.get("title"), "tarea semanal"),
          resetDay: requireText(formData.get("resetDay"), "dia de reset")
        });
        weeklyForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la checklist semanal.");
      }
    });
  }

  appElement.querySelectorAll("[data-action='add-water']").forEach(button => {
    button.addEventListener("click", async () => {
      const key = todayKey();
      const current = numberValue(viewModel.state.nutrition.waterLog[key]);
      const nextState = {
        ...viewModel.state,
        nutrition: {
          ...viewModel.state.nutrition,
          waterLog: {
            ...viewModel.state.nutrition.waterLog,
            [key]: current + 1
          }
        }
      };
      await persistState(nextState, "Agua registrada.");
    });
  });

  appElement.querySelectorAll("[data-action='delete-meal']").forEach(button => {
    button.addEventListener("click", async () => {
      const mealId = Number(button.dataset.id);
      const nextState = {
        ...viewModel.state,
        nutrition: {
          ...viewModel.state.nutrition,
          meals: viewModel.state.nutrition.meals.filter(meal => meal.id !== mealId)
        }
      };
      await persistState(nextState, "Comida eliminada.");
    });
  });

  appElement.querySelectorAll("[data-action='log-recipe']").forEach(button => {
    button.addEventListener("click", async () => {
      await logRecipeToToday(button.dataset.id);
    });
  });

  appElement.querySelectorAll("[data-action='log-day-plan']").forEach(button => {
    button.addEventListener("click", async () => {
      await logPlannedDay(button.dataset.date);
    });
  });

  appElement.querySelectorAll("[data-action='cycle-planned-meal-status']").forEach(button => {
    button.addEventListener("click", async () => {
      const mealId = String(button.dataset.id || "");
      const meal = getPlannedMeals(viewModel.state).find(entry => String(entry.id) === mealId);
      if (!meal) return;
      await persistState(
        replacePlannedMeal(viewModel.state, {
          ...meal,
          status: cyclePlanStatus(meal.status)
        }),
        "Estado del meal planner actualizado."
      );
    });
  });

  appElement.querySelectorAll("[data-action='set-planned-status']").forEach(button => {
    button.addEventListener("click", async () => {
      const itemId = String(button.dataset.id || "");
      const status = String(button.dataset.status || "planned");
      const kind = String(button.dataset.kind || "");
      if (!itemId || !kind) return;

      if (kind === "meal") {
        await setPlannedMealStatus(itemId, status);
        return;
      }

      if (kind === "session") {
        await setPlannedSessionStatus(itemId, status);
      }
    });
  });

  appElement.querySelectorAll("[data-action='delete-planned-meal']").forEach(button => {
    button.addEventListener("click", async () => {
      const mealId = String(button.dataset.id || "");
      await persistState(removePlannedMeal(viewModel.state, mealId), "Slot planificado eliminado.");
    });
  });

  appElement.querySelectorAll("[data-action='add-weekly-suggestion']").forEach(button => {
    button.addEventListener("click", async () => {
      const title = String(button.dataset.title || "").trim();
      if (!title) return;
      await addSuggestedWeeklyTasks([title]);
    });
  });

  appElement.querySelectorAll("[data-action='add-all-weekly-suggestions']").forEach(button => {
    button.addEventListener("click", async () => {
      const suggestions = getSuggestedWeeklyTasks(viewModel.state).map(item => item.title);
      await addSuggestedWeeklyTasks(suggestions);
    });
  });

  appElement.querySelectorAll("[data-action='create-weekly-reset-block']").forEach(button => {
    button.addEventListener("click", async () => {
      await ensureResetBlockForWeek();
    });
  });

  appElement.querySelectorAll("[data-action='apply-weekly-reset-routine']").forEach(button => {
    button.addEventListener("click", async () => {
      await applyResetRoutine();
    });
  });

  appElement.querySelectorAll("[data-action='apply-suggested-meal-slots']").forEach(button => {
    button.addEventListener("click", async () => {
      await applySuggestedMealSlots();
    });
  });

  appElement.querySelectorAll("[data-action='apply-suggested-sessions']").forEach(button => {
    button.addEventListener("click", async () => {
      await applySuggestedSessions();
    });
  });

  appElement.querySelectorAll("[data-action='save-weekly-nutrition-notes']").forEach(button => {
    button.addEventListener("click", async () => {
      await saveWeeklyNutritionNotes();
    });
  });

  appElement.querySelectorAll("[data-action='apply-weekly-nutrition-pack']").forEach(button => {
    button.addEventListener("click", async () => {
      await applyNutritionPrepPack();
    });
  });

  appElement.querySelectorAll("[data-action='save-weekly-calibration-note']").forEach(button => {
    button.addEventListener("click", async () => {
      await saveWeeklyCalibrationNote();
    });
  });

  appElement.querySelectorAll("[data-action='apply-weekly-calibration-pack']").forEach(button => {
    button.addEventListener("click", async () => {
      await applyWeeklyCalibrationPack();
    });
  });

  appElement.querySelectorAll("[data-action='toggle-weekly-review-step']").forEach(button => {
    button.addEventListener("click", async () => {
      await toggleReviewStep(String(button.dataset.step || ""));
    });
  });

  appElement.querySelectorAll("[data-action='delete-session']").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      await persistState(
        {
          ...viewModel.state,
          training: {
            ...viewModel.state.training,
            sessions: viewModel.state.training.sessions.filter(session => session.id !== id)
          }
        },
        "Sesion eliminada."
      );
    });
  });

  appElement.querySelectorAll("[data-action='delete-routine']").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      await persistState(
        {
          ...viewModel.state,
          training: {
            ...viewModel.state.training,
            routines: viewModel.state.training.routines.filter(routine => routine.id !== id)
          }
        },
        "Rutina eliminada."
      );
    });
  });

  appElement.querySelectorAll("[data-action='complete-planned-session']").forEach(button => {
    button.addEventListener("click", async () => {
      const sessionId = String(button.dataset.id || "");
      const session = getPlannedSessions(viewModel.state).find(entry => String(entry.id) === sessionId);
      if (!session) return;

      const nextState = replacePlannedSession(
        {
          ...viewModel.state,
          training: {
            ...viewModel.state.training,
            sessions: [
              ...viewModel.state.training.sessions,
              {
                id: Date.now() + Math.random(),
                date: session.date,
                type: session.type,
                activity: session.activity,
                duration: session.duration,
                rpe: 0,
                loadKg: 0,
                distanceKm: 0,
                routineName: session.routineName,
                notes: session.notes
              }
            ]
          }
        },
        {
          ...session,
          status: "done"
        }
      );

      await persistState(nextState, "Sesion programada pasada a ejecutada.");
    });
  });

  appElement.querySelectorAll("[data-action='cycle-planned-session-status']").forEach(button => {
    button.addEventListener("click", async () => {
      const sessionId = String(button.dataset.id || "");
      const session = getPlannedSessions(viewModel.state).find(entry => String(entry.id) === sessionId);
      if (!session) return;
      await persistState(
        replacePlannedSession(viewModel.state, {
          ...session,
          status: cyclePlanStatus(session.status)
        }),
        "Estado de la sesion programada actualizado."
      );
    });
  });

  appElement.querySelectorAll("[data-action='delete-planned-session']").forEach(button => {
    button.addEventListener("click", async () => {
      const sessionId = String(button.dataset.id || "");
      await persistState(removePlannedSession(viewModel.state, sessionId), "Sesion programada eliminada.");
    });
  });

  appElement.querySelectorAll("[data-action='toggle-period']").forEach(button => {
    button.addEventListener("click", togglePeriodToday);
  });

  appElement.querySelectorAll("[data-action='create-support-block']").forEach(button => {
    button.addEventListener("click", async () => {
      await createSupportBlock(String(button.dataset.kind || ""));
    });
  });

  appElement.querySelectorAll("[data-action='toggle-med']").forEach(button => {
    button.addEventListener("click", async () => {
      await toggleMedicationToday(Number(button.dataset.id));
    });
  });

  appElement.querySelectorAll("[data-action='delete-med']").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      const nextMeds = viewModel.state.medication.meds.filter(med => med.id !== id);
      const nextLog = Object.fromEntries(
        Object.entries(viewModel.state.medication.log).map(([date, ids]) => [
          date,
          ids.filter(entryId => entryId !== id)
        ])
      );
      await persistState(
        {
          ...viewModel.state,
          medication: {
            ...viewModel.state.medication,
            meds: nextMeds,
            log: nextLog
          }
        },
        "Medicacion eliminada."
      );
    });
  });

  appElement.querySelectorAll("[data-action='delete-event']").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      await persistState(
        {
          ...viewModel.state,
          calendar: {
            ...viewModel.state.calendar,
            events: viewModel.state.calendar.events.filter(event => event.id !== id)
          }
        },
        "Evento eliminado."
      );
    });
  });

  appElement.querySelectorAll("[data-action='delete-block']").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      await persistState(
        {
          ...viewModel.state,
          schedule: {
            ...viewModel.state.schedule,
            blocks: viewModel.state.schedule.blocks.filter(block => block.id !== id)
          }
        },
        "Bloque eliminado."
      );
    });
  });

  appElement.querySelectorAll("[data-action='delete-sleep']").forEach(button => {
    button.addEventListener("click", async () => {
      const date = String(button.dataset.date || "");
      const nextEntries = { ...viewModel.state.sleepEntries };
      delete nextEntries[date];
      await persistState(
        {
          ...viewModel.state,
          sleepEntries: nextEntries
        },
        "Registro de sueño eliminado."
      );
    });
  });

  appElement.querySelectorAll("[data-action='delete-note']").forEach(button => {
    button.addEventListener("click", async () => {
      const key = String(button.dataset.key || "");
      const nextNotes = { ...viewModel.state.notes };
      delete nextNotes[key];
      await persistState(
        {
          ...viewModel.state,
          notes: nextNotes
        },
        "Nota eliminada."
      );
    });
  });

  appElement.querySelectorAll("[data-action='toggle-weekly-task']").forEach(button => {
    button.addEventListener("click", async () => {
      const taskId = String(button.dataset.id || "");
      const weekKey = currentWeekStartKey();
      const checklist = getWeeklyChecklist(viewModel.state, weekKey);
      const nextChecklist = checklist.map(item =>
        String(item.id) === taskId ? { ...item, done: !item.done } : item
      );
      await persistState(replaceWeeklyChecklist(viewModel.state, weekKey, nextChecklist), "Checklist semanal actualizada.");
    });
  });

  appElement.querySelectorAll("[data-action='delete-weekly-task']").forEach(button => {
    button.addEventListener("click", async () => {
      const taskId = String(button.dataset.id || "");
      const weekKey = currentWeekStartKey();
      const checklist = getWeeklyChecklist(viewModel.state, weekKey);
      const nextChecklist = checklist.filter(item => String(item.id) !== taskId);
      await persistState(replaceWeeklyChecklist(viewModel.state, weekKey, nextChecklist), "Tarea semanal eliminada.");
    });
  });
}

async function bootstrap() {
  updateRuntimeStatus();
  viewModel.hasVault = await secureStore.hasVault();
  viewModel.mode = viewModel.hasVault ? "locked" : "setup";
  viewModel.lockMinutes = AUTOLOCK_MINUTES;
  paint();
}

["click", "keydown", "touchstart"].forEach(eventName => {
  window.addEventListener(eventName, resetActivityClock, { passive: true });
});

window.addEventListener("online", () => {
  updateRuntimeStatus();
  if (viewModel.mode !== "fatal") paint();
});

window.addEventListener("offline", () => {
  updateRuntimeStatus();
  if (viewModel.mode !== "fatal") paint();
});

window.matchMedia?.("(display-mode: standalone)")?.addEventListener?.("change", () => {
  updateRuntimeStatus();
  if (viewModel.mode !== "fatal") paint();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

window.addEventListener("error", event => {
  showFatalError(event.error || event.message || "Error de runtime no controlado.");
});

window.addEventListener("unhandledrejection", event => {
  showFatalError(event.reason || "Promesa rechazada sin control.");
});

bootstrap().catch(showFatalError);
