import { createDefaultState, SCHEMA_VERSION } from "../domain/schema.js";
import { migrateStateToCurrentSchema } from "../domain/migrate.js";
import { validateImportedPayload } from "../domain/validate.js";

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function maybeJsonParse(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function fromLegacyKeys(raw) {
  const parsed = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, maybeJsonParse(value)])
  );

  const state = createDefaultState();

  state.notes = parsed.notes || parsed["notes-data"] || {};
  state.sleepEntries = parsed.sleep?.entries || parsed["sleep-data"]?.entries || {};
  state.nutrition = {
    ...state.nutrition,
    ...(parsed.nutrition || parsed["nutrition-data"] || {})
  };
  state.recipes = parsed.recipes || parsed["recipes-data"] || [];
  state.mealPlan = parsed.weekMenu || parsed["weekmenu-data"] || {};
  state.training = {
    ...state.training,
    ...(parsed.training || parsed["training-data"] || {})
  };
  state.cycle = {
    ...state.cycle,
    ...(parsed.cycle || parsed["cycle-data"] || {})
  };
  state.medication = {
    ...state.medication,
    ...(parsed.medication || parsed["medication-data"] || {})
  };
  state.schedule = {
    ...state.schedule,
    ...(parsed.schedule || parsed["schedule-data"] || {})
  };
  state.calendar = {
    ...state.calendar,
    ...(parsed.calendar || parsed["calendar-data"] || {})
  };
  state.goals = parsed.goals?.goals || parsed["goals-data"]?.goals || [];
  state.appMeta = {
    migratedFromLegacy: true,
    lastImportAt: new Date().toISOString()
  };

  return migrateStateToCurrentSchema(validateImportedPayload(state));
}

export function importLegacyPayload(rawText) {
  const parsed = JSON.parse(rawText);

  if (!isObject(parsed)) {
    throw new Error("El archivo legado no tiene un objeto JSON valido.");
  }

  if (
    parsed.schemaVersion === SCHEMA_VERSION &&
    parsed.nutrition &&
    parsed.training &&
    parsed.cycle
  ) {
    return migrateStateToCurrentSchema(validateImportedPayload(parsed));
  }

  return fromLegacyKeys(parsed);
}
