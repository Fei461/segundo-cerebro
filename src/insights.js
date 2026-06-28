import { getPlannedSessions } from "./plans.js";
import { mealReactionSignals } from "./personal-nutrition.js";

function currentWeekKeys(inputDate = new Date()) {
  const keys = [];
  const start = inputDate instanceof Date ? new Date(inputDate) : new Date(inputDate);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    keys.push(date.toISOString().slice(0, 10));
  }

  return keys;
}

function sortedIsoDates(values = []) {
  return values
    .map(value => String(value || ""))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function contiguousPeriodBlocks(periodDays = []) {
  const dates = sortedIsoDates(periodDays);
  const blocks = [];

  dates.forEach(dateKey => {
    if (blocks.length === 0) {
      blocks.push({ start: dateKey, end: dateKey, days: [dateKey] });
      return;
    }

    const previous = blocks[blocks.length - 1];
    const previousDate = new Date(previous.end);
    previousDate.setDate(previousDate.getDate() + 1);
    const nextExpected = previousDate.toISOString().slice(0, 10);

    if (nextExpected === dateKey) {
      previous.end = dateKey;
      previous.days.push(dateKey);
      return;
    }

    blocks.push({ start: dateKey, end: dateKey, days: [dateKey] });
  });

  return blocks;
}

export function getCycleContext(state, inputDate = new Date()) {
  const dateKey = inputDate instanceof Date ? inputDate.toISOString().slice(0, 10) : String(inputDate || "");
  const blocks = contiguousPeriodBlocks(state.cycle?.periodDays || []);
  const currentBlock = blocks.find(block => block.days.includes(dateKey)) || null;
  const latestBlock = currentBlock || blocks.filter(block => block.start <= dateKey).slice(-1)[0] || null;

  if (!latestBlock) {
    return {
      phase: "sin-datos",
      cycleDay: null,
      periodActive: false,
      label: "Sin datos de ciclo suficientes"
    };
  }

  const start = new Date(latestBlock.start);
  const target = new Date(dateKey);
  const diffDays = Math.floor((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const cycleDay = diffDays + 1;
  const periodActive = Boolean(currentBlock);

  if (periodActive || cycleDay <= 5) {
    return {
      phase: "menstrual",
      cycleDay,
      periodActive,
      label: `Fase menstrual · dia ${cycleDay}`
    };
  }
  if (cycleDay <= 13) {
    return {
      phase: "folicular",
      cycleDay,
      periodActive,
      label: `Fase folicular · dia ${cycleDay}`
    };
  }
  if (cycleDay <= 17) {
    return {
      phase: "ovulatoria",
      cycleDay,
      periodActive,
      label: `Ventana ovulatoria · dia ${cycleDay}`
    };
  }
  return {
    phase: "lutea",
    cycleDay,
    periodActive,
    label: `Fase lutea · dia ${cycleDay}`
  };
}

export function getWeeklyHealthInsights(state, inputDate = new Date()) {
  const weekKeys = currentWeekKeys(inputDate);
  const weekKeySet = new Set(weekKeys);
  const cycleContext = getCycleContext(state, inputDate);

  const sleepEntries = weekKeys
    .map(key => state.sleepEntries?.[key])
    .filter(Boolean);
  const avgSleepHours =
    sleepEntries.length > 0
      ? sleepEntries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0) / sleepEntries.length
      : 0;

  const symptomEntries = Object.entries(state.cycle.symptomLog || {})
    .filter(([date]) => weekKeySet.has(date))
    .flatMap(([, items]) => items || []);
  const avgSymptomIntensity =
    symptomEntries.length > 0
      ? symptomEntries.reduce((sum, item) => sum + Number(item.intensity || 0), 0) / symptomEntries.length
      : 0;
  const avgEnergy =
    symptomEntries.filter(item => item.energy != null).length > 0
      ? symptomEntries.filter(item => item.energy != null).reduce((sum, item) => sum + Number(item.energy || 0), 0) /
        symptomEntries.filter(item => item.energy != null).length
      : 0;
  const avgMood =
    symptomEntries.filter(item => item.mood != null).length > 0
      ? symptomEntries.filter(item => item.mood != null).reduce((sum, item) => sum + Number(item.mood || 0), 0) /
        symptomEntries.filter(item => item.mood != null).length
      : 0;
  const digestionHeavyCount = symptomEntries.filter(item => ["Pesada", "Hinchada", "Molesta"].includes(String(item.digestion || ""))).length;
  const dominantSymptoms = Array.from(
    symptomEntries.reduce((map, item) => {
      const key = String(item.name || "").trim();
      if (!key) return map;
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map())
  )
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, 4);

  const plannedSessions = getPlannedSessions(state).filter(session => weekKeySet.has(session.date));
  const donePlannedSessions = plannedSessions.filter(session => session.status === "done").length;
  const executedSessions = state.training.sessions.filter(session => weekKeySet.has(session.date));
  const lowRecoverySessions = executedSessions.filter(session => Number(session.recoveryScore || 0) > 0 && Number(session.recoveryScore || 0) <= 2);
  const lowEnergySessions = executedSessions.filter(session => Number(session.preEnergy || 0) > 0 && Number(session.preEnergy || 0) <= 2);
  const mealSignals = mealReactionSignals(state.nutrition.meals.filter(meal => weekKeySet.has(meal.date)));

  const signals = [];

  if (sleepEntries.length > 0 && avgSleepHours < 7) {
    signals.push({
      kind: "recovery",
      title: "Sueño corto esta semana",
      detail: `La media reciente está en ${avgSleepHours.toFixed(1)} h.`
    });
  }

  if (symptomEntries.length >= 3 && avgSymptomIntensity >= 3) {
    signals.push({
      kind: "cycle",
      title: "Síntomas con carga relevante",
      detail: `${symptomEntries.length} registros con intensidad media ${avgSymptomIntensity.toFixed(1)}/5.`
    });
  }

  if (avgEnergy > 0 && avgEnergy <= 2.5) {
    signals.push({
      kind: "energy",
      title: "Energia baja en registros de sintomas",
      detail: `La energia media asociada a sintomas esta en ${avgEnergy.toFixed(1)}/5.`
    });
  }

  if (avgMood > 0 && avgMood <= 2.5) {
    signals.push({
      kind: "mood",
      title: "Animo bajo en la semana",
      detail: `El animo medio registrado junto a sintomas esta en ${avgMood.toFixed(1)}/5.`
    });
  }

  if (plannedSessions.length > 0 && donePlannedSessions / plannedSessions.length < 0.5) {
    signals.push({
      kind: "training",
      title: "Baja adherencia al entreno previsto",
      detail: `${donePlannedSessions}/${plannedSessions.length} sesiones planificadas marcadas como hechas.`
    });
  }

  if (executedSessions.length >= 3 && sleepEntries.length > 0 && avgSleepHours < 7) {
    signals.push({
      kind: "fatigue",
      title: "Carga semanal con descanso justo",
      detail: `${executedSessions.length} sesiones registradas con sueño medio por debajo de 7 h.`
    });
  }

  if (lowRecoverySessions.length >= 2) {
    signals.push({
      kind: "recovery",
      title: "Recuperacion subjetiva floja",
      detail: `${lowRecoverySessions.length} sesiones con recuperacion de 2/5 o menos.`
    });
  }

  if (lowEnergySessions.length >= 2) {
    signals.push({
      kind: "training-energy",
      title: "Entrenos con energia previa baja",
      detail: `${lowEnergySessions.length} sesiones registradas con energia previa de 2/5 o menos.`
    });
  }

  if (mealSignals.length > 0) {
    const top = mealSignals[0];
    signals.push({
      kind: "nutrition-tolerance",
      title: "Ingrediente repetido en comidas con malestar",
      detail: `${top.name} aparece ${top.count} veces en comidas con reaccion negativa registrada.`
    });
  }

  if (cycleContext.phase === "menstrual") {
    signals.push({
      kind: "cycle-phase",
      title: "Semana atravesando fase menstrual",
      detail: "Conviene priorizar margen, recuperacion y entreno menos agresivo si la energia cae."
    });
  } else if (cycleContext.phase === "lutea" && (avgMood > 0 && avgMood <= 3 || avgEnergy > 0 && avgEnergy <= 3)) {
    signals.push({
      kind: "cycle-phase",
      title: "Fase lutea con energia o animo mas bajos",
      detail: "Puede interesar simplificar comidas y no sobredimensionar la carga."
    });
  }

  return {
    cycleContext,
    avgSleepHours,
    symptomCount: symptomEntries.length,
    avgSymptomIntensity,
    avgEnergy,
    avgMood,
    digestionHeavyCount,
    dominantSymptoms,
    mealSignals,
    plannedSessions: plannedSessions.length,
    donePlannedSessions,
    executedSessions: executedSessions.length,
    signals
  };
}

export function getCycleSupportSuggestions(state, inputDate = new Date()) {
  const health = getWeeklyHealthInsights(state, inputDate);
  const suggestions = [];

  if (health.cycleContext.phase === "menstrual") {
    suggestions.push("Priorizar movilidad, paseo suave o recuperacion si la energia cae.");
    suggestions.push("Simplificar comida y agenda para no tensionar mas el dia.");
  } else if (health.cycleContext.phase === "folicular") {
    suggestions.push("Buena ventana para empujar un poco mas si la recuperacion acompaña.");
    suggestions.push("Aprovechar foco y energia para cerrar preparacion de la semana.");
  } else if (health.cycleContext.phase === "ovulatoria") {
    suggestions.push("Vigilar si sube la energia y usarla con intencion, no por impulso.");
    suggestions.push("Buen momento para sesiones clave si el sueño viene estable.");
  } else if (health.cycleContext.phase === "lutea") {
    suggestions.push("Bajar complejidad si notas mas roce con energia, animo o digestión.");
    suggestions.push("Preparar comidas y agenda con mas margen para evitar deuda operativa.");
  } else {
    suggestions.push("Seguir registrando dias de ciclo para que la lectura futura gane precisión.");
  }

  if (health.avgEnergy > 0 && health.avgEnergy <= 2.5) {
    suggestions.push("Tratar la energia baja como una señal operativa y ajustar la carga.");
  }
  if (health.digestionHeavyCount >= 2) {
    suggestions.push("Revisar comidas repetidas con sensacion pesada antes de seguir acumulandolas.");
  }

  return suggestions.slice(0, 4);
}

export function getWeeklyAutoSummary(state, inputDate = new Date()) {
  const weekKeys = currentWeekKeys(inputDate);
  const weekKeySet = new Set(weekKeys);
  const health = getWeeklyHealthInsights(state, inputDate);
  const plannedSessions = getPlannedSessions(state).filter(session => weekKeySet.has(session.date));
  const donePlannedSessions = plannedSessions.filter(session => session.status === "done").length;
  const plannedMeals = Object.values(state.mealPlan || {}).length;
  const loggedMeals = state.nutrition.meals.filter(meal => weekKeySet.has(meal.date)).length;
  const adherenceTraining = plannedSessions.length > 0 ? donePlannedSessions / plannedSessions.length : 0;

  const highlights = [];
  const watchouts = [];
  const reviewItems = [];

  if (loggedMeals >= 4) {
    highlights.push(`Ya hay ${loggedMeals} comidas registradas esta semana.`);
  }
  if (plannedSessions.length > 0 && adherenceTraining >= 0.6) {
    highlights.push(`La adherencia al entreno previsto va en ${Math.round(adherenceTraining * 100)}%.`);
  }
  if (health.avgSleepHours >= 7) {
    highlights.push(`El sueño medio reciente se mantiene en ${health.avgSleepHours.toFixed(1)} h.`);
  }

  health.signals.slice(0, 4).forEach(signal => {
    watchouts.push(signal.title);
  });

  if (health.mealSignals[0]) {
    reviewItems.push(`Revisar tolerancia de ${health.mealSignals[0].name}.`);
  }
  if (health.dominantSymptoms[0]) {
    reviewItems.push(`Mirar patron de ${health.dominantSymptoms[0].name}.`);
  }
  if (plannedMeals > loggedMeals && plannedMeals > 0) {
    reviewItems.push("Cerrar la brecha entre comida planificada y comida registrada.");
  }
  if (plannedSessions.length > 0 && adherenceTraining < 0.5) {
    reviewItems.push("Reducir friccion del entreno previsto para que la semana sea ejecutable.");
  }

  let headline = "Semana estable: mantener registro y pequenos ajustes.";
  if (watchouts.length >= 3) {
    headline = "Semana con varias señales activas: conviene revisar carga, comida y recuperacion juntas.";
  } else if (health.cycleContext.phase === "menstrual") {
    headline = "Semana condicionada por fase menstrual: mejor margen y menos friccion.";
  } else if (health.avgSleepHours > 0 && health.avgSleepHours < 7) {
    headline = "El sueño se queda corto y ya merece entrar en decisiones de la semana.";
  }

  return {
    headline,
    highlights: highlights.slice(0, 4),
    watchouts: watchouts.slice(0, 5),
    reviewItems: reviewItems.slice(0, 5)
  };
}
