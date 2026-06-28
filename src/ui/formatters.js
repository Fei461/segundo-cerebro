const PLAN_STATUS_LABELS = {
  planned: "previsto",
  done: "hecho",
  partial: "parcial",
  skipped: "omitido"
};

const SUGGESTION_REASON_LABELS = {
  "agenda-cargada": "agenda cargada",
  "recalibracion-carga": "recalibracion por carga",
  "adherencia-baja": "adherencia baja",
  "vigilancia-recuperacion": "vigilancia de recuperacion",
  "ciclo-menstrual": "fase menstrual",
  "ciclo-lutea": "fase lutea",
  "digestion-sensible": "digestion sensible",
  "sin-plan": "sin plan previo"
};

export function formatPlanStatus(status) {
  return PLAN_STATUS_LABELS[String(status || "").trim()] || "sin estado";
}

export function formatSuggestionReason(reason, fallback = "sugerencia operativa") {
  return SUGGESTION_REASON_LABELS[String(reason || "").trim()] || fallback;
}

export function formatCycleContextLabel(cycleContext) {
  if (!cycleContext || cycleContext.phase === "sin-datos") {
    return "Sin contexto de ciclo suficiente";
  }

  return cycleContext.label || cycleContext.phase;
}
