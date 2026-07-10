import { normalizeStateShape } from "./validate.js";

export const SCHEMA_VERSION = 1;

export const DEFAULT_STATE = {
  schemaVersion: SCHEMA_VERSION,
  profile: {
    displayName: "",
    installMode: "pwa",
    locale: "es-ES",
    timezone: "Europe/Madrid"
  },
  notes: {},
  sleepEntries: {},
  nutrition: {
    meals: [],
    savedMeals: [],
    waterLog: {},
    weightLog: {},
    pantryStatus: {},
    supplements: [],
    supplementLog: {},
    profile: {
      heightCm: null,
      age: null,
      weightFallback: null,
      activityAdd: null,
      macroSplit: {
        protein: 25,
        carbs: 45,
        fat: 30
      }
    },
    waterGoal: 8
  },
  recipes: [],
  mealPlan: {},
  plans: {
    meals: [],
    sessions: []
  },
  training: {
    sessions: [],
    routines: []
  },
  library: {
    books: []
  },
  cycle: {
    periodDays: [],
    symptomLog: {}
  },
  medication: {
    meds: [],
    log: {}
  },
  schedule: {
    blocks: []
  },
  weekly: {
    resetDay: "Domingo",
    checklists: {},
    reviews: {}
  },
  calendar: {
    events: []
  },
  habits: [],
  goals: [],
  appMeta: {
    migratedFromLegacy: false,
    lastImportAt: null,
    lastBackupExportAt: null,
    lastPassphraseChangeAt: null,
    autoLockMinutes: 5,
    lastUnlockedAt: null
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createDefaultState() {
  return clone(DEFAULT_STATE);
}

export function mergeState(partialState = {}) {
  const base = createDefaultState();
  return normalizeStateShape({
    ...base,
    ...partialState,
    profile: { ...base.profile, ...(partialState.profile || {}) },
    notes: { ...(partialState.notes || {}) },
    sleepEntries: { ...(partialState.sleepEntries || {}) },
    nutrition: {
      ...base.nutrition,
      ...(partialState.nutrition || {}),
      waterLog: { ...(partialState.nutrition?.waterLog || {}) },
      weightLog: { ...(partialState.nutrition?.weightLog || {}) },
      pantryStatus: { ...(partialState.nutrition?.pantryStatus || {}) },
      supplementLog: { ...(partialState.nutrition?.supplementLog || {}) },
      profile: {
        ...base.nutrition.profile,
        ...(partialState.nutrition?.profile || {}),
        macroSplit: {
          ...base.nutrition.profile.macroSplit,
          ...(partialState.nutrition?.profile?.macroSplit || {})
        }
      }
    },
    mealPlan: { ...(partialState.mealPlan || {}) },
    plans: {
      meals: Array.isArray(partialState.plans?.meals) ? partialState.plans.meals : [],
      sessions: Array.isArray(partialState.plans?.sessions) ? partialState.plans.sessions : []
    },
    training: {
      ...base.training,
      ...(partialState.training || {})
    },
    library: {
      ...base.library,
      ...(partialState.library || {})
    },
    cycle: {
      ...base.cycle,
      ...(partialState.cycle || {})
    },
    medication: {
      ...base.medication,
      ...(partialState.medication || {})
    },
    schedule: {
      ...base.schedule,
      ...(partialState.schedule || {})
    },
    weekly: {
      ...base.weekly,
      ...(partialState.weekly || {}),
      checklists: { ...(partialState.weekly?.checklists || {}) },
      reviews: { ...(partialState.weekly?.reviews || {}) }
    },
    calendar: {
      ...base.calendar,
      ...(partialState.calendar || {})
    },
    appMeta: {
      ...base.appMeta,
      ...(partialState.appMeta || {})
    }
  });
}
