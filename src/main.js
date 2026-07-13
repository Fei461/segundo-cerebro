import { createDefaultState } from "./domain/schema.js";
import {
  canonicalizeIngredientName,
  PERSONAL_MEAL_TEMPLATES,
  getWeeklyNutritionPrepBoard,
  varietyFamiliesFromText
} from "./domain/personal-nutrition.js";
import {
  bindFamilyAutofill,
  bindPlannerRecipeAutofill,
  resolveSleepHoursFromValues,
  uniqueFamilies
} from "./controllers/form-helpers.js";
import { wireDomainForms } from "./controllers/domain-forms.js";
import { wireDomainActions } from "./controllers/domain-actions.js";
import { wireSettingsForm } from "./controllers/settings.js";
import { bootstrapApp, updateRuntimeStatus as updateRuntimeStatusController, wireRuntimeEnvironment } from "./controllers/app-runtime.js";
import {
  getLockMinutesFromState,
  loadUiState as loadUiStateSnapshot,
  saveUiState as saveUiStateSnapshot
} from "./controllers/session-ui.js";
import {
  changeVaultPassphrase as changeVaultPassphraseInStore,
  importIntoNewVault,
  triggerDownload,
  wireAuthVaultForms
} from "./controllers/auth-vault.js";
import {
  clearSessionResume as clearSessionResumeToken,
  exportEncryptedBackupWithPassphrase as exportEncryptedBackupWithPassphraseInVault,
  importBackupIntoCurrentSession,
  persistSessionResume as persistSessionResumeToken,
  readSessionResume as readSessionResumeToken,
  resetVaultContext as resetVaultContextInStore,
  scheduleAutolockTimer
} from "./controllers/vault-session.js";
import {
  applyLoggedMealToPlans,
  applyLoggedSessionToPlans,
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
import { addDaysToDateKey, localDateKey } from "./domain/date.js";
import { SecureStore } from "./storage/secure-store.js";
import { renderApp } from "./ui/app-shell.js";

const AUTOLOCK_MINUTES = 5;
const UI_STATE_KEY = "segundo-cerebro-ui-state-v1";
const SESSION_RESUME_KEY = "segundo-cerebro-session-resume-v1";
const secureStore = new SecureStore();
const appElement = document.getElementById("app");

const viewModel = {
  mode: "loading",
  state: createDefaultState(),
  currentTab: "home",
  homeCapture: "meal",
  moduleViews: {
    home: "overview",
    planning: "overview",
    nutrition: "today",
    training: "overview",
    more: "hub",
    wellbeing: "overview",
    recovery: "overview",
    library: "overview"
  },
  status: "",
  hasVault: false,
  vaultHealth: "empty",
  lockMinutes: AUTOLOCK_MINUTES,
  fatalError: "",
  runtime: {
    isStandalone: false,
    isOnline: true,
    hasServiceWorker: false
  },
  restTimer: {
    endsAt: null,
    durationSeconds: 90
  }
};

let autolockTimer = null;
let statusTimer = null;
let restTimerTick = null;

function loadUiState() {
  const snapshot = loadUiStateSnapshot(window.sessionStorage, {
    key: UI_STATE_KEY,
    fallback: {
      currentTab: viewModel.currentTab,
      homeCapture: viewModel.homeCapture,
      moduleViews: viewModel.moduleViews
    }
  });
  viewModel.currentTab = snapshot.currentTab;
  viewModel.homeCapture = snapshot.homeCapture;
  viewModel.moduleViews = snapshot.moduleViews;
}

function saveUiState() {
  saveUiStateSnapshot(window.sessionStorage, UI_STATE_KEY, {
    currentTab: viewModel.currentTab,
    homeCapture: viewModel.homeCapture,
    moduleViews: viewModel.moduleViews
  });
}

function setLockMinutesFromState(state) {
  viewModel.lockMinutes = getLockMinutesFromState(state, AUTOLOCK_MINUTES);
}

function todayKey() {
  return localDateKey(new Date());
}

function todayDayLabel() {
  return ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][new Date().getDay()];
}

function updateRuntimeStatus() {
  updateRuntimeStatusController(viewModel, window, navigator);
}

function syncRestTimer() {
  if (restTimerTick) {
    window.clearTimeout(restTimerTick);
    restTimerTick = null;
  }

  if (!viewModel.restTimer?.endsAt) return;

  if (viewModel.restTimer.endsAt <= Date.now()) {
    viewModel.restTimer.endsAt = null;
    viewModel.restTimer.durationSeconds = viewModel.restTimer.durationSeconds || 90;
    paint();
    return;
  }

  restTimerTick = window.setTimeout(() => {
    paint();
    syncRestTimer();
  }, 1000);
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

function resolveSleepHours(formData) {
  return resolveSleepHoursFromValues(
    {
      rawHours: formData.get("hours"),
      sleepStart: formData.get("sleepStart"),
      sleepEnd: formData.get("sleepEnd")
    },
    requireNumberInRange
  );
}

function parseRecipeIngredients(rawText) {
  return rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [rawName = "", rawSecond = "", rawThird = "", rawFourth = "", rawFifth = ""] = line.split("|").map(part => part.trim());
      const name = rawName;
      const canonicalName = canonicalizeIngredientName(name);
      const hasLegacyMacros = [rawSecond, rawThird, rawFourth, rawFifth].some(part => part !== "" && !Number.isNaN(Number(part)));
      const explicitFamilies = hasLegacyMacros ? [] : uniqueFamilies(rawSecond.split(","));
      return {
        name,
        canonicalName,
        families: explicitFamilies.length ? explicitFamilies : varietyFamiliesFromText(canonicalName || name),
        calories: hasLegacyMacros ? numberValue(rawSecond) : 0,
        protein: hasLegacyMacros ? numberValue(rawThird) : 0,
        carbs: hasLegacyMacros ? numberValue(rawFourth) : 0,
        fat: hasLegacyMacros ? numberValue(rawFifth) : 0
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

function findMealTemplate(slotKey, templateName) {
  const templates = PERSONAL_MEAL_TEMPLATES[String(slotKey || "").trim()] || [];
  return templates.find(template => String(template.name || "").trim() === String(templateName || "").trim()) || null;
}

function familiesFromTemplate(template) {
  if (!template) return [];
  if (Array.isArray(template.families) && template.families.length) {
    return uniqueFamilies(template.families);
  }
  const text = [template.name, ...(Array.isArray(template.ingredients) ? template.ingredients : [])].join(" ");
  return uniqueFamilies(varietyFamiliesFromText(text));
}

function pickTemplateForPlannedMeal(preferredFamily = "") {
  const preferred = String(preferredFamily || "").trim();
  const allTemplates = Object.entries(PERSONAL_MEAL_TEMPLATES).flatMap(([slotKey, items]) =>
    items.map(template => ({ slotKey, template, families: familiesFromTemplate(template) }))
  );

  const filtered = preferred
    ? allTemplates.filter(entry => entry.families.includes(preferred))
    : allTemplates;

  return filtered[0] || allTemplates[0] || null;
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
    item: { name: recipe.name, ...perServing, recipeId: recipe.id, families: Array.isArray(recipe.familyCoverage) ? recipe.familyCoverage : [] },
    totals: perServing
  });
}

async function logMealTemplateToToday(slotKey, templateName) {
  const template = findMealTemplate(slotKey, templateName);
  if (!template) {
    setStatus("No se encontró la plantilla elegida.");
    return;
  }

  const families = familiesFromTemplate(template);
  const ingredientsText = Array.isArray(template.ingredients) ? template.ingredients.join(", ") : "";
  const slotLabels = {
    breakfasts: "Desayuno",
    lunches: "Comida",
    dinners: "Cena",
    snacks: "Snack"
  };

  await addMealEntry({
    type: slotLabels[String(slotKey || "").trim()] || "Comida",
    item: {
      name: template.name,
      ingredientsText,
      families,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    },
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }
  });
}

async function regeneratePlannedMeal(mealId) {
  const meal = getPlannedMeals(viewModel.state).find(entry => String(entry.id) === String(mealId));
  if (!meal) {
    setStatus("No se encontró la comida prevista.");
    return;
  }

  const prepBoard = getWeeklyNutritionPrepBoard({
    plannedMeals: getPlannedMeals(viewModel.state),
    loggedMeals: viewModel.state.nutrition.meals,
    recipes: viewModel.state.recipes
  });
  const preferredFamily = prepBoard.review?.variety?.missingFamilies?.[0] || meal.families?.[0] || "";
  const picked = pickTemplateForPlannedMeal(preferredFamily);
  if (!picked) {
    setStatus("No hay plantillas suficientes para regenerar esta comida.");
    return;
  }

  const slotLabels = {
    breakfasts: "Desayuno",
    lunches: "Comida",
    dinners: "Cena",
    snacks: "Snack"
  };
  const nextMeal = {
    ...meal,
    slot: slotLabels[picked.slotKey] || meal.slot,
    name: picked.template.name,
    recipeId: null,
    families: picked.families,
    ingredientsText: Array.isArray(picked.template.ingredients) ? picked.template.ingredients.join(", ") : "",
    canonicalIngredients: Array.isArray(picked.template.ingredients)
      ? picked.template.ingredients.map(item => canonicalizeIngredientName(item)).filter(Boolean)
      : [],
    notes: preferredFamily ? `Regenerada para cubrir ${preferredFamily.toLowerCase()}.` : "Regenerada desde plantilla."
  };

  await persistState(replacePlannedMeal(viewModel.state, nextMeal), "Comida regenerada.");
}

async function logPlannedDay(date) {
  if (date !== todayKey()) {
    setStatus("Solo se registran automáticamente los planes del día de hoy.");
    return;
  }

  const entries = getPlannedMealsForDate(viewModel.state, date);

  if (entries.length === 0) {
    setStatus("No hay plan guardado para ese día.");
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
      nutrition: {
        ...viewModel.state.nutrition,
        meals: [...viewModel.state.nutrition.meals, ...newMeals]
      }
    },
    "Plan del día registrado en el log."
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

  await persistState(nextState, "Sesión guardada.");
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

async function addCustomExercise(payload) {
  const nextState = {
    ...viewModel.state,
    training: {
      ...viewModel.state.training,
      customExercises: [
        ...(Array.isArray(viewModel.state.training.customExercises) ? viewModel.state.training.customExercises : []),
        {
          id: Date.now() + Math.random(),
          createdAt: new Date().toISOString(),
          ...payload
        }
      ]
    }
  };

  await persistState(nextState, "Ejercicio guardado.");
}

async function addBookEntry(payload) {
  const nextState = {
    ...viewModel.state,
    library: {
      ...(viewModel.state.library || {}),
      books: [
        ...((viewModel.state.library && Array.isArray(viewModel.state.library.books)) ? viewModel.state.library.books : []),
        {
          id: Date.now() + Math.random(),
          createdAt: new Date().toISOString(),
          ...payload
        }
      ]
    }
  };

  await persistState(nextState, "Libro guardado.");
}

async function saveLibraryChallenge(payload) {
  const nextState = {
    ...viewModel.state,
    library: {
      ...(viewModel.state.library || {}),
      books: Array.isArray(viewModel.state.library?.books) ? viewModel.state.library.books : [],
      challenge: {
        year: payload.year,
        target: payload.target
      }
    }
  };

  await persistState(nextState, "Reto de lectura guardado.");
}

async function addGoalEntry(payload) {
  const nextState = {
    ...viewModel.state,
    goals: [
      ...(Array.isArray(viewModel.state.goals) ? viewModel.state.goals : []),
      {
        id: Date.now() + Math.random(),
        createdAt: new Date().toISOString(),
        completed: false,
        ...payload
      }
    ]
  };

  await persistState(nextState, "Objetivo guardado.");
}

async function addHabitEntry(payload) {
  const nextState = {
    ...viewModel.state,
    habits: [
      ...(Array.isArray(viewModel.state.habits) ? viewModel.state.habits : []),
      {
        id: Date.now() + Math.random(),
        createdAt: new Date().toISOString(),
        activeToday: false,
        ...payload
      }
    ]
  };

  await persistState(nextState, "Hábito guardado.");
}

async function addPlannedSession(payload) {
  const plannedSession = {
    id: Date.now() + Math.random(),
    status: payload.status || "planned",
    ...payload
  };

  await persistState(replacePlannedSession(viewModel.state, plannedSession), "Sesión programada.");
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
    setStatus("No había sugerencias nuevas que añadir.");
    return;
  }

  await persistState(nextState, "Sugerencias añadidas al reset semanal.");
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
    setStatus("No había cambios nuevos para aplicar en el reset semanal.");
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

  await persistState(nextState, "Sesiones futuras sugeridas añadidas.");
}

async function toggleReviewStep(stepKey) {
  if (!stepKey) return;
  const weekKey = currentWeekStartKey();
  const nextState = toggleWeeklyReviewStep(viewModel.state, weekKey, stepKey);
  await persistState(nextState, "Revisión semanal actualizada.");
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
    exists ? "Día de período eliminado." : "Día de período registrado."
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

  await persistState(nextState, "Síntoma guardado.");
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
    "Estado de la sesión planificada actualizado."
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

  await persistState(nextState, "Medicación guardada.");
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

function optionalNumberInRange(value, label, bounds) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  return requireNumberInRange(normalized, label, bounds);
}

function mealPayloadFromFormData(formData) {
  const rawFamilies = uniqueFamilies([
    formData.get("primaryFamily"),
    formData.get("secondaryFamily"),
    formData.get("extraFamily")
  ]);
  const mealName = requireText(formData.get("name"), "nombre de la comida");
  const ingredientsText = String(formData.get("ingredientsText") || "").trim();
  const families = rawFamilies.length ? rawFamilies : varietyFamiliesFromText(`${mealName} ${ingredientsText}`.trim());

  const item = {
    name: mealName,
    ingredientsText,
    families,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  };

  return {
    type: requireText(formData.get("type"), "tipo de comida"),
    item,
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    reaction: String(formData.get("reaction") || "")
  };
}

function trainingPayloadFromFormData(formData) {
  const structure = String(formData.get("structure") || "").trim();
  const exercises = String(formData.get("exercises") || "")
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean);

  return {
    date: requireText(formData.get("date"), "fecha del entreno"),
    type: requireText(formData.get("type"), "tipo de entreno"),
    activity: requireText(formData.get("activity"), "actividad"),
    duration: requireNumberInRange(formData.get("duration"), "duracion", { min: 1, max: 600 }),
    structure,
    exercises,
    rpe: optionalNumberInRange(formData.get("rpe"), "RPE", { min: 1, max: 10 }),
    loadKg: optionalNumberInRange(formData.get("loadKg"), "carga", { min: 0 }),
    distanceKm: optionalNumberInRange(formData.get("distanceKm"), "distancia", { min: 0 }),
    routineName: String(formData.get("routineName") || "").trim(),
    preEnergy: optionalNumberInRange(formData.get("preEnergy"), "energía previa", { min: 1, max: 5 }),
    recoveryScore: optionalNumberInRange(formData.get("recoveryScore"), "recuperación", { min: 1, max: 5 }),
    sorenessScore: optionalNumberInRange(formData.get("sorenessScore"), "molestias", { min: 1, max: 5 }),
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
      title: "Recuperación",
      day,
      start: "21:00",
      end: "21:30",
      category: "Recuperación"
    },
    "meal-prep": {
      title: "Meal prep express",
      day,
      start: "20:00",
      end: "21:00",
      category: "Nutrición"
    },
    focus: {
      title: "Ajuste de agenda",
      day,
      start: "18:30",
      end: "19:00",
      category: "Planificación"
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

async function cyclePantryItem(itemName) {
  const current = viewModel.state.nutrition.pantryStatus?.[itemName] || "";
  const next =
    current === ""
      ? "have"
      : current === "have"
        ? "need"
        : current === "need"
          ? "bought"
          : current === "bought"
            ? "avoid"
            : "";
  const nextStatus = { ...(viewModel.state.nutrition.pantryStatus || {}) };

  if (next) {
    nextStatus[itemName] = next;
  } else {
    delete nextStatus[itemName];
  }

  await persistState(
    {
      ...viewModel.state,
      nutrition: {
        ...viewModel.state.nutrition,
        pantryStatus: nextStatus
      }
    },
    next === "have"
      ? "Marcado como disponible."
      : next === "need"
        ? "Marcado como pendiente."
        : next === "bought"
          ? "Marcado como comprado."
          : next === "avoid"
            ? "Marcado como evitar."
            : "Item quitado de la lista."
  );
}

async function clearPantryStatus() {
  await persistState(
    {
      ...viewModel.state,
      nutrition: {
        ...viewModel.state.nutrition,
        pantryStatus: {}
      }
    },
    "Despensa reiniciada."
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
  const weekKeys = new Set();
  for (let index = 0; index < 7; index += 1) {
    weekKeys.add(addDaysToDateKey(startKey, index));
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
  await persistState(nextState, "Nota de recalibración semanal guardada.");
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

  await persistState(nextState, "Recalibración semanal aplicada.");
}

function setStatus(message) {
  if (statusTimer) window.clearTimeout(statusTimer);
  viewModel.status = message;
  paint();
  if (message) {
    statusTimer = window.setTimeout(() => {
      viewModel.status = "";
      paint();
    }, 2200);
  }
}

function clearStatus() {
  if (!viewModel.status) return;
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
          <p class="eyebrow">Recuperación</p>
          <h2>La app no ha podido arrancar bien</h2>
        </div>
      </div>
      <p class="muted">
        No deberías quedarte con una pantalla en blanco. Este aviso deja visible el problema para que podamos corregirlo sin perder tiempo.
      </p>
      <article class="entry">
        <div>
          <p class="entry-title">Detalle técnico</p>
          <p class="entry-note">${message}</p>
        </div>
      </article>
      <div class="button-row">
        <button class="ghost" type="button" data-action="recover-home">Volver a Hoy</button>
        <button class="primary" type="button" data-action="reload-app">Recargar app</button>
      </div>
    </section>
  `;

  const recoverButton = appElement.querySelector("[data-action='recover-home']");
  if (recoverButton) {
    recoverButton.addEventListener("click", () => {
      viewModel.mode = secureStore.isUnlocked() ? "ready" : "locked";
      viewModel.currentTab = "home";
      viewModel.moduleViews.home = "overview";
      viewModel.homeCapture = "meal";
      viewModel.status = "Se ha intentado recuperar la app desde Home.";
      viewModel.fatalError = "";
      try {
        paint();
      } catch (error) {
        viewModel.mode = "fatal";
        viewModel.fatalError = formatRuntimeError(error);
        renderFatalApp(viewModel.fatalError);
      }
    });
  }

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
  try {
    renderApp(appElement, viewModel);
    wireUi();
    syncRestTimer();
  } catch (error) {
    showFatalError(error);
  }
}

function clearSessionResume() {
  clearSessionResumeToken(window.sessionStorage, SESSION_RESUME_KEY);
}

async function persistSessionResume() {
  await persistSessionResumeToken({
    secureStore,
    sessionStorageRef: window.sessionStorage,
    sessionKey: SESSION_RESUME_KEY
  });
}

function readSessionResume() {
  return readSessionResumeToken(window.sessionStorage, SESSION_RESUME_KEY);
}

function scheduleAutolock() {
  autolockTimer = scheduleAutolockTimer({
    windowRef: window,
    currentTimer: autolockTimer,
    lockMinutes: viewModel.lockMinutes,
    onLock: () => {
      secureStore.lock();
      clearSessionResume();
      viewModel.mode = "locked";
      setStatus("La sesión se ha bloqueado por inactividad.");
    }
  });
}

function resetActivityClock() {
  if (secureStore.isUnlocked()) {
    scheduleAutolock();
  }
}

async function exportEncryptedBackupWithPassphrase(passphrase) {
  viewModel.state = await exportEncryptedBackupWithPassphraseInVault({
    secureStore,
    passphrase,
    triggerDownload
  });
}

async function changeVaultPassphrase(nextPassphrase) {
  const state = await changeVaultPassphraseInStore(secureStore, nextPassphrase);
  viewModel.state = state;
  setLockMinutesFromState(state);
  await persistSessionResume();
  scheduleAutolock();
}

async function resetVaultContext() {
  const confirmed = window.confirm(
    "Esto borrará solo el vault guardado en este navegador o acceso directo. Tus backups exportados no se borran. ¿Quieres continuar?"
  );
  if (!confirmed) return;

  await resetVaultContextInStore(secureStore);
  clearSessionResume();
  viewModel.state = createDefaultState();
  viewModel.hasVault = false;
  viewModel.vaultHealth = "empty";
  viewModel.mode = "setup";
  setLockMinutesFromState(viewModel.state);
  setStatus("Contexto local restablecido. Ya puedes crear un vault nuevo o importar un backup.");
}

function openTab(tab) {
  if (!tab || viewModel.currentTab === tab) return;
  viewModel.currentTab = tab;
  saveUiState();
  paint();
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
}

function wireUi() {
  wireAuthVaultForms({
    documentRef: document,
    secureStore,
    viewModel,
    setStatus,
    clearStatus,
    setLockMinutesFromState,
    persistSessionResume,
    scheduleAutolock,
    paint,
    clearSessionResume,
    createVault: passphrase => secureStore.initializeVault(passphrase),
    unlockVault: passphrase => secureStore.unlock(passphrase),
    importNewVault: ({ file, backupPassphrase, newVaultPassphrase }) =>
      importIntoNewVault({ file, backupPassphrase, newVaultPassphrase, secureStore }),
    importExistingVault: ({ file, backupPassphrase, vaultPassphrase }) =>
      importIntoExistingVault({ file, backupPassphrase, vaultPassphrase, secureStore }),
    resetVault: resetVaultContext,
    exportBackupWithPassphrase: exportEncryptedBackupWithPassphrase,
    changePassphrase: changeVaultPassphrase,
    importCurrentSession: ({ file, backupPassphrase }) => importBackupIntoCurrentSession({ file, backupPassphrase, secureStore })
  });

  appElement.querySelectorAll("[data-action='open-tab']").forEach(button => {
    button.addEventListener("click", () => {
      openTab(String(button.dataset.tab || "home"));
    });
  });

  appElement.querySelectorAll("[data-action='toggle-secret']").forEach(button => {
    button.addEventListener("click", () => {
      const fieldRow = button.closest(".secret-field-row");
      const input = fieldRow?.querySelector("input");
      if (!input) return;
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.textContent = visible ? "Ver" : "Ocultar";
      button.setAttribute("aria-pressed", visible ? "false" : "true");
    });
  });

  appElement.querySelectorAll("[data-action='open-module-view']").forEach(button => {
    button.addEventListener("click", () => {
      const tab = String(button.dataset.tab || viewModel.currentTab || "home");
      const view = String(button.dataset.view || "overview");
      viewModel.moduleViews = {
        ...viewModel.moduleViews,
        [tab]: view
      };
      viewModel.currentTab = tab;
      saveUiState();
      paint();
    });
  });

  appElement.querySelectorAll("[data-action='start-rest-timer']").forEach(button => {
    button.addEventListener("click", () => {
      const seconds = Math.max(15, Number(button.dataset.seconds || viewModel.restTimer.durationSeconds || 90));
      viewModel.restTimer.durationSeconds = seconds;
      viewModel.restTimer.endsAt = Date.now() + seconds * 1000;
      setStatus(`Descanso de ${Math.round(seconds / 60)} min iniciado.`);
    });
  });

  appElement.querySelectorAll("[data-action='clear-rest-timer']").forEach(button => {
    button.addEventListener("click", () => {
      viewModel.restTimer.endsAt = null;
      paint();
    });
  });

  wireDomainForms({
    documentRef: document,
    bindFamilyAutofill,
    bindPlannerRecipeAutofill,
    findRecipe,
    findMealTemplate,
    requireNumberInRange,
    requireText,
    uniqueFamilies,
    resolveSleepHours,
    setStatus,
    todayKey,
    mealPayloadFromFormData,
    trainingPayloadFromFormData,
    addMealEntry,
    persistState,
    viewModel,
    parseRecipeIngredients,
    totalsFromIngredients,
    recipeMetaFromIngredients,
    replacePlannedMeal,
    addTrainingSession,
    addPlannedSession,
    addRoutine,
    addCustomExercise,
    addSymptom,
    addEvent,
    addScheduleBlock,
    addSleepEntry,
    saveNoteEntry,
    addMedication,
    addWeeklyTask,
    addBookEntry,
    saveLibraryChallenge,
    addGoalEntry,
    addHabitEntry
  });

  wireSettingsForm({
    documentRef: document,
    requireNumberInRange,
    persistState,
    viewModel,
    setStatus
  });

  wireDomainActions({
    appElement,
    viewModel,
    persistState,
    saveUiState,
    paint,
    todayKey,
    numberValue,
    cyclePantryItem,
    clearPantryStatus,
    regeneratePlannedMeal,
    logRecipeToToday,
    logMealTemplateToToday,
    logPlannedDay,
    getPlannedMeals,
    replacePlannedMeal,
    cyclePlanStatus,
    setPlannedMealStatus,
    setPlannedSessionStatus,
    removePlannedMeal,
    addSuggestedWeeklyTasks,
    getSuggestedWeeklyTasks,
    ensureResetBlockForWeek,
    applyResetRoutine,
    applySuggestedMealSlots,
    applySuggestedSessions,
    saveWeeklyNutritionNotes,
    applyNutritionPrepPack,
    saveWeeklyCalibrationNote,
    applyWeeklyCalibrationPack,
    toggleReviewStep,
    getPlannedSessions,
    replacePlannedSession,
    removePlannedSession,
    togglePeriodToday,
    createSupportBlock,
    toggleMedicationToday,
    currentWeekStartKey,
    getWeeklyChecklist,
    replaceWeeklyChecklist,
    findRecipe
  });
}

wireRuntimeEnvironment({
  windowRef: window,
  navigatorRef: navigator,
  resetActivityClock,
  updateRuntime: updateRuntimeStatus,
  viewModel,
  paint,
  setStatus,
  showFatalError
});

bootstrapApp({
  loadUiState,
  updateRuntime: updateRuntimeStatus,
  secureStore,
  viewModel,
  readSessionResume,
  setLockMinutesFromState,
  persistSessionResume,
  scheduleAutolock,
  clearSessionResume,
  paint
}).catch(showFatalError);
