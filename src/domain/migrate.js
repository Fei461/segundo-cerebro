import { mergeState, SCHEMA_VERSION } from "./schema.js";
import { legacyMealPlanToPlannedMeals } from "./plans.js";

export function migrateStateToCurrentSchema(candidateState) {
  const currentVersion = Number(candidateState?.schemaVersion || 0);

  if (currentVersion > SCHEMA_VERSION) {
    throw new Error("El archivo viene de una versión más nueva de la app.");
  }

  if (currentVersion <= SCHEMA_VERSION) {
    const migratedLegacyMeals =
      Array.isArray(candidateState?.plans?.meals) && candidateState.plans.meals.length > 0
        ? candidateState.plans.meals
        : legacyMealPlanToPlannedMeals(candidateState?.mealPlan || {});

    return mergeState({
      ...candidateState,
      mealPlan: {},
      plans: {
        ...(candidateState?.plans || {}),
        meals: migratedLegacyMeals
      },
      schemaVersion: SCHEMA_VERSION
    });
  }

  return mergeState(candidateState);
}
