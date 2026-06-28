export const PERSONAL_PANTRY = [
  {
    family: "Bases rapidas",
    items: ["Tortitas de arroz", "Arroz", "Macarrones", "Fideos de arroz", "Patata", "Pan", "Quinoa", "Harina PAN"]
  },
  {
    family: "Proteinas frecuentes",
    items: ["Huevo", "Pollo", "Pavo loncheado", "Jamon serrano", "Jamon york", "Atun", "Ternera", "Cerdo", "Soja texturizada", "Merluza", "Bacalao"]
  },
  {
    family: "Verduras de rotacion",
    items: ["Zanahoria", "Cebolla", "Calabacin", "Tomate", "Tomate cherry", "Pimiento rojo", "Pimiento verde", "Pimiento amarillo", "Calabaza", "Puerro", "Espinacas", "Alcachofa"]
  },
  {
    family: "Fruta habitual",
    items: ["Banana", "Melon", "Mandarina", "Melocoton", "Mango", "Papaya", "Uvas rojas", "Nectarina"]
  },
  {
    family: "Lacteos y alternativos",
    items: ["Yogur vegetal", "Queso emmental", "Queso rallado", "Bebida de avena", "Bebida de almendra", "Bebida de soja"]
  },
  {
    family: "Grasas y extras",
    items: ["Bacon", "Chorizo", "Panceta", "Semillas chia", "Ajo", "Tomate frito", "Salsa teriyaki", "Leche de coco"]
  }
];

export const INGREDIENT_ALIASES = {
  "jamon york": "Jamon york",
  "jamon york 90 carne": "Jamon york",
  "jamon york 90": "Jamon york",
  "jamon york 93 carne": "Jamon york",
  "lonchas de jamon york": "Jamon york",
  "jamon serrano": "Jamon serrano",
  "lonchas de jamon": "Jamon serrano",
  "pavo loncheado": "Pavo loncheado",
  "lonchas de pavo": "Pavo loncheado",
  "tacos de pavo": "Pavo",
  "pollo loncheado": "Pollo loncheado",
  "lonchas de pollo": "Pollo loncheado",
  "queso": "Queso",
  "queso emmental": "Queso emmental",
  "queso rallado": "Queso rallado",
  "yogur vegetal": "Yogur vegetal",
  "yogur alpro lima limon": "Yogur vegetal",
  "yogur alpro limon": "Yogur vegetal",
  "yogur alpro lemon cheesecake": "Yogur vegetal",
  "yogur vemondo vainilla": "Yogur vegetal",
  "yogur vemondo soja": "Yogur vegetal",
  "te verde": "Te verde",
  "te rojo": "Te rojo",
  "banana": "Banana",
  "platano": "Banana",
  "melon": "Melon",
  "uvas rojas": "Uvas rojas",
  "mango": "Mango",
  "papaya": "Papaya",
  "melocoton": "Melocoton",
  "nectarina": "Nectarina",
  "tortitas de arroz": "Tortitas de arroz",
  "arroz": "Arroz",
  "macarrones": "Macarrones",
  "fideos de arroz": "Fideos de arroz",
  "glass noodles": "Fideos de arroz",
  "patata": "Patata",
  "patatas": "Patata",
  "copos de avena": "Copos de avena",
  "bebida de almendra": "Bebida de almendra",
  "leche de almendra": "Bebida de almendra",
  "bebida de avena": "Bebida de avena",
  "leche de avena": "Bebida de avena",
  "bebida de soja": "Bebida de soja",
  "leche de soja": "Bebida de soja",
  "proteina whey": "Proteina whey",
  "proteina whey vainilla": "Proteina whey vainilla",
  "semillas chia": "Semillas chia",
  "huevo": "Huevo",
  "huevos": "Huevo",
  "pollo": "Pollo",
  "ternera": "Ternera",
  "cerdo": "Cerdo",
  "carne picada": "Carne picada",
  "soja texturizada": "Soja texturizada",
  "atun": "Atun",
  "bacalao": "Bacalao",
  "merluza": "Merluza",
  "gambas": "Gambas",
  "sepia": "Sepia",
  "chipirones": "Chipirones",
  "zanahoria": "Zanahoria",
  "cebolla": "Cebolla",
  "calabacin": "Calabacin",
  "tomate": "Tomate",
  "tomate cherry": "Tomate cherry",
  "tomates cherry": "Tomate cherry",
  "pimiento rojo": "Pimiento rojo",
  "pimiento verde": "Pimiento verde",
  "pimiento amarillo": "Pimiento amarillo",
  "pimientos": "Pimientos",
  "calabaza": "Calabaza",
  "espinacas": "Espinacas",
  "puerro": "Puerro",
  "ajo": "Ajo",
  "tomate frito": "Tomate frito",
  "bacon": "Bacon",
  "chorizo": "Chorizo",
  "panceta": "Panceta",
  "garbanzos": "Garbanzos",
  "lentejas": "Lentejas",
  "quinoa": "Quinoa",
  "harina pan": "Harina PAN",
  "palomitas": "Palomitas"
};

export const PERSONAL_MEAL_TEMPLATES = {
  breakfasts: [
    {
      name: "Tortitas de arroz con proteina salada",
      ingredients: ["Tortitas de arroz", "Jamon serrano o pavo loncheado", "Queso emmental", "Banana opcional", "Yogur vegetal", "Te verde"]
    },
    {
      name: "Porridge proteico",
      ingredients: ["Copos de avena", "Bebida vegetal", "Proteina whey vainilla", "Banana o mango", "Semillas chia", "Te verde"]
    },
    {
      name: "Gofres proteicos",
      ingredients: ["Huevo", "Bebida de almendra", "Proteina whey", "Mezcla panificable", "Te verde"]
    },
    {
      name: "Sandwich o tostadas con jamon y queso",
      ingredients: ["Pan", "Jamon serrano o york", "Queso emmental", "Yogur vegetal o fruta"]
    }
  ],
  lunches: [
    {
      name: "Arroz con proteina y verduras",
      ingredients: ["Arroz", "Pollo o soja texturizada", "Cebolla", "Zanahoria", "Pimientos", "Tomate"]
    },
    {
      name: "Pures + plancha",
      ingredients: ["Calabaza o calabacin o verduras mixtas", "Patata", "Pollo o pescado"]
    },
    {
      name: "Bolonesa adaptable",
      ingredients: ["Macarrones o arroz", "Carne picada o soja texturizada", "Cebolla", "Zanahoria", "Tomate", "Queso"]
    },
    {
      name: "Legumbre contundente",
      ingredients: ["Lentejas o garbanzos", "Verduras base", "Chorizo o panceta opcionales"]
    }
  ],
  dinners: [
    {
      name: "Tortilla o revuelto rapido",
      ingredients: ["Huevo", "Jamon o atun", "Queso", "Verdura salteada opcional"]
    },
    {
      name: "Fideos de arroz salteados",
      ingredients: ["Fideos de arroz", "Cerdo o ternera", "Cebolla", "Zanahoria", "Calabacin", "Pimiento"]
    },
    {
      name: "Pizza o mini pizza casera",
      ingredients: ["Base o hojaldre", "Tomate", "Queso", "Jamon o bacon", "Verdura"]
    },
    {
      name: "Pastina o plato suave",
      ingredients: ["Estrellitas", "Huevo", "Jamon serrano o pollo"]
    }
  ],
  snacks: [
    { name: "Palomitas", type: "Snack salado frecuente" },
    { name: "Batido con fruta y proteina whey", type: "Snack de batido frecuente" },
    { name: "Tortitas de arroz con jamon y queso", type: "Snack salado funcional" },
    { name: "Fruta facil", type: "Fruta de apoyo" }
  ]
};

const SLOT_TEMPLATE_KEYS = {
  Desayuno: "breakfasts",
  Comida: "lunches",
  Cena: "dinners",
  Snack: "snacks"
};

export const VARIETY_FAMILY_RULES = [
  { family: "Cereal/tuberculo", terms: ["tortitas de arroz", "arroz", "macarrones", "fideos de arroz", "patata", "pan", "quinoa", "harina pan", "avena", "estrellitas"] },
  { family: "Ave y huevos", terms: ["huevo", "pollo", "pavo", "alitas"] },
  { family: "Carne roja y cerdo", terms: ["ternera", "cerdo", "bacon", "chorizo", "panceta", "lomo", "costillas"] },
  { family: "Pescado y marisco", terms: ["atun", "merluza", "bacalao", "sepia", "gambas", "chipirones", "calamar", "gallo"] },
  { family: "Proteina vegetal", terms: ["soja texturizada", "tofu", "lentejas", "garbanzos"] },
  { family: "Verduras", terms: ["zanahoria", "cebolla", "calabacin", "tomate", "pimiento", "calabaza", "espinacas", "puerro", "alcachofa", "judias verdes"] },
  { family: "Fruta", terms: ["banana", "melon", "mandarina", "melocoton", "mango", "papaya", "uvas", "nectarina"] },
  { family: "Lacteos/alternativos", terms: ["yogur", "queso", "bebida de avena", "bebida de almendra", "bebida de soja"] }
];

export function varietyFamiliesFromText(text) {
  const normalized = String(text || "").toLowerCase();
  return VARIETY_FAMILY_RULES.filter(rule => rule.terms.some(term => normalized.includes(term))).map(rule => rule.family);
}

function stripAccents(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function canonicalizeIngredientName(rawName) {
  const normalized = stripAccents(rawName)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[./]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return INGREDIENT_ALIASES[normalized] || (rawName ? String(rawName).trim() : "");
}

export function ingredientsFromRecipe(recipe) {
  return (recipe?.ingredients || [])
    .map(ingredient => canonicalizeIngredientName(ingredient.name))
    .filter(Boolean);
}

export function shoppingListFromPlannedMeals(plannedMeals, recipes) {
  const counts = new Map();

  plannedMeals.forEach(meal => {
    if (meal.status === "skipped") return;
    const recipe = meal.recipeId ? recipes.find(entry => String(entry.id) === String(meal.recipeId)) : null;
    const sources = recipe
      ? ingredientsFromRecipe(recipe)
      : String(meal.name || "")
          .split(/,| con | y /i)
          .map(part => canonicalizeIngredientName(part))
          .filter(Boolean);

    sources.forEach(name => {
      const current = counts.get(name) || 0;
      counts.set(name, current + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

export function pantryFamilyForIngredient(rawName) {
  const canonical = canonicalizeIngredientName(rawName);
  if (!canonical) return "Otros";

  const directGroup = PERSONAL_PANTRY.find(group => group.items.some(item => item === canonical));
  if (directGroup) return directGroup.family;

  const varietyGroup = varietyFamiliesFromText(canonical)[0];
  return varietyGroup || "Otros";
}

export function groupedShoppingListFromPlannedMeals(plannedMeals, recipes) {
  const shoppingList = shoppingListFromPlannedMeals(plannedMeals, recipes);
  const groups = new Map();

  shoppingList.forEach(item => {
    const family = pantryFamilyForIngredient(item.name);
    const current = groups.get(family) || [];
    current.push(item);
    groups.set(family, current);
  });

  return Array.from(groups.entries())
    .map(([family, items]) => ({
      family,
      items: items.sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    }))
    .sort((left, right) => right.items.length - left.items.length || left.family.localeCompare(right.family));
}

export function repeatedPlannedMealNames(plannedMeals) {
  const counts = new Map();
  plannedMeals.forEach(meal => {
    if (!meal.name) return;
    counts.set(meal.name, (counts.get(meal.name) || 0) + 1);
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 3)
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function normalizedReactionList(reaction) {
  const rawItems = Array.isArray(reaction)
    ? reaction
    : String(reaction || "")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);

  return rawItems.map(item => stripAccents(item).toLowerCase());
}

export function mealReactionSignals(meals) {
  const ingredientCounts = new Map();
  const negativeReactionTerms = ["hinchazon", "pesadez", "acidez", "digestion lenta", "malestar"];

  meals.forEach(meal => {
    const reactions = normalizedReactionList(meal.reaction);
    if (reactions.length === 0) return;

    const hasNegativeReaction = reactions.some(entry => negativeReactionTerms.includes(entry));
    if (!hasNegativeReaction) return;

    const sourceNames = (Array.isArray(meal.items) ? meal.items : []).flatMap(item =>
      String(item.name || "")
        .split(/,| con | y /i)
        .map(part => canonicalizeIngredientName(part))
        .filter(Boolean)
    );

    sourceNames.forEach(name => {
      ingredientCounts.set(name, (ingredientCounts.get(name) || 0) + 1);
    });
  });

  return Array.from(ingredientCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

export function suspectIngredientNames(meals) {
  return new Set(mealReactionSignals(meals).map(item => canonicalizeIngredientName(item.name)).filter(Boolean));
}

const PREP_GROUP_RULES = {
  "Bases rapidas": {
    title: "Cocer bases rapidas",
    detailPrefix: "Dejar listas bases neutras para montar comidas con poca friccion.",
    taskPrefix: "Dejar cocidas bases rapidas"
  },
  "Proteinas frecuentes": {
    title: "Preparar proteinas base",
    detailPrefix: "Dejar proteinas listas o semicocinadas para acelerar comidas y cenas.",
    taskPrefix: "Preparar proteinas base"
  },
  "Verduras de rotacion": {
    title: "Lavar y cortar verduras",
    detailPrefix: "Dejar verduras visibles y prelistas para cocinar sin bloquearte.",
    taskPrefix: "Lavar y cortar verduras"
  },
  "Fruta habitual": {
    title: "Reponer fruta visible",
    detailPrefix: "Asegurar fruta facil a mano para snacks y desayunos.",
    taskPrefix: "Reponer fruta habitual"
  },
  "Lacteos y alternativos": {
    title: "Cerrar desayunos y snacks",
    detailPrefix: "Dejar cubiertos los apoyos mas faciles de la semana.",
    taskPrefix: "Cerrar desayunos y snacks base"
  },
  "Grasas y extras": {
    title: "Ordenar salsas y extras",
    detailPrefix: "Agrupar extras para no improvisar de mas en los platos.",
    taskPrefix: "Ordenar salsas y extras"
  }
};

export function getWeeklyNutritionReview({ plannedMeals = [], loggedMeals = [], recipes = [] }) {
  const coveredFamilies = new Set();

  loggedMeals.forEach(meal => {
    (Array.isArray(meal.items) ? meal.items : []).forEach(item => {
      varietyFamiliesFromText(item.name || "").forEach(family => coveredFamilies.add(family));
    });
  });

  recipes.forEach(recipe => {
    const referenced = plannedMeals.some(meal => String(meal.recipeId || "") === String(recipe.id) && meal.status !== "skipped");
    if (!referenced) return;
    (recipe.ingredients || []).forEach(ingredient => {
      varietyFamiliesFromText(ingredient.name || "").forEach(family => coveredFamilies.add(family));
    });
  });

  const totalFamilies = VARIETY_FAMILY_RULES.length;
  const missingFamilies = VARIETY_FAMILY_RULES.map(rule => rule.family).filter(family => !coveredFamilies.has(family));
  const repeatedMeals = repeatedPlannedMealNames(plannedMeals);
  const suspectIngredients = mealReactionSignals(loggedMeals);
  const shoppingList = shoppingListFromPlannedMeals(plannedMeals, recipes);
  const groupedShoppingList = groupedShoppingListFromPlannedMeals(plannedMeals, recipes);
  const prepSuggestions = [];

  const frequentIngredients = shoppingList.filter(item => item.count >= 2).slice(0, 3);
  frequentIngredients.forEach(item => {
    prepSuggestions.push(`Dejar preparado ${item.name} para ${item.count} comidas.`);
  });

  repeatedMeals.slice(0, 2).forEach(item => {
    prepSuggestions.push(`Cocinar una base unica para ${item.name} y reutilizarla.`);
  });

  groupedShoppingList.slice(0, 2).forEach(group => {
    if (group.items.length >= 2) {
      prepSuggestions.push(`Comprar y ordenar juntas las ${group.family.toLowerCase()} de la semana.`);
    }
  });

  let nextAction = "Seguir registrando para tener una semana mas legible.";
  if (coveredFamilies.size < 5) {
    nextAction = "Abrir la semana con mas variedad de familias basicas.";
  } else if (repeatedMeals.length > 0) {
    nextAction = `Reducir repeticion de ${repeatedMeals[0].name} con una alternativa simple.`;
  } else if (suspectIngredients.length > 0) {
    nextAction = `Vigilar si ${suspectIngredients[0].name} vuelve a aparecer con malestar.`;
  } else if (shoppingList.length > 0) {
    nextAction = `Preparar compra de ${shoppingList[0].name} y cerrar meal prep.`;
  }

  return {
    variety: {
      covered: coveredFamilies.size,
      total: totalFamilies,
      families: Array.from(coveredFamilies).sort(),
      missingFamilies
    },
    repeatedMeals,
    suspectIngredients,
    shoppingList,
    groupedShoppingList,
    prepSuggestions: Array.from(new Set(prepSuggestions)).slice(0, 4),
    nextAction
  };
}

export function getWeeklyNutritionPrepBoard({ plannedMeals = [], loggedMeals = [], recipes = [] }) {
  const review = getWeeklyNutritionReview({ plannedMeals, loggedMeals, recipes });
  const activeMeals = plannedMeals.filter(meal => meal.status !== "skipped");
  const recipeUsage = new Map();
  const recipeMap = new Map(recipes.map(recipe => [String(recipe.id), recipe]));

  activeMeals.forEach(meal => {
    if (!meal.recipeId) return;
    const recipe = recipeMap.get(String(meal.recipeId));
    const key = String(meal.recipeId);
    const current = recipeUsage.get(key) || {
      recipeId: meal.recipeId,
      name: meal.name,
      count: 0,
      familyCoverage: recipe?.familyCoverage || [],
      canonicalIngredients: recipe?.canonicalIngredients || ingredientsFromRecipe(recipe)
    };
    current.count += 1;
    recipeUsage.set(key, current);
  });

  const repeatedRecipeBatches = Array.from(recipeUsage.values())
    .filter(item => item.count >= 2)
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, 3)
    .map(item => ({
      kind: "recipe-batch",
      title: `Cocinar ${item.name} en lote`,
      detail: `${item.count} usos previstos esta semana${item.familyCoverage.length ? ` · ${item.familyCoverage.slice(0, 2).join(" / ")}` : ""}`,
      taskTitle: `Dejar ${item.name} listo para ${item.count} comidas`,
      ingredients: item.canonicalIngredients.slice(0, 5)
    }));

  const familyPrep = review.groupedShoppingList
    .slice(0, 4)
    .map(group => {
      const rule = PREP_GROUP_RULES[group.family] || {
        title: `Preparar ${group.family.toLowerCase()}`,
        detailPrefix: "Dejar resuelta esta familia antes de empezar la semana.",
        taskPrefix: `Preparar ${group.family.toLowerCase()}`
      };

      return {
        kind: "family-prep",
        title: rule.title,
        detail: `${rule.detailPrefix} ${group.items.slice(0, 3).map(item => item.name).join(", ")}`,
        taskTitle: `${rule.taskPrefix}: ${group.items.slice(0, 2).map(item => item.name).join(" y ")}`,
        family: group.family,
        ingredients: group.items.slice(0, 5).map(item => item.name)
      };
    });

  const priorityMeals = activeMeals
    .slice()
    .sort((left, right) => `${left.date}-${left.slot}`.localeCompare(`${right.date}-${right.slot}`))
    .slice(0, 5)
    .map(meal => ({
      date: meal.date,
      slot: meal.slot,
      name: meal.name,
      status: meal.status
    }));

  const watchouts = [];
  if (review.suspectIngredients.length > 0) {
    watchouts.push(`Vigilar ${review.suspectIngredients[0].name} por repeticion con malestar.`);
  }
  if (review.variety.missingFamilies.length > 0) {
    watchouts.push(`Meter al menos una opcion de ${review.variety.missingFamilies[0]} en la semana.`);
  }
  if (review.repeatedMeals.length > 0) {
    watchouts.push(`Romper la repeticion de ${review.repeatedMeals[0].name} con una alternativa simple.`);
  }

  const batchItems = [...repeatedRecipeBatches, ...familyPrep].slice(0, 6);
  const shoppingText = review.groupedShoppingList.length
    ? review.groupedShoppingList
        .slice(0, 4)
        .map(group => `- ${group.family}: ${group.items.slice(0, 5).map(item => `${item.name} (${item.count})`).join(", ")}`)
        .join("\n")
    : "- Aun no hay suficiente planner para derivar compra.";
  const prepText = batchItems.length
    ? batchItems.map(item => `- ${item.title}: ${item.detail}`).join("\n")
    : "- Aun no hay bloques claros de batch cooking.";
  const mealsText = priorityMeals.length
    ? priorityMeals.map(meal => `- ${meal.date} ${meal.slot}: ${meal.name}`).join("\n")
    : "- Aun no hay comidas priorizadas.";
  const watchoutText = watchouts.length ? watchouts.map(item => `- ${item}`).join("\n") : "- Sin alertas nutricionales dominantes.";

  return {
    review,
    batchItems,
    priorityMeals,
    watchouts,
    checklistTitles: Array.from(new Set(batchItems.map(item => item.taskTitle).filter(Boolean))).slice(0, 6),
    shoppingNote: [
      "Compra semanal",
      "",
      shoppingText,
      "",
      `Foco: ${review.nextAction}`
    ].join("\n"),
    prepNote: [
      "Meal prep semanal",
      "",
      prepText,
      "",
      "Primeras comidas a resolver",
      mealsText,
      "",
      "Vigilancia",
      watchoutText
    ].join("\n")
  };
}

export function getSuggestedWeeklyMealSlots({
  weekDates = [],
  plannedMeals = [],
  recipes = [],
  loggedMeals = [],
  events = [],
  pressureByDate = {},
  mealAdherence = 100,
  cyclePhase = "sin-datos",
  digestionHeavyCount = 0
}) {
  const slotOrder = ["Desayuno", "Comida", "Cena", "Snack"];
  const suggestions = [];
  const mealNameCounts = new Map(
    plannedMeals.map(meal => [meal.name, (plannedMeals.filter(entry => entry.name === meal.name).length || 0)])
  );
  const suspectIngredients = suspectIngredientNames(loggedMeals);
  const eventLoadByDate = new Map(
    weekDates.map(date => [date, events.filter(event => event.date === date).length])
  );

  function complexityScoreFromNames(names = []) {
    const normalized = names.map(name => canonicalizeIngredientName(name)).filter(Boolean);
    let score = normalized.length;
    normalized.forEach(name => {
      if (suspectIngredients.has(name)) score += 4;
      if (["Tomate frito", "Bacon", "Chorizo", "Panceta"].includes(name)) score += 1;
    });
    return score;
  }

  weekDates.forEach(date => {
    slotOrder.forEach(slot => {
      const existing = plannedMeals.find(meal => meal.date === date && meal.slot === slot);
      if (existing) return;
      const agendaLoad = eventLoadByDate.get(date) || 0;
      const dayPressure = pressureByDate[date]?.status || "stable";
      const cycleSensitive = cyclePhase === "menstrual" || cyclePhase === "lutea";
      const digestionSensitive = digestionHeavyCount >= 2;
      const needsSimplification = agendaLoad >= 2 || dayPressure === "overloaded" || mealAdherence < 60 || cycleSensitive || digestionSensitive;

      const recipeCandidates = recipes
        .filter(recipe => {
          const familyCoverage = Array.isArray(recipe.familyCoverage) ? recipe.familyCoverage : [];
          const canonicalIngredients = Array.isArray(recipe.canonicalIngredients) ? recipe.canonicalIngredients : ingredientsFromRecipe(recipe);
          if (canonicalIngredients.some(name => suspectIngredients.has(name))) return false;
          if (slot === "Desayuno") {
            return (
              (familyCoverage.includes("Cereal/tuberculo") || familyCoverage.includes("Lacteos/alternativos") || familyCoverage.includes("Fruta")) &&
              !familyCoverage.includes("Verduras") &&
              !familyCoverage.includes("Carne roja y cerdo") &&
              !familyCoverage.includes("Pescado y marisco")
            );
          }
          if (slot === "Comida") {
            return familyCoverage.includes("Verduras") || familyCoverage.includes("Proteina vegetal") || familyCoverage.includes("Ave y huevos");
          }
          if (slot === "Cena") {
            return familyCoverage.includes("Verduras") || familyCoverage.includes("Pescado y marisco") || familyCoverage.includes("Ave y huevos");
          }
          return (
            recipe.totals?.calories <= 400 ||
            familyCoverage.includes("Fruta") ||
            familyCoverage.includes("Lacteos/alternativos")
          );
        })
        .sort((left, right) => {
          const leftCount = mealNameCounts.get(left.name) || 0;
          const rightCount = mealNameCounts.get(right.name) || 0;
          const leftComplexity = complexityScoreFromNames(left.canonicalIngredients || ingredientsFromRecipe(left));
          const rightComplexity = complexityScoreFromNames(right.canonicalIngredients || ingredientsFromRecipe(right));
          if (needsSimplification) {
            return leftComplexity - rightComplexity || leftCount - rightCount || left.name.localeCompare(right.name);
          }
          return leftCount - rightCount || leftComplexity - rightComplexity || left.name.localeCompare(right.name);
        });

      const selectedRecipe = recipeCandidates[0] || null;
      if (selectedRecipe) {
        mealNameCounts.set(selectedRecipe.name, (mealNameCounts.get(selectedRecipe.name) || 0) + 1);
        suggestions.push({
          id: `${date}-${slot}-recipe`,
          date,
          slot,
          name: selectedRecipe.name,
          recipeId: selectedRecipe.id,
          calories: selectedRecipe.perServing?.calories ?? Math.round(selectedRecipe.totals.calories / selectedRecipe.servings),
          protein: selectedRecipe.perServing?.protein ?? 0,
          carbs: selectedRecipe.perServing?.carbs ?? 0,
          fat: selectedRecipe.perServing?.fat ?? 0,
          status: "planned",
          notes:
            needsSimplification
              ? "Sugerido automaticamente como opcion simple para un dia con mucha carga o baja adherencia."
              : "Sugerido automaticamente para cerrar huecos de la semana.",
          reason:
            agendaLoad >= 2
              ? "agenda-cargada"
              : dayPressure === "overloaded"
                ? "recalibracion-carga"
                : mealAdherence < 60
                  ? "adherencia-baja"
                  : cycleSensitive
                    ? `ciclo-${cyclePhase}`
                    : digestionSensitive
                      ? "digestion-sensible"
                      : "receta-priorizada",
          source: "recipe"
        });
        return;
      }

      const templateKey = SLOT_TEMPLATE_KEYS[slot];
      const templates = PERSONAL_MEAL_TEMPLATES[templateKey] || [];
      const sortedTemplates = templates.slice().sort((left, right) => {
        const leftCount = mealNameCounts.get(left.name) || 0;
        const rightCount = mealNameCounts.get(right.name) || 0;
        const leftComplexity = complexityScoreFromNames(left.ingredients || [left.name]);
        const rightComplexity = complexityScoreFromNames(right.ingredients || [right.name]);
        if (needsSimplification) {
          return leftComplexity - rightComplexity || leftCount - rightCount || left.name.localeCompare(right.name);
        }
        return leftCount - rightCount || leftComplexity - rightComplexity || left.name.localeCompare(right.name);
      });
      const selectedTemplate = sortedTemplates[0];
      if (!selectedTemplate) return;

      mealNameCounts.set(selectedTemplate.name, (mealNameCounts.get(selectedTemplate.name) || 0) + 1);
      suggestions.push({
        id: `${date}-${slot}-template`,
        date,
        slot,
        name: selectedTemplate.name,
        recipeId: null,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        status: "planned",
        notes:
          needsSimplification
            ? "Plantilla sugerida por carga alta o baja adherencia para simplificar la semana."
            : "Plantilla sugerida para completar el planner semanal.",
        reason:
          agendaLoad >= 2
            ? "agenda-cargada"
            : dayPressure === "overloaded"
              ? "recalibracion-carga"
              : mealAdherence < 60
                ? "adherencia-baja"
                : cycleSensitive
                  ? `ciclo-${cyclePhase}`
                  : digestionSensitive
                    ? "digestion-sensible"
                    : "plantilla-base",
        source: "template"
      });
    });
  });

  return suggestions;
}
