import { mergeState, SCHEMA_VERSION } from "./schema.js";

export function migrateStateToCurrentSchema(candidateState) {
  const currentVersion = Number(candidateState?.schemaVersion || 0);

  if (currentVersion > SCHEMA_VERSION) {
    throw new Error("El archivo viene de una versión más nueva de la app.");
  }

  if (currentVersion <= SCHEMA_VERSION) {
    return mergeState({
      ...candidateState,
      schemaVersion: SCHEMA_VERSION
    });
  }

  return mergeState(candidateState);
}
