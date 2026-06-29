import { getPlannedMeals, getPlannedSessions, replacePlannedMeals, replacePlannedSessions } from "./plans.js";
import { getSuggestedWeeklyMealSlots, getWeeklyNutritionPrepBoard, getWeeklyNutritionReview } from "./personal-nutrition.js";
import { getWeeklyHealthInsights } from "./insights.js";

const DAY_LABELS = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

export function weekStartKeyFromDate(input = new Date()) {
  const date = input instanceof Date ? new Date(input) : new Date(input);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

export function weekKeysFromDate(input = new Date()) {
  const startKey = weekStartKeyFromDate(input);
  const start = new Date(startKey);
  const keys = [];

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    keys.push(date.toISOString().slice(0, 10));
  }

  return keys;
}

export function currentWeekStartKey() {
  return weekStartKeyFromDate(new Date());
}

export function getDailyCommandCenter(state, inputDate = new Date()) {
  const dateKey = inputDate instanceof Date ? inputDate.toISOString().slice(0, 10) : String(inputDate || "");
  const plannedMealsToday = getPlannedMeals(state).filter(meal => meal.date === dateKey);
  const plannedSessionsToday = getPlannedSessions(state).filter(session => session.date === dateKey);
  const eventsToday = (state.calendar?.events || [])
    .filter(event => event.date === dateKey)
    .slice()
    .sort((left, right) => `${left.time || "99:99"}${left.title || ""}`.localeCompare(`${right.time || "99:99"}${right.title || ""}`));
  const loggedMealsToday = (state.nutrition?.meals || []).filter(meal => meal.date === dateKey);
  const executedSessionsToday = (state.training?.sessions || []).filter(session => session.date === dateKey);
  const symptomsToday = Array.isArray(state.cycle?.symptomLog?.[dateKey]) ? state.cycle.symptomLog[dateKey] : [];
  const sleepEntry = state.sleepEntries?.[dateKey] || null;
  const weeklyHealth = getWeeklyHealthInsights(state, inputDate);
  const calibration = getWeeklyCalibrationBoard(state, inputDate);
  const dayPressure = calibration.dayEntries.find(day => day.date === dateKey) || null;
  const priorities = getWeeklyPriorityBoard(state, inputDate);
  const reviewSummary = getWeeklyReviewSummary(state, inputDate);
  const hydrationToday = Number(state.nutrition?.waterLog?.[dateKey] || 0);
  const hydrationGoal = Number(state.nutrition?.waterGoal || 8);
  const mealProgress = {
    done: plannedMealsToday.filter(meal => meal.status === "done").length,
    total: plannedMealsToday.length
  };
  const sessionProgress = {
    done: plannedSessionsToday.filter(session => session.status === "done").length,
    total: plannedSessionsToday.length
  };

  const blockers = [];
  if (eventsToday.length >= 3) blockers.push("Agenda cargada");
  if (plannedMealsToday.length === 0) blockers.push("Sin comida prevista");
  if (plannedSessionsToday.length === 0) blockers.push("Sin entreno previsto");
  if (sleepEntry && Number(sleepEntry.hours || 0) < 7) blockers.push("Recuperacion corta");
  if (symptomsToday.some(item => Number(item.intensity || 0) >= 4)) blockers.push("Sintomas intensos");
  if (weeklyHealth.cycleContext.phase === "menstrual") blockers.push("Fase menstrual");

  const focusAreas = [];
  if (mealProgress.total > 0 && mealProgress.done < mealProgress.total) focusAreas.push("cerrar comidas previstas");
  if (sessionProgress.total > 0 && sessionProgress.done < sessionProgress.total) focusAreas.push("proteger entreno realista");
  if (eventsToday.length > 0) focusAreas.push("ordenar agenda");
  if (hydrationToday < hydrationGoal) focusAreas.push("subir hidratacion");
  if (sleepEntry && Number(sleepEntry.hours || 0) < 7) focusAreas.push("bajar friccion");

  let focusHeadline = "Dia estable para ejecutar lo previsto con poca friccion.";
  if (dayPressure?.status === "overloaded") {
    focusHeadline = "Dia de carga alta: simplificar decisiones y proteger energia.";
  } else if (dayPressure?.status === "watch") {
    focusHeadline = "Dia delicado: conviene ajustar el plan antes de forzarlo.";
  } else if (weeklyHealth.cycleContext.phase === "menstrual") {
    focusHeadline = "Dia de fase menstrual: priorizar suavidad, descanso y minima friccion.";
  }

  return {
    date: dateKey,
    eventsToday,
    plannedMealsToday,
    plannedSessionsToday,
    loggedMealsToday,
    executedSessionsToday,
    symptomsToday,
    sleepEntry,
    weeklyHealth,
    calibration,
    dayPressure,
    priorities,
    reviewSummary,
    hydrationToday,
    hydrationGoal,
    mealProgress,
    sessionProgress,
    blockers,
    focusAreas,
    focusHeadline,
    topPriority: priorities[0] || null
  };
}

export function getTodayDecisionBoard(state, inputDate = new Date()) {
  const dailyCommand = getDailyCommandCenter(state, inputDate);
  const dateKey = dailyCommand.date;
  const baseDate = new Date(dateKey);
  const plannedMeals = getPlannedMeals(state);
  const plannedSessions = getPlannedSessions(state);
  const carryovers = [];

  for (let index = 1; index <= 2; index += 1) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() - index);
    const key = date.toISOString().slice(0, 10);

    plannedMeals
      .filter(meal => meal.date === key && meal.status !== "done")
      .forEach(meal => {
        carryovers.push({
          id: `carry-meal-${meal.id}`,
          kind: "comida",
          date: key,
          title: `${meal.slot}: ${meal.name}`,
          status: meal.status
        });
      });

    plannedSessions
      .filter(session => session.date === key && session.status !== "done")
      .forEach(session => {
        carryovers.push({
          id: `carry-session-${session.id}`,
          kind: "entreno",
          date: key,
          title: `${session.type}: ${session.activity}`,
          status: session.status
        });
      });
  }

  const doNow = [];
  const lighten = [];
  const captureNow = [];
  const supportBlocks = [];

  if (dailyCommand.mealProgress.total > 0 && dailyCommand.mealProgress.done < dailyCommand.mealProgress.total) {
    doNow.push("cerrar primero las comidas previstas de hoy");
  }
  if (dailyCommand.sessionProgress.total > 0 && dailyCommand.sessionProgress.done < dailyCommand.sessionProgress.total) {
    doNow.push("decidir ya si el entreno de hoy va entero, parcial o se suelta");
  }
  if (dailyCommand.eventsToday.length > 0) {
    doNow.push("mirar agenda antes de improvisar el resto del dia");
  }
  if (dailyCommand.hydrationToday < dailyCommand.hydrationGoal) {
    doNow.push("subir hidratacion antes de que el dia se cierre");
  }

  if (dailyCommand.dayPressure?.status === "overloaded") {
    lighten.push("simplificar decisiones y evitar meter mas frentes hoy");
    supportBlocks.push({ kind: "recovery", title: "Recuperacion", reason: "presion alta hoy" });
  } else if (dailyCommand.dayPressure?.status === "watch") {
    lighten.push("bajar ambicion y proteger energia disponible");
    supportBlocks.push({ kind: "focus", title: "Ajuste de agenda", reason: "dia en vigilancia" });
  }
  if (dailyCommand.weeklyHealth.cycleContext.phase === "menstrual") {
    lighten.push("dejar el dia mas suave por fase menstrual");
    supportBlocks.push({ kind: "recovery", title: "Recuperacion", reason: "fase menstrual" });
  }
  if (dailyCommand.sleepEntry && Number(dailyCommand.sleepEntry.hours || 0) < 7) {
    lighten.push("tratar el cansancio como dato operativo, no como fallo");
  }

  if (dailyCommand.symptomsToday.length === 0) {
    captureNow.push("registrar como estas de energia, animo o digestion");
  }
  if (dailyCommand.loggedMealsToday.length === 0) {
    captureNow.push("dejar al menos una comida registrada hoy");
  }
  if (dailyCommand.executedSessionsToday.length === 0 && dailyCommand.sessionProgress.done === 0) {
    captureNow.push("cerrar si hoy hubo entreno real o no");
  }
  if (carryovers.length > 0) {
    captureNow.push("revisar arrastres recientes antes de seguir acumulando friccion");
  }
  if (dailyCommand.plannedMealsToday.length >= 2) {
    supportBlocks.push({ kind: "meal-prep", title: "Meal prep express", reason: "varias comidas por resolver" });
  }

  const dedupedSupportBlocks = Array.from(
    new Map(supportBlocks.map(item => [item.kind, item])).values()
  );

  return {
    date: dateKey,
    doNow,
    lighten,
    captureNow,
    carryovers: carryovers.slice(0, 6),
    supportBlocks: dedupedSupportBlocks
  };
}

export function getOperationalTimeline(state, inputDate = new Date()) {
  const startDate = inputDate instanceof Date ? new Date(inputDate) : new Date(inputDate);
  const startKey = startDate.toISOString().slice(0, 10);
  const dateWindow = [];
  for (let index = 0; index < 4; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    dateWindow.push(date.toISOString().slice(0, 10));
  }
  const plannedMeals = getPlannedMeals(state);
  const plannedSessions = getPlannedSessions(state);
  const events = Array.isArray(state.calendar?.events) ? state.calendar.events : [];
  const checklist = getWeeklyChecklist(state, currentWeekStartKey());
  const calibration = getWeeklyCalibrationBoard(state, startDate);
  const resetDay = state.weekly?.resetDay || "Domingo";
  const resetDate = dateKeyForResetDay(startDate, resetDay);
  const entries = [];

  dateWindow.forEach(date => {
    const pressure = calibration.dayEntries.find(day => day.date === date) || null;

    events
      .filter(event => event.date === date)
      .forEach(event => {
        entries.push({
          id: `event-${event.id}`,
          date,
          time: event.time || "99:99",
          kind: "evento",
          title: event.title,
          detail: `${event.category || "agenda"}${pressure ? ` - presion ${pressure.status}` : ""}`,
          urgency: pressure?.status === "overloaded" ? 3 : 2
        });
      });

    plannedMeals
      .filter(meal => meal.date === date)
      .forEach(meal => {
        entries.push({
          id: `meal-${meal.id}`,
          date,
          time: meal.slot === "Desayuno" ? "08:00" : meal.slot === "Comida" ? "14:00" : meal.slot === "Cena" ? "21:00" : "17:00",
          kind: "comida",
          title: `${meal.slot}: ${meal.name}`,
          detail: meal.status === "done" ? "ya marcada como hecha" : `estado ${meal.status}`,
          urgency: meal.status === "done" ? 0 : pressure?.status === "overloaded" ? 2 : 1
        });
      });

    plannedSessions
      .filter(session => session.date === date)
      .forEach(session => {
        entries.push({
          id: `session-${session.id}`,
          date,
          time: "19:00",
          kind: "entreno",
          title: `${session.type}: ${session.activity}`,
          detail: session.status === "done" ? "ya ejecutado" : `${session.duration || 0} min - ${session.status}`,
          urgency: session.status === "done" ? 0 : pressure?.status === "overloaded" ? 2 : 1
        });
      });

    if (date === resetDate) {
      entries.push({
        id: `reset-${date}`,
        date,
        time: "18:30",
        kind: "reset",
        title: "Reset semanal",
        detail: `${checklist.filter(item => !item.done).length} tareas pendientes en checklist`,
        urgency: checklist.some(item => !item.done) ? 3 : 1
      });
    }
  });

  checklist
    .filter(item => !item.done)
    .slice(0, 4)
    .forEach((item, index) => {
      entries.push({
        id: `checklist-${item.id}`,
        date: resetDate >= startKey ? resetDate : startKey,
        time: `20:0${Math.min(index, 5)}`,
        kind: "checklist",
        title: item.title,
        detail: "pendiente del sistema semanal",
        urgency: 2
      });
    });

  return entries
    .filter(item => item.urgency > 0)
    .sort((left, right) =>
      left.date.localeCompare(right.date) ||
      left.time.localeCompare(right.time) ||
      right.urgency - left.urgency ||
      left.title.localeCompare(right.title)
    )
    .slice(0, 12);
}

function dayIndexFromResetDay(resetDay) {
  const normalized = normalizeTaskTitle(resetDay);
  const map = new Map([
    ["domingo", 0],
    ["lunes", 1],
    ["martes", 2],
    ["miercoles", 3],
    ["jueves", 4],
    ["viernes", 5],
    ["sabado", 6]
  ]);
  return map.get(normalized) ?? 0;
}

export function dateKeyForResetDay(inputDate = new Date(), resetDay = "Domingo") {
  const startKey = weekStartKeyFromDate(inputDate);
  const start = new Date(startKey);
  const targetDay = dayIndexFromResetDay(resetDay);
  const mondayIndex = 1;
  const offset = targetDay === 0 ? 6 : targetDay - mondayIndex;
  start.setDate(start.getDate() + offset);
  return start.toISOString().slice(0, 10);
}

export function getWeeklyChecklist(state, weekKey = currentWeekStartKey()) {
  const checklist = state?.weekly?.checklists?.[weekKey];
  return Array.isArray(checklist) ? checklist : [];
}

export function replaceWeeklyChecklist(state, weekKey, nextItems) {
  return {
    ...state,
    weekly: {
      resetDay: state?.weekly?.resetDay || "Domingo",
      checklists: {
        ...(state?.weekly?.checklists || {}),
        [weekKey]: nextItems
      },
      reviews: {
        ...(state?.weekly?.reviews || {})
      }
    }
  };
}

export function getWeeklyReviewProgress(state, weekKey = currentWeekStartKey()) {
  const reviewState = state?.weekly?.reviews?.[weekKey];
  return reviewState && typeof reviewState === "object" && !Array.isArray(reviewState) ? reviewState : {};
}

export function replaceWeeklyReviewProgress(state, weekKey, nextProgress) {
  return {
    ...state,
    weekly: {
      resetDay: state?.weekly?.resetDay || "Domingo",
      checklists: {
        ...(state?.weekly?.checklists || {})
      },
      reviews: {
        ...(state?.weekly?.reviews || {}),
        [weekKey]: nextProgress
      }
    }
  };
}

export function toggleWeeklyReviewStep(state, weekKey, stepKey) {
  const current = getWeeklyReviewProgress(state, weekKey);
  const nextProgress = {
    ...current,
    [stepKey]: !current[stepKey]
  };
  return replaceWeeklyReviewProgress(state, weekKey, nextProgress);
}

function normalizeTaskTitle(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function addWeeklyTasks(state, weekKey, titles = []) {
  const existing = getWeeklyChecklist(state, weekKey);
  const seen = new Set(existing.map(item => normalizeTaskTitle(item.title)));
  const additions = [];

  titles.forEach(title => {
    const normalized = normalizeTaskTitle(title);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    additions.push({
      id: Date.now() + Math.random() + additions.length,
      title,
      done: false
    });
  });

  if (additions.length === 0) {
    return state;
  }

  return replaceWeeklyChecklist(state, weekKey, [...existing, ...additions]);
}

export function getSuggestedWeeklyTasks(state, inputDate = new Date()) {
  const weekKeys = new Set(weekKeysFromDate(inputDate));
  const plannedMeals = getPlannedMeals(state).filter(meal => weekKeys.has(meal.date));
  const plannedSessions = getPlannedSessions(state).filter(session => weekKeys.has(session.date));
  const loggedMeals = state.nutrition.meals.filter(meal => weekKeys.has(meal.date));
  const events = state.calendar.events.filter(event => weekKeys.has(event.date));
  const nutritionReview = getWeeklyNutritionReview({
    plannedMeals,
    loggedMeals,
    recipes: state.recipes
  });
  const nutritionPrepBoard = getWeeklyNutritionPrepBoard({
    plannedMeals,
    loggedMeals,
    recipes: state.recipes
  });
  const calibration = getWeeklyCalibrationBoard(state, inputDate);
  const sessionSuggestions = getSuggestedWeeklySessions(state, inputDate);

  const suggested = [];

  nutritionReview.prepSuggestions.forEach(title => {
    suggested.push({ kind: "prep", title });
  });

  nutritionPrepBoard.checklistTitles.slice(0, 3).forEach(title => {
    suggested.push({ kind: "batch", title });
  });

  calibration.suggestedTasks.slice(0, 3).forEach(title => {
    suggested.push({ kind: "calibration", title });
  });

  if (nutritionReview.groupedShoppingList.length > 0) {
    suggested.push({
      kind: "shopping",
      title: `Cerrar compra semanal por familias: ${nutritionReview.groupedShoppingList.slice(0, 2).map(group => group.family).join(" y ")}.`
    });
  }

  if (nutritionReview.variety.missingFamilies.length > 0) {
    suggested.push({
      kind: "variety",
      title: `Meter una opcion de ${nutritionReview.variety.missingFamilies[0]} en la semana.`
    });
  }

  if (plannedSessions.length > 0) {
    suggested.push({
      kind: "training",
      title: `Dejar cerradas ${plannedSessions.length} sesiones planificadas con hueco real en agenda.`
    });
  }

  if (sessionSuggestions.length > 0) {
    suggested.push({
      kind: "training-fill",
      title: `Completar ${sessionSuggestions.length} huecos de entreno con sesiones sugeridas.`
    });
  }

  if (events.length >= 2) {
    suggested.push({
      kind: "agenda",
      title: `Revisar agenda y ajustar comida/entreno alrededor de ${events.length} eventos.`
    });
  }

  const existingChecklist = getWeeklyChecklist(state, weekStartKeyFromDate(inputDate));
  const existingTitles = new Set(existingChecklist.map(item => normalizeTaskTitle(item.title)));

  return suggested.filter(item => !existingTitles.has(normalizeTaskTitle(item.title)));
}

export function getWeeklyPreparationPack(state, inputDate = new Date()) {
  const weekKey = weekStartKeyFromDate(inputDate);
  const weekKeys = new Set(weekKeysFromDate(inputDate));
  const plannedMeals = getPlannedMeals(state).filter(meal => weekKeys.has(meal.date));
  const plannedSessions = getPlannedSessions(state).filter(session => weekKeys.has(session.date));
  const loggedMeals = state.nutrition.meals.filter(meal => weekKeys.has(meal.date));
  const loggedSessions = state.training.sessions.filter(session => weekKeys.has(session.date));
  const checklist = getWeeklyChecklist(state, weekKey);
  const nutritionReview = getWeeklyNutritionReview({
    plannedMeals,
    loggedMeals,
    recipes: state.recipes
  });
  const nutritionPrepBoard = getWeeklyNutritionPrepBoard({
    plannedMeals,
    loggedMeals,
    recipes: state.recipes
  });
  const calibration = getWeeklyCalibrationBoard(state, inputDate);
  const health = getWeeklyHealthInsights(state);
  const suggestedMealSlots = getSuggestedWeeklyMealSlots({
    weekDates: Array.from(weekKeys),
    plannedMeals,
    recipes: state.recipes,
    loggedMeals,
    events: state.calendar.events.filter(event => weekKeys.has(event.date)),
    pressureByDate: Object.fromEntries(calibration.dayEntries.map(day => [day.date, day])),
    mealAdherence: calibration.mealAdherence,
    cyclePhase: health.cycleContext.phase,
    digestionHeavyCount: health.digestionHeavyCount
  });
  const suggestedSessions = getSuggestedWeeklySessions(state, inputDate);
  const suggestions = getSuggestedWeeklyTasks(state, inputDate);

  const checklistDone = checklist.filter(item => item.done).length;
  const checklistRatio = checklist.length > 0 ? checklistDone / checklist.length : 0;
  const mealRatio = plannedMeals.length > 0 ? plannedMeals.filter(meal => meal.status === "done").length / plannedMeals.length : 0;
  const sessionRatio =
    plannedSessions.length > 0 ? plannedSessions.filter(session => session.status === "done").length / plannedSessions.length : 0;
  const varietyRatio = nutritionReview.variety.total > 0 ? nutritionReview.variety.covered / nutritionReview.variety.total : 0;
  const readinessScore = Math.round((checklistRatio * 0.35 + mealRatio * 0.25 + sessionRatio * 0.2 + varietyRatio * 0.2) * 100);

  const steps = [
    {
      key: "shopping",
      title: "Compra agrupada",
      detail:
        nutritionReview.groupedShoppingList.length > 0
          ? nutritionReview.groupedShoppingList
              .slice(0, 2)
              .map(group => `${group.family}: ${group.items.slice(0, 2).map(item => item.name).join(", ")}`)
              .join(" - ")
          : "Todavia no hay compra derivada del planner.",
      state: nutritionReview.groupedShoppingList.length > 0 ? "ready" : "empty"
    },
    {
      key: "prep",
      title: "Bases a preparar",
      detail:
        nutritionPrepBoard.batchItems[0]?.detail ||
        nutritionReview.prepSuggestions[0] ||
        "Aun no hay una base clara para batch cooking.",
      state: nutritionPrepBoard.batchItems.length > 0 || nutritionReview.prepSuggestions.length > 0 ? "ready" : "empty"
    },
    {
      key: "training",
      title: "Entreno colocado",
      detail:
        plannedSessions.length > 0
          ? `${plannedSessions.length} sesiones previstas - ${loggedSessions.length} registradas`
          : "Aun no hay sesiones futuras cerradas.",
      state: plannedSessions.length > 0 ? "ready" : "empty"
    },
    {
      key: "review",
      title: "Foco de revision",
      detail:
        health.cycleContext.phase !== "sin-datos"
          ? `${nutritionReview.nextAction} - ${health.cycleContext.label}`
          : nutritionReview.nextAction,
      state: "ready"
    },
    {
      key: "gaps",
      title: "Huecos de comida",
      detail: suggestedMealSlots.length > 0 ? `${suggestedMealSlots.length} huecos de comida detectados para completar.` : "Sin huecos claros en el planner de comidas.",
      state: suggestedMealSlots.length > 0 ? "ready" : "empty"
    },
    {
      key: "training-gaps",
      title: "Huecos de entreno",
      detail: suggestedSessions.length > 0 ? `${suggestedSessions.length} sesiones sugeridas para estructurar la semana.` : "Sin huecos claros en el planner de entreno.",
      state: suggestedSessions.length > 0 ? "ready" : "empty"
    }
  ];

  let headline = "Semana lista para afinar.";
  if (readinessScore < 35) {
    headline = "Semana todavia poco preparada.";
  } else if (readinessScore < 70) {
    headline = "Semana encaminada, pero con huecos.";
  }

  return {
    readinessScore,
    headline,
    resetDay: state.weekly?.resetDay || "Domingo",
    resetDate: dateKeyForResetDay(inputDate, state.weekly?.resetDay || "Domingo"),
    checklist: {
      total: checklist.length,
      done: checklistDone
    },
    plannedMeals: plannedMeals.length,
    plannedSessions: plannedSessions.length,
    nutritionReview,
    nutritionPrepBoard,
    calibration,
    suggestedMealSlots,
    suggestedSessions,
    suggestions,
    steps
  };
}

export function getSuggestedResetBlock(state, inputDate = new Date()) {
  const resetDay = state.weekly?.resetDay || "Domingo";
  const resetDate = dateKeyForResetDay(inputDate, resetDay);
  const pack = getWeeklyPreparationPack(state, inputDate);
  return {
    title: "Reset semanal",
    day: resetDay,
    date: resetDate,
    start: "10:00",
    end: "11:30",
    category: "Organizacion",
    note: `${pack.headline} - readiness ${pack.readinessScore}/100`
  };
}

export function hasResetBlockForWeek(state, inputDate = new Date()) {
  const resetDay = state.weekly?.resetDay || "Domingo";
  return (state.schedule?.blocks || []).some(block => normalizeTaskTitle(block.title) === "reset semanal" && normalizeTaskTitle(block.day) === normalizeTaskTitle(resetDay));
}

export function ensureWeeklyResetBlock(state, inputDate = new Date()) {
  if (hasResetBlockForWeek(state, inputDate)) {
    return state;
  }

  const block = getSuggestedResetBlock(state, inputDate);
  return {
    ...state,
    schedule: {
      ...(state.schedule || {}),
      blocks: [
        ...((state.schedule && Array.isArray(state.schedule.blocks)) ? state.schedule.blocks : []),
        {
          id: Date.now() + Math.random(),
          title: block.title,
          day: block.day,
          start: block.start,
          end: block.end,
          category: block.category,
          note: block.note,
          linkedDate: block.date
        }
      ]
    }
  };
}

export function applyWeeklyResetRoutine(state, inputDate = new Date()) {
  const weekKey = weekStartKeyFromDate(inputDate);
  const suggestionTitles = getSuggestedWeeklyTasks(state, inputDate).map(item => item.title);
  const withTasks = addWeeklyTasks(state, weekKey, suggestionTitles);
  const mealSuggestions = getWeeklyPreparationPack(withTasks, inputDate).suggestedMealSlots.map((meal, index) => ({
    ...meal,
    id: Date.now() + Math.random() + index
  }));
  const sessionSuggestions = getSuggestedWeeklySessions(withTasks, inputDate).map((session, index) => ({
    ...session,
    id: Date.now() + Math.random() + 100 + index
  }));
  const withMeals = mealSuggestions.length > 0 ? replacePlannedMeals(withTasks, mealSuggestions) : withTasks;
  const withSessions = sessionSuggestions.length > 0 ? replacePlannedSessions(withMeals, sessionSuggestions) : withMeals;
  return ensureWeeklyResetBlock(withSessions, inputDate);
}

export function getSuggestedWeeklySessions(state, inputDate = new Date()) {
  const weekDates = weekKeysFromDate(inputDate);
  const plannedSessions = getPlannedSessions(state);
  const routines = Array.isArray(state.training?.routines) ? state.training.routines : [];
  const events = Array.isArray(state.calendar?.events) ? state.calendar.events : [];
  const calibration = getWeeklyCalibrationBoard(state, inputDate);
  const health = getWeeklyHealthInsights(state);
  const cyclePhase = health.cycleContext.phase;
  const pressureByDate = new Map(calibration.dayEntries.map(day => [day.date, day]));
  const eventLoadByDate = new Map(weekDates.map(date => [date, events.filter(event => event.date === date).length]));
  const routinePool = routines.map(routine => {
    const focus = normalizeTaskTitle(routine.focus || "");
    let type = "Fuerza";
    let duration = 60;
    if (focus.includes("cardio")) {
      type = "Cardio";
      duration = 35;
    } else if (focus.includes("movilidad") || focus.includes("recovery") || focus.includes("recuper")) {
      type = "Movilidad";
      duration = 20;
    }
    return {
      type,
      activity: routine.name,
      duration,
      routineName: routine.name,
      focus: routine.focus || ""
    };
  });
  const defaults = routinePool.length
    ? routinePool
    : [
        { type: "Fuerza", activity: "Fuerza base", duration: 60, routineName: "", focus: "Fuerza" },
        { type: "Cardio", activity: "Cardio suave", duration: 35, routineName: "", focus: "Cardio" },
        { type: "Movilidad", activity: "Movilidad general", duration: 20, routineName: "", focus: "Movilidad" }
      ];
  const targetDates = [weekDates[0], weekDates[2], weekDates[4], weekDates[6]].filter(Boolean);
  const suggestions = [];

  targetDates.forEach((date, index) => {
    const existing = plannedSessions.find(session => session.date === date);
    if (existing) return;
    const dayLoad = eventLoadByDate.get(date) || 0;
    const dayPressure = pressureByDate.get(date);
    const isOverloaded = dayPressure?.status === "overloaded";
    const isWatch = dayPressure?.status === "watch";
    const lowAdherenceWeek = calibration.sessionAdherence < 60;
    const cycleSensitive = cyclePhase === "menstrual" || (cyclePhase === "lutea" && (health.avgEnergy > 0 && health.avgEnergy <= 3 || health.avgMood > 0 && health.avgMood <= 3));
    const candidatePool =
      dayLoad >= 2 || isOverloaded || lowAdherenceWeek || cycleSensitive
        ? defaults.filter(item => item.type !== "Fuerza")
        : isWatch
          ? defaults.filter(item => item.type !== "Fuerza" || item.duration <= 45)
          : defaults;
    const fallback = candidatePool[index % candidatePool.length] || defaults[index % defaults.length] || defaults[defaults.length - 1];
    const adjustedDuration =
      isOverloaded || lowAdherenceWeek || cycleSensitive
        ? Math.min(fallback.duration, fallback.type === "Movilidad" ? 20 : 35)
        : isWatch && fallback.type === "Fuerza"
          ? Math.min(fallback.duration, 45)
          : fallback.duration;
    const reason =
      dayLoad >= 2
        ? "agenda-cargada"
        : isOverloaded
          ? "recalibracion-carga"
          : lowAdherenceWeek
            ? "adherencia-baja"
            : cycleSensitive
              ? `ciclo-${cyclePhase}`
            : isWatch
              ? "vigilancia-recuperacion"
              : fallback.focus || "estructura-semanal";
    suggestions.push({
      id: `${date}-${fallback.type}`,
      date,
      type: fallback.type,
      activity: fallback.activity,
      duration: adjustedDuration,
      status: "planned",
      routineName: fallback.routineName,
      notes:
        dayLoad >= 2
          ? "Sesion sugerida ligera por agenda cargada."
          : isOverloaded
            ? "Sesion simplificada por semana sobrecargada."
            : lowAdherenceWeek
              ? "Sesion recortada para recuperar adherencia sin generar deuda."
              : cycleSensitive
                ? "Sesion suavizada por fase del ciclo o energia sintomatica mas delicada."
              : isWatch
                ? "Sesion afinada para no tensar mas la recuperacion."
                : "Sesion sugerida para dar estructura minima a la semana.",
      reason
    });
  });

  return suggestions;
}

export function getWeeklyPriorityBoard(state, inputDate = new Date()) {
  const preparationPack = getWeeklyPreparationPack(state, inputDate);
  const health = getWeeklyHealthInsights(state);
  const priorities = [];

  if (preparationPack.readinessScore < 40) {
    priorities.push({
      id: "weekly-readiness",
      title: "Cerrar primero la preparacion de la semana",
      detail: `${preparationPack.readinessScore}/100 de readiness y ${preparationPack.suggestions.length} acciones pendientes.`,
      area: "planificacion",
      severity: 3
    });
  }

  if (preparationPack.suggestedMealSlots.length >= 3) {
    priorities.push({
      id: "meal-gaps",
      title: "Completar huecos del meal planner",
      detail: `${preparationPack.suggestedMealSlots.length} slots de comida aun abiertos.`,
      area: "nutricion",
      severity: 2
    });
  }

  if (preparationPack.suggestedSessions.length >= 2) {
    priorities.push({
      id: "session-gaps",
      title: "Cerrar la estructura minima de entreno",
      detail: `${preparationPack.suggestedSessions.length} sesiones futuras sugeridas aun sin aplicar.`,
      area: "entreno",
      severity: 2
    });
  }

  if (health.avgSleepHours > 0 && health.avgSleepHours < 7) {
    priorities.push({
      id: "sleep",
      title: "Proteger recuperacion esta semana",
      detail: `Sueno medio en ${health.avgSleepHours.toFixed(1)} h con impacto probable en energia y adherencia.`,
      area: "recuperacion",
      severity: 3
    });
  }

  if (health.mealSignals.length > 0) {
    priorities.push({
      id: "tolerance",
      title: "Revisar tolerancia alimentaria",
      detail: `${health.mealSignals[0].name} se repite en comidas con malestar.`,
      area: "nutricion",
      severity: 2
    });
  }

  if (health.signals.some(signal => signal.kind === "training" || signal.kind === "training-energy")) {
    priorities.push({
      id: "training-adherence",
      title: "Bajar friccion del entreno previsto",
      detail: "La semana muestra senales de baja adherencia o energia previa floja.",
      area: "entreno",
      severity: 2
    });
  }

  if (priorities.length === 0) {
    priorities.push({
      id: "stable-week",
      title: "Semana estable",
      detail: "No hay un frente dominante; toca mantener registro y ajustar fino.",
      area: "general",
      severity: 1
    });
  }

  return priorities
    .sort((left, right) => right.severity - left.severity || left.title.localeCompare(right.title))
    .slice(0, 5);
}

export function getWeeklyCalibrationBoard(state, inputDate = new Date()) {
  const weekDates = weekKeysFromDate(inputDate);
  const plannedMeals = getPlannedMeals(state);
  const plannedSessions = getPlannedSessions(state);
  const loggedMeals = Array.isArray(state.nutrition?.meals) ? state.nutrition.meals : [];
  const executedSessions = Array.isArray(state.training?.sessions) ? state.training.sessions : [];
  const events = Array.isArray(state.calendar?.events) ? state.calendar.events : [];
  const symptomLog = state.cycle?.symptomLog || {};
  const health = getWeeklyHealthInsights(state);

  const dayEntries = weekDates.map(date => {
    const dayPlannedMeals = plannedMeals.filter(meal => meal.date === date);
    const dayPlannedSessions = plannedSessions.filter(session => session.date === date);
    const dayLoggedMeals = loggedMeals.filter(meal => meal.date === date);
    const dayExecutedSessions = executedSessions.filter(session => session.date === date);
    const dayEvents = events.filter(event => event.date === date);
    const daySymptoms = Array.isArray(symptomLog[date]) ? symptomLog[date] : [];
    const sleepEntry = state.sleepEntries?.[date] || null;
    const symptomIntensity =
      daySymptoms.length > 0
        ? daySymptoms.reduce((sum, item) => sum + Number(item.intensity || 0), 0) / daySymptoms.length
        : 0;
    const plannedMealDone = dayPlannedMeals.filter(meal => meal.status === "done").length;
    const plannedSessionDone = dayPlannedSessions.filter(session => session.status === "done").length;
    const sessionEnergyDrop = dayExecutedSessions.filter(session => Number(session.preEnergy || 0) > 0 && Number(session.preEnergy || 0) <= 2).length;
    const dominantCyclePressure =
      health.cycleContext.phase === "menstrual"
        ? 2
        : health.cycleContext.phase === "lutea" && (health.avgEnergy > 0 && health.avgEnergy <= 3 || health.avgMood > 0 && health.avgMood <= 3)
          ? 1
          : 0;

    let pressureScore = 0;
    pressureScore += dayEvents.length * 1.5;
    pressureScore += dayPlannedSessions.length;
    pressureScore += dayPlannedMeals.length >= 3 ? 1 : 0;
    pressureScore += sleepEntry && Number(sleepEntry.hours || 0) < 7 ? 2 : 0;
    pressureScore += symptomIntensity >= 3 ? 2 : symptomIntensity >= 2 ? 1 : 0;
    pressureScore += sessionEnergyDrop > 0 ? 1 : 0;
    pressureScore += dominantCyclePressure;

    let status = "stable";
    if (pressureScore >= 5) status = "overloaded";
    else if (pressureScore >= 3) status = "watch";

    let recommendation = "Mantener el plan y registrar lo importante.";
    if (status === "overloaded") {
      recommendation = dayPlannedSessions.length > 0
        ? "Simplificar comida y bajar friccion del entreno previsto."
        : "Simplificar comidas y proteger recuperacion.";
    } else if (status === "watch") {
      recommendation = dayEvents.length >= 2
        ? "Dejar cerrado lo esencial antes de que la agenda apriete."
        : "Vigilar energia y no improvisar de mas.";
    }

    return {
      date,
      status,
      pressureScore,
      events: dayEvents.length,
      plannedMeals: dayPlannedMeals.length,
      plannedMealDone,
      loggedMeals: dayLoggedMeals.length,
      plannedSessions: dayPlannedSessions.length,
      plannedSessionDone,
      executedSessions: dayExecutedSessions.length,
      sleepHours: Number(sleepEntry?.hours || 0),
      symptomIntensity,
      recommendation
    };
  });

  const totalPlannedMeals = dayEntries.reduce((sum, day) => sum + day.plannedMeals, 0);
  const totalDoneMeals = dayEntries.reduce((sum, day) => sum + day.plannedMealDone, 0);
  const totalPlannedSessions = dayEntries.reduce((sum, day) => sum + day.plannedSessions, 0);
  const totalDoneSessions = dayEntries.reduce((sum, day) => sum + day.plannedSessionDone, 0);
  const mealAdherence = totalPlannedMeals > 0 ? Math.round((totalDoneMeals / totalPlannedMeals) * 100) : 0;
  const sessionAdherence = totalPlannedSessions > 0 ? Math.round((totalDoneSessions / totalPlannedSessions) * 100) : 0;
  const overloadedDays = dayEntries.filter(day => day.status === "overloaded");
  const watchDays = dayEntries.filter(day => day.status === "watch");
  const topPressureDay = dayEntries.slice().sort((left, right) => right.pressureScore - left.pressureScore || left.date.localeCompare(right.date))[0] || null;

  const suggestedTasks = [];
  if (overloadedDays.length > 0) {
    suggestedTasks.push(`Bajar exigencia en ${overloadedDays[0].date} y dejar solo lo esencial.`);
  }
  if (mealAdherence < 60 && totalPlannedMeals > 0) {
    suggestedTasks.push("Revisar por que el plan de comidas no se esta ejecutando y simplificarlo.");
  }
  if (sessionAdherence < 60 && totalPlannedSessions > 0) {
    suggestedTasks.push("Reducir friccion del entreno previsto y ajustar carga a energia real.");
  }
  if (watchDays.length >= 2) {
    suggestedTasks.push("Proteger dos dias de margen con comida facil y agenda menos cargada.");
  }
  if (health.cycleContext.phase === "menstrual") {
    suggestedTasks.push("Adaptar la semana a fase menstrual con menos friccion y mas recuperacion.");
  } else if (health.cycleContext.phase === "lutea" && (health.avgEnergy > 0 && health.avgEnergy <= 3 || health.avgMood > 0 && health.avgMood <= 3)) {
    suggestedTasks.push("Bajar complejidad en fase lutea para no tensionar energia ni animo.");
  }

  let nextAdjustment = "Semana estable: mantener registro y pequenos ajustes.";
  if (topPressureDay?.status === "overloaded") {
    nextAdjustment = `El dia mas cargado es ${topPressureDay.date}; conviene simplificar comida, agenda o entreno.`;
  } else if (mealAdherence < 60 && totalPlannedMeals > 0) {
    nextAdjustment = "La comida planificada se esta ejecutando poco; conviene recortar complejidad.";
  } else if (sessionAdherence < 60 && totalPlannedSessions > 0) {
    nextAdjustment = "El entreno previsto va por detras de la realidad; mejor ajustar antes que acumular deuda.";
  }

  const note = [
    "Recalibracion semanal",
    "",
    `Adherencia comidas: ${totalDoneMeals}/${totalPlannedMeals} (${mealAdherence}%)`,
    `Adherencia entreno: ${totalDoneSessions}/${totalPlannedSessions} (${sessionAdherence}%)`,
    `Dias en vigilancia: ${watchDays.length}`,
    `Dias sobrecargados: ${overloadedDays.length}`,
    "",
    "Mapa diario",
    ...dayEntries.map(day => `- ${day.date}: ${day.status} - presion ${day.pressureScore.toFixed(1)} - eventos ${day.events} - comida ${day.plannedMealDone}/${day.plannedMeals} - entreno ${day.plannedSessionDone}/${day.plannedSessions}${day.sleepHours ? ` - sueno ${day.sleepHours.toFixed(1)} h` : ""}`),
    "",
    `Siguiente ajuste: ${nextAdjustment}`
  ].join("\n");

  return {
    cycleContext: health.cycleContext,
    dayEntries,
    mealAdherence,
    sessionAdherence,
    overloadedDays: overloadedDays.length,
    watchDays: watchDays.length,
    topPressureDay,
    nextAdjustment,
    suggestedTasks,
    note
  };
}

export function summarizeWeeklyReviewFlow(flow = []) {
  const total = flow.length;
  const done = flow.filter(step => step.done).length;
  const attention = flow.filter(step => step.status === "attention").length;
  const pendingSteps = flow.filter(step => !step.done);
  const nextStep = pendingSteps[0] || null;
  const completion = total > 0 ? Math.round((done / total) * 100) : 0;

  return {
    total,
    done,
    attention,
    completion,
    nextStep,
    pending: pendingSteps.length
  };
}

export function getWeeklyReviewFlow(state, inputDate = new Date()) {
  const weekKey = weekStartKeyFromDate(inputDate);
  const reviewProgress = getWeeklyReviewProgress(state, weekKey);
  const preparationPack = getWeeklyPreparationPack(state, inputDate);
  const priorities = getWeeklyPriorityBoard(state, inputDate);
  const health = getWeeklyHealthInsights(state);
  const calibration = getWeeklyCalibrationBoard(state, inputDate);

  const steps = [
    {
      key: "plan",
      title: "Cerrar preparacion base",
      status:
        preparationPack.readinessScore < 40
          ? "attention"
          : preparationPack.readinessScore < 70
            ? "in-progress"
            : "stable",
      detail: `${preparationPack.readinessScore}/100 de readiness y ${preparationPack.checklist.done}/${preparationPack.checklist.total} tareas del reset cerradas.`,
      action:
        preparationPack.readinessScore < 70
          ? "Aplicar reset sugerido y revisar checklist."
          : "Mantener la estructura semanal ya preparada.",
      cta: "apply-weekly-reset-routine"
    },
    {
      key: "meals",
      title: "Asegurar comida y tolerancia",
      status:
        preparationPack.suggestedMealSlots.length >= 3 || health.mealSignals.length > 0
          ? "attention"
          : preparationPack.suggestedMealSlots.length > 0
            ? "in-progress"
            : "stable",
      detail:
        health.mealSignals.length > 0
          ? `${health.mealSignals[0].name} aparece como ingrediente sensible y hay ${preparationPack.suggestedMealSlots.length} huecos de comida.`
          : `${preparationPack.suggestedMealSlots.length} huecos de comida pendientes.`,
      action:
        preparationPack.suggestedMealSlots.length > 0
          ? "Completar comidas sugeridas priorizando opciones simples."
          : "Mantener variedad y seguir observando tolerancia.",
      cta: preparationPack.suggestedMealSlots.length > 0 ? "apply-suggested-meal-slots" : ""
    },
    {
      key: "training",
      title: "Alinear entreno con energia real",
      status:
        preparationPack.suggestedSessions.length >= 2 || health.signals.some(signal => signal.kind === "training-energy")
          ? "attention"
          : preparationPack.suggestedSessions.length > 0
            ? "in-progress"
            : "stable",
      detail:
        preparationPack.suggestedSessions.length > 0
          ? `${preparationPack.suggestedSessions.length} sesiones futuras sugeridas y ${health.executedSessions} ejecutadas esta semana.`
          : `${health.executedSessions} sesiones ejecutadas esta semana.`,
      action:
        preparationPack.suggestedSessions.length > 0
          ? "Completar entrenos sugeridos con la menor friccion posible."
          : "Revisar si la carga encaja con tu recuperacion.",
      cta: preparationPack.suggestedSessions.length > 0 ? "apply-suggested-sessions" : ""
    },
    {
      key: "recovery",
      title: "Proteger descanso y energia",
      status:
        health.avgSleepHours > 0 && health.avgSleepHours < 7
          ? "attention"
          : health.avgSleepHours > 0 && health.avgSleepHours < 7.5
            ? "in-progress"
            : "stable",
      detail:
        health.avgSleepHours > 0
          ? `Sueno medio de ${health.avgSleepHours.toFixed(1)} h y ${health.signals.filter(signal => signal.kind === "recovery" || signal.kind === "fatigue").length} senales relacionadas.`
          : "Aun no hay suficiente sueno registrado para revisar.",
      action:
        health.avgSleepHours > 0 && health.avgSleepHours < 7
          ? "Bajar friccion de la semana y cuidar recuperacion."
          : "Mantener registro de descanso para afinar decisiones.",
      cta: ""
    },
    {
      key: "calibration",
      title: "Recalibrar la semana segun lo real",
      status:
        calibration.overloadedDays > 0 || calibration.mealAdherence < 60 || calibration.sessionAdherence < 60
          ? "attention"
          : calibration.watchDays > 1
            ? "in-progress"
            : "stable",
      detail: `${calibration.overloadedDays} dias sobrecargados - comida ${calibration.mealAdherence}% - entreno ${calibration.sessionAdherence}%.`,
      action: calibration.nextAdjustment,
      cta: "save-weekly-calibration-note"
    },
    {
      key: "focus",
      title: "Elegir un unico foco semanal",
      status: priorities.length > 0 ? "ready" : "stable",
      detail: priorities[0]?.title || "Semana estable sin un frente dominante.",
      action: priorities[0]?.detail || "Mantener seguimiento y ajustar fino.",
      cta: ""
    }
  ];

  return steps.map(step => ({
    ...step,
    done: Boolean(reviewProgress[step.key]),
    status: reviewProgress[step.key] ? "done" : step.status
  }));
}

export function getWeeklyReviewSummary(state, inputDate = new Date()) {
  return summarizeWeeklyReviewFlow(getWeeklyReviewFlow(state, inputDate));
}
