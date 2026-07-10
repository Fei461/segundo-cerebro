const VALID_PLAN_STATUSES = new Set(["planned", "done", "skipped", "partial"]);

function normalizeStatus(status) {
  return VALID_PLAN_STATUSES.has(status) ? status : "planned";
}

function normalizeDate(value) {
  return typeof value === "string" && value ? value : "";
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeFamilies(value) {
  if (!Array.isArray(value)) return [];
  return value.map(item => normalizeText(item)).filter(Boolean);
}

function normalizeExerciseLines(value) {
  if (Array.isArray(value)) {
    return value.map(item => normalizeText(item)).filter(Boolean);
  }
  return String(value || "")
    .split(/\r?\n|,/)
    .map(item => normalizeText(item))
    .filter(Boolean);
}

function normalizeMatchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function buildLegacyMealPlan(plannedMeals = []) {
  return plannedMeals.reduce((accumulator, meal) => {
    if (!meal.date || !meal.slot) {
      return accumulator;
    }

    const dayPlan = accumulator[meal.date] || {};
    dayPlan[meal.slot] = {
      id: meal.id,
      name: meal.name,
      recipeId: meal.recipeId || null,
      families: normalizeFamilies(meal.families),
      ingredientsText: normalizeText(meal.ingredientsText),
      notes: normalizeText(meal.notes),
      calories: normalizeNumber(meal.calories),
      protein: normalizeNumber(meal.protein),
      carbs: normalizeNumber(meal.carbs),
      fat: normalizeNumber(meal.fat),
      status: normalizeStatus(meal.status)
    };
    accumulator[meal.date] = dayPlan;
    return accumulator;
  }, {});
}

export function legacyMealPlanToPlannedMeals(legacyMealPlan = {}) {
  return Object.entries(legacyMealPlan || {}).flatMap(([date, slots]) =>
    Object.entries(slots || {}).map(([slot, item]) => ({
      id: item.id ?? `${date}-${slot}`,
      date,
      slot,
      name: normalizeText(item.name),
      recipeId: item.recipeId ?? null,
      families: normalizeFamilies(item.families),
      ingredientsText: normalizeText(item.ingredientsText),
      calories: normalizeNumber(item.calories),
      protein: normalizeNumber(item.protein),
      carbs: normalizeNumber(item.carbs),
      fat: normalizeNumber(item.fat),
      status: normalizeStatus(item.status),
      notes: normalizeText(item.notes)
    }))
  ).filter(meal => meal.date && meal.slot && meal.name);
}

export function getPlannedMeals(state) {
  const canonicalMeals = Array.isArray(state?.plans?.meals) ? state.plans.meals : [];
  if (canonicalMeals.length > 0) {
    return canonicalMeals
      .map(meal => ({
        id: meal.id,
        date: normalizeDate(meal.date),
        slot: normalizeText(meal.slot),
        name: normalizeText(meal.name),
        recipeId: meal.recipeId ?? null,
        families: normalizeFamilies(meal.families),
        ingredientsText: normalizeText(meal.ingredientsText),
        calories: normalizeNumber(meal.calories),
        protein: normalizeNumber(meal.protein),
        carbs: normalizeNumber(meal.carbs),
        fat: normalizeNumber(meal.fat),
        status: normalizeStatus(meal.status),
        notes: normalizeText(meal.notes)
      }))
      .filter(meal => meal.date && meal.slot && meal.name);
  }

  return legacyMealPlanToPlannedMeals(state?.mealPlan || {});
}

export function getPlannedMealsForDate(state, date) {
  return getPlannedMeals(state)
    .filter(meal => meal.date === date)
    .sort((left, right) => left.slot.localeCompare(right.slot));
}

export function getPlannedSessions(state) {
  const sessions = Array.isArray(state?.plans?.sessions) ? state.plans.sessions : [];
  return sessions
    .map(session => ({
      id: session.id,
      date: normalizeDate(session.date),
      type: normalizeText(session.type),
      activity: normalizeText(session.activity),
      duration: normalizeNumber(session.duration),
      status: normalizeStatus(session.status),
      structure: normalizeText(session.structure),
      exercises: normalizeExerciseLines(session.exercises),
      preEnergy: session.preEnergy == null ? null : normalizeNumber(session.preEnergy),
      recoveryScore: session.recoveryScore == null ? null : normalizeNumber(session.recoveryScore),
      sorenessScore: session.sorenessScore == null ? null : normalizeNumber(session.sorenessScore),
      rpe: session.rpe == null ? null : normalizeNumber(session.rpe),
      loadKg: session.loadKg == null ? null : normalizeNumber(session.loadKg),
      distanceKm: session.distanceKm == null ? null : normalizeNumber(session.distanceKm),
      routineName: normalizeText(session.routineName),
      notes: normalizeText(session.notes)
    }))
    .filter(session => session.date && session.type && session.activity);
}

export function getUpcomingPlannedSessions(state) {
  return getPlannedSessions(state)
    .slice()
    .sort((left, right) => `${left.date}-${left.activity}`.localeCompare(`${right.date}-${right.activity}`));
}

export function replacePlannedMeal(state, nextMeal) {
  const plannedMeals = getPlannedMeals(state).filter(meal => String(meal.id) !== String(nextMeal.id));
  plannedMeals.push(nextMeal);

  return {
    ...state,
    mealPlan: {},
    plans: {
      ...(state.plans || {}),
      meals: plannedMeals
    }
  };
}

export function replacePlannedMeals(state, nextMeals) {
  return nextMeals.reduce((accumulator, meal) => replacePlannedMeal(accumulator, meal), state);
}

export function removePlannedMeal(state, mealId) {
  const plannedMeals = getPlannedMeals(state).filter(meal => String(meal.id) !== String(mealId));
  return {
    ...state,
    mealPlan: {},
    plans: {
      ...(state.plans || {}),
      meals: plannedMeals
    }
  };
}

export function findPlannedMealMatch(state, loggedMeal) {
  const loggedName = normalizeMatchText(loggedMeal?.items?.[0]?.name);
  const loggedRecipeId = loggedMeal?.items?.[0]?.recipeId ?? null;
  const loggedType = normalizeMatchText(loggedMeal?.type);

  const candidates = getPlannedMeals(state).filter(meal => meal.date === loggedMeal?.date && meal.status !== "done");
  if (candidates.length === 0) return null;

  if (loggedRecipeId != null) {
    const byRecipe = candidates.find(meal => String(meal.recipeId || "") === String(loggedRecipeId));
    if (byRecipe) return byRecipe;
  }

  const byExactName = candidates.find(meal => normalizeMatchText(meal.name) === loggedName);
  if (byExactName) return byExactName;

  const byCloseName = candidates.find(meal => {
    const plannedName = normalizeMatchText(meal.name);
    return plannedName && loggedName && (plannedName.includes(loggedName) || loggedName.includes(plannedName));
  });
  if (byCloseName) return byCloseName;

  const bySlot = candidates.filter(meal => normalizeMatchText(meal.slot) === loggedType);
  if (bySlot.length === 1) return bySlot[0];

  return null;
}

export function applyLoggedMealToPlans(state, loggedMeal, status = "done") {
  const match = findPlannedMealMatch(state, loggedMeal);
  if (!match) return state;

  return replacePlannedMeal(state, {
    ...match,
    status: normalizeStatus(status)
  });
}

export function replacePlannedSession(state, nextSession) {
  const plannedSessions = getPlannedSessions(state).filter(session => String(session.id) !== String(nextSession.id));
  plannedSessions.push(nextSession);

  return {
    ...state,
    plans: {
      ...(state.plans || {}),
      sessions: plannedSessions
    }
  };
}

export function replacePlannedSessions(state, nextSessions) {
  return nextSessions.reduce((accumulator, session) => replacePlannedSession(accumulator, session), state);
}

export function removePlannedSession(state, sessionId) {
  return {
    ...state,
    plans: {
      ...(state.plans || {}),
      sessions: getPlannedSessions(state).filter(session => String(session.id) !== String(sessionId))
    }
  };
}

export function findPlannedSessionMatch(state, loggedSession) {
  const loggedType = normalizeMatchText(loggedSession?.type);
  const loggedActivity = normalizeMatchText(loggedSession?.activity);
  const candidates = getPlannedSessions(state).filter(session => session.date === loggedSession?.date && session.status !== "done");
  if (candidates.length === 0) return null;

  const byExact = candidates.find(
    session => normalizeMatchText(session.type) === loggedType && normalizeMatchText(session.activity) === loggedActivity
  );
  if (byExact) return byExact;

  const byType = candidates.filter(session => normalizeMatchText(session.type) === loggedType);
  if (byType.length === 1) return byType[0];

  return null;
}

export function applyLoggedSessionToPlans(state, loggedSession, status = "done") {
  const match = findPlannedSessionMatch(state, loggedSession);
  if (!match) return state;

  return replacePlannedSession(state, {
    ...match,
    status: normalizeStatus(status)
  });
}
