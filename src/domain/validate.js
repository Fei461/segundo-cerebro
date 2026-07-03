function ensureObject(value, fallback = {}) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
}

function ensureArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function ensureNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ensureString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function normalizeStateShape(state) {
  const safe = ensureObject(state);
  const nutrition = ensureObject(safe.nutrition);
  const nutritionProfile = ensureObject(nutrition.profile);
  const training = ensureObject(safe.training);
  const cycle = ensureObject(safe.cycle);
  const medication = ensureObject(safe.medication);
  const schedule = ensureObject(safe.schedule);
  const weekly = ensureObject(safe.weekly);
  const calendar = ensureObject(safe.calendar);
  const plans = ensureObject(safe.plans);
  const appMeta = ensureObject(safe.appMeta);

  return {
    ...safe,
    notes: ensureObject(safe.notes),
    sleepEntries: ensureObject(safe.sleepEntries),
    nutrition: {
      ...nutrition,
      meals: ensureArray(nutrition.meals),
      savedMeals: ensureArray(nutrition.savedMeals),
      waterLog: ensureObject(nutrition.waterLog),
      weightLog: ensureObject(nutrition.weightLog),
      pantryStatus: ensureObject(nutrition.pantryStatus),
      supplements: ensureArray(nutrition.supplements),
      supplementLog: ensureObject(nutrition.supplementLog),
      waterGoal: ensureNumber(nutrition.waterGoal, 8),
      profile: {
        ...nutritionProfile,
        heightCm: nutritionProfile.heightCm == null ? null : ensureNumber(nutritionProfile.heightCm, null),
        age: nutritionProfile.age == null ? null : ensureNumber(nutritionProfile.age, null),
        weightFallback: nutritionProfile.weightFallback == null ? null : ensureNumber(nutritionProfile.weightFallback, null),
        activityAdd: nutritionProfile.activityAdd == null ? null : ensureNumber(nutritionProfile.activityAdd, null),
        macroSplit: {
          protein: ensureNumber(nutritionProfile.macroSplit?.protein, 25),
          carbs: ensureNumber(nutritionProfile.macroSplit?.carbs, 45),
          fat: ensureNumber(nutritionProfile.macroSplit?.fat, 30)
        }
      }
    },
    recipes: ensureArray(safe.recipes),
    mealPlan: ensureObject(safe.mealPlan),
    plans: {
      meals: ensureArray(plans.meals),
      sessions: ensureArray(plans.sessions)
    },
    training: {
      ...training,
      sessions: ensureArray(training.sessions),
      routines: ensureArray(training.routines)
    },
    cycle: {
      ...cycle,
      periodDays: ensureArray(cycle.periodDays),
      symptomLog: ensureObject(cycle.symptomLog)
    },
    medication: {
      ...medication,
      meds: ensureArray(medication.meds),
      log: ensureObject(medication.log)
    },
    schedule: {
      ...schedule,
      blocks: ensureArray(schedule.blocks)
    },
    weekly: {
      resetDay: ensureString(weekly.resetDay, "Domingo") || "Domingo",
      checklists: ensureObject(weekly.checklists),
      reviews: ensureObject(weekly.reviews)
    },
    calendar: {
      ...calendar,
      events: ensureArray(calendar.events)
    },
    habits: ensureArray(safe.habits),
    goals: ensureArray(safe.goals),
    appMeta: {
      migratedFromLegacy: Boolean(appMeta.migratedFromLegacy),
      lastImportAt: appMeta.lastImportAt ?? null,
      lastBackupExportAt: appMeta.lastBackupExportAt ?? null,
      lastPassphraseChangeAt: appMeta.lastPassphraseChangeAt ?? null,
      autoLockMinutes: Math.min(120, Math.max(0, ensureNumber(appMeta.autoLockMinutes, 5))),
      lastUnlockedAt: appMeta.lastUnlockedAt ?? null
    }
  };
}

export function validateImportedPayload(value) {
  const safe = ensureObject(value);

  if (!safe || Array.isArray(value)) {
    throw new Error("El payload importado no es un objeto valido.");
  }

  return normalizeStateShape(safe);
}
