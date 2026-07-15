import { getPlannedMeals } from "../domain/plans.js";
import {
  PERSONAL_MEAL_TEMPLATES,
  PERSONAL_PANTRY,
  VARIETY_FAMILY_RULES,
  getWeeklyNutritionPrepBoard,
  getWeeklyNutritionReview,
  mealReactionSignals,
  varietyFamiliesFromText
} from "../domain/personal-nutrition.js";
import { addDaysToDateKey, localDateKey, weekStartKeyFromLocalDate } from "../domain/date.js";
import { formatPlanStatus } from "../ui/formatters.js";
import { emptyState, featureHeader, sectionCard, viewSwitcher } from "../ui/feature-layout.js";

const SLOT_LABELS = {
  breakfasts: "Desayuno",
  lunches: "Comida",
  dinners: "Cena",
  snacks: "Snack"
};

const FAMILY_LABELS = {
  "Cereal/tuberculo": "Cereal / tub\u00e9rculo",
  "Ave y huevos": "Ave y huevos",
  "Carne roja y cerdo": "Carne roja y cerdo",
  "Pescado y marisco": "Pescado y marisco",
  "Proteina vegetal": "Prote\u00edna vegetal",
  Verduras: "Verduras",
  Fruta: "Fruta",
  "Lacteos/alternativos": "L\u00e1cteos / alternativos"
};

const SEP = " \u00b7 ";

function todayKey() {
  return localDateKey(new Date());
}

function currentWeekKeySet() {
  const startKey = weekStartKeyFromLocalDate(new Date());
  const keys = [];
  for (let index = 0; index < 7; index += 1) keys.push(addDaysToDateKey(startKey, index));
  return new Set(keys);
}

function displayFamilyLabel(family) {
  return FAMILY_LABELS[String(family || "").trim()] || String(family || "").trim();
}

function pantryIngredientList() {
  return PERSONAL_PANTRY.flatMap(group => group.items);
}

function pantryOptions() {
  return pantryIngredientList().map(item => `<option value="${item}"></option>`).join("");
}

function suggestedNutritionIngredients() {
  return PERSONAL_PANTRY.flatMap(group => group.items)
    .filter(Boolean)
    .slice(0, 18);
}

function ingredientPicker({ title = "Ingredientes", suggestions = [], inputName = "ingredientsText" } = {}) {
  return `
    <div class="ingredient-picker-shell">
      <div class="ingredient-picker-head">
        <span>${title}</span>
        <span class="entry-meta">Selecciona varios</span>
      </div>
      <input name="${inputName}" type="hidden">
      <div class="ingredient-chip-grid" data-ingredient-picker>
        ${suggestions
          .map(item => `<button class="ingredient-chip" type="button" data-ingredient="${item}">${item}</button>`)
          .join("")}
      </div>
      <label class="ingredient-manual-field">
        <span>Otro</span>
        <input data-ingredient-manual placeholder="Añadir alimento">
      </label>
    </div>
  `;
}

function familyOptions(selected = "") {
  return `
    <option value="">Sin definir</option>
    ${VARIETY_FAMILY_RULES.map(
      rule => `<option value="${rule.family}"${rule.family === selected ? " selected" : ""}>${displayFamilyLabel(rule.family)}</option>`
    ).join("")}
  `;
}

function statCard(label, value, detail) {
  return `
    <article class="summary-card summary-card-soft">
      <p class="eyebrow">${label}</p>
      <p class="metric">${value}</p>
      <p class="entry-meta">${detail}</p>
    </article>
  `;
}

function recipeOptions(recipes) {
  return recipes.map(recipe => `<option value="${recipe.id}">${recipe.name}</option>`).join("");
}

function templateSelectOptions() {
  return Object.entries(PERSONAL_MEAL_TEMPLATES)
    .map(
      ([slotKey, items]) => `
        <optgroup label="${SLOT_LABELS[slotKey] || slotKey}">
          ${items.map(item => `<option value="${slotKey}::${item.name}">${item.name}</option>`).join("")}
        </optgroup>
      `
    )
    .join("");
}

function mealFamilies(meal) {
  return Array.from(
    new Set(
      (Array.isArray(meal?.items) ? meal.items : []).flatMap(item => {
        const direct = Array.isArray(item?.families) ? item.families.filter(Boolean) : [];
        const inferred = varietyFamiliesFromText(`${item?.name || ""} ${item?.ingredientsText || ""}`.trim());
        return [...direct, ...inferred];
      })
    )
  );
}

function familiesCoveredToday(meals) {
  return Array.from(new Set(meals.flatMap(meal => mealFamilies(meal))));
}

function weeklyMeals(state) {
  const weekKeys = currentWeekKeySet();
  return {
    plannedMeals: getPlannedMeals(state).filter(meal => weekKeys.has(meal.date)),
    loggedMeals: state.nutrition.meals.filter(meal => weekKeys.has(meal.date))
  };
}

function weeklyReview(state) {
  const { plannedMeals, loggedMeals } = weeklyMeals(state);
  return getWeeklyNutritionReview({ plannedMeals, loggedMeals, recipes: state.recipes });
}

function weeklyPrepBoard(state) {
  const { plannedMeals, loggedMeals } = weeklyMeals(state);
  return getWeeklyNutritionPrepBoard({ plannedMeals, loggedMeals, recipes: state.recipes });
}

function mealItems(meals, emptyText = "Todav\u00eda no has registrado ninguna comida hoy.") {
  if (!meals.length) return emptyState(emptyText);
  return meals
    .map(meal => {
      const families = mealFamilies(meal);
      const names = meal.items.map(item => item.name).join(", ");
      const ingredients = meal.items.map(item => item.ingredientsText).filter(Boolean).join(SEP);
      const reaction = Array.isArray(meal.reaction) ? meal.reaction.filter(Boolean).join(SEP) : String(meal.reaction || "").trim();
      return `
        <article class="entry">
          <div>
            <p class="entry-title">${meal.type}${SEP}${names}</p>
            <p class="entry-meta">${families.length ? families.map(displayFamilyLabel).join(SEP) : "Grupos sin definir"}</p>
            ${ingredients ? `<p class="entry-note">${ingredients}</p>` : ""}
            ${reaction ? `<p class="entry-note">Postcomida: ${reaction}</p>` : ""}
          </div>
          <button class="ghost compact" data-action="delete-meal" data-id="${meal.id}">Eliminar</button>
        </article>
      `;
    })
    .join("");
}

function recipeItems(recipes) {
  if (!recipes.length) return emptyState("A\u00fan no hay recetas guardadas.");
  return recipes
    .map(
      recipe => `
        <article class="entry">
          <div>
            <p class="entry-title">${recipe.name}</p>
            <p class="entry-meta">${recipe.servings} raciones${SEP}${(recipe.familyCoverage || []).slice(0, 3).map(displayFamilyLabel).join(SEP) || "familias por definir"}</p>
          </div>
          <div class="button-row">
            <button class="ghost compact" data-action="log-recipe" data-id="${recipe.id}">Registrar</button>
            <button class="ghost compact" data-action="plan-recipe" data-id="${recipe.id}">Planificar</button>
          </div>
        </article>
      `
    )
    .join("");
}

function plannerItems(items) {
  if (!items.length) return emptyState("A\u00fan no hay comidas programadas.");
  return items
    .slice()
    .sort((left, right) => `${left.date}-${left.slot}`.localeCompare(`${right.date}-${right.slot}`))
    .slice(0, 6)
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.date}${SEP}${item.slot}</p>
            <p class="entry-meta">${item.name}${SEP}${formatPlanStatus(item.status)}</p>
            ${item.ingredientsText ? `<p class="entry-note">${item.ingredientsText}</p>` : ""}
            ${Array.isArray(item.families) && item.families.length ? `<p class="entry-note">${item.families.map(displayFamilyLabel).join(SEP)}</p>` : ""}
          </div>
          <div class="button-row">
            <button class="ghost compact" data-action="cycle-planned-meal-status" data-id="${item.id}">Estado</button>
            <button class="ghost compact" data-action="regenerate-planned-meal" data-id="${item.id}">Cambiar</button>
          </div>
        </article>
      `
    )
    .join("");
}

function pantryCounts(pantryStatus) {
  const values = Object.values(pantryStatus || {});
  return {
    have: values.filter(value => value === "have").length,
    need: values.filter(value => value === "need").length,
    bought: values.filter(value => value === "bought").length,
    avoid: values.filter(value => value === "avoid").length
  };
}

function pantrySummaryCards(pantryStatus) {
  const totals = pantryCounts(pantryStatus);
  return `
    <section class="dashboard-summary compact-metrics feature-metrics-soft">
      ${statCard("Tengo", totals.have, "en casa")}
      ${statCard("Falta", totals.need, "por comprar")}
      ${statCard("Comprado", totals.bought, "cerrado")}
      ${statCard("Evitar", totals.avoid, "marcado")}
    </section>
  `;
}

function pantryCards(pantryStatus) {
  return `
    <div class="pantry-groups-grid">
      ${PERSONAL_PANTRY.map(
        group => `
          <details class="panel panel-toned disclosure-panel compact-disclosure pantry-group-card">
            <summary class="disclosure-summary"><div><p class="eyebrow">${group.family}</p><h4>${group.items.length} b\u00e1sicos</h4></div></summary>
            <div class="stack disclosure-body">
              <div class="pantry-chip-grid">
                ${group.items
                  .map(item => {
                    const status = pantryStatus?.[item] || "";
                    return `<button class="pantry-chip${status ? ` is-${status}` : ""}" type="button" data-action="toggle-pantry-item" data-item="${item}">${item}</button>`;
                  })
                  .join("")}
              </div>
            </div>
          </details>
        `
      ).join("")}
    </div>
  `;
}

function pantryListByStatus(pantryStatus, status, emptyText) {
  const items = Object.entries(pantryStatus || {})
    .filter(([, value]) => value === status)
    .map(([item]) => item);
  if (!items.length) return emptyState(emptyText);
  return items.slice(0, 8).map(item => `<article class="entry"><div><p class="entry-title">${item}</p></div></article>`).join("");
}

function baseTemplateCards({ limit = 4 } = {}) {
  return Object.entries(PERSONAL_MEAL_TEMPLATES)
    .flatMap(([slotKey, items]) =>
      items.slice(0, 1).map(template => `
        <article class="summary-card summary-card-soft template-card">
          <p class="eyebrow">${SLOT_LABELS[slotKey] || slotKey}</p>
          <p class="entry-title">${template.name}</p>
          <p class="entry-meta">${(template.families || []).slice(0, 2).map(displayFamilyLabel).join(SEP)}</p>
          <button class="ghost compact" type="button" data-action="log-meal-template" data-slot="${slotKey}" data-name="${template.name.replace(/"/g, "&quot;")}">Usar hoy</button>
        </article>
      `)
    )
    .slice(0, limit)
    .join("");
}

function shoppingGroupCards(groups) {
  if (!groups.length) return emptyState("Todav\u00eda no hay compra derivada suficiente.");
  return groups
    .slice(0, 5)
    .map(
      group => `
        <article class="summary-card summary-card-soft pantry-shopping-card">
          <p class="eyebrow">${group.family}</p>
          <div class="stack stack-tight">
            ${group.items
              .slice(0, 4)
              .map(
                item => `
                  <div class="shopping-item-row">
                    <div>
                      <p class="entry-title">${item.name}</p>
                      <p class="entry-meta">${item.count} uso(s)</p>
                    </div>
                    <div class="button-row button-row-tight">
                      <button class="ghost compact" type="button" data-action="mark-pantry-have" data-item="${item.name}">Tengo</button>
                      <button class="ghost compact" type="button" data-action="mark-pantry-need" data-item="${item.name}">Falta</button>
                    </div>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      `
    )
    .join("");
}

function familyChipRow(families) {
  if (!families.length) return emptyState("Todav\u00eda no has cubierto grupos hoy.");
  return `<div class="family-chip-row">${families.map(family => `<span class="family-chip">${displayFamilyLabel(family)}</span>`).join("")}</div>`;
}

function nutritionSubviewRibbon(kind, mealsToday, plannedToday, groupedShoppingList, pantryStatus) {
  const missingCount = Object.values(pantryStatus || {}).filter(value => value === "missing").length;
  const pills =
    kind === "plan"
      ? [`${plannedToday.length} prevista(s)`, `${mealsToday.length} hecha(s)`]
      : kind === "shopping"
        ? [`${groupedShoppingList.length} grupo(s)`, `${missingCount} falta(n)`]
        : [`${missingCount} por comprar`, `${plannedToday.length} prevista(s)`];
  return `<div class="premium-pill-row">${pills.map(item => `<span class="premium-pill">${item}</span>`).join("")}</div>`;
}

function favoriteMealsPreview(items) {
  if (!items.length) return emptyState("Todav\u00eda no has definido favoritos.");
  return items.slice(0, 6).map(item => `<article class="entry"><div><p class="entry-title">${item}</p></div></article>`).join("");
}

function avoidIngredientsPreview(items) {
  if (!items.length) return emptyState("Todav\u00eda no has marcado ingredientes a evitar.");
  return items.slice(0, 6).map(item => `<article class="entry"><div><p class="entry-title">${item}</p></div></article>`).join("");
}

function signalItems(state) {
  const items = mealReactionSignals(state.nutrition.meals).slice(0, 3);
  if (!items.length) return emptyState("A\u00fan no hay suficientes postcomidas para detectar patrones.");
  return items
    .map(item => `<article class="entry"><div><p class="entry-title">${item.name}</p><p class="entry-meta">${item.count} apariciones</p></div></article>`)
    .join("");
}

function nextMissingFamilies(review, coveredToday) {
  const pending = review.variety.missingFamilies.filter(family => !coveredToday.includes(family));
  return pending.slice(0, 3);
}

function recurringMealsBlock() {
  return `
    <section class="dashboard-summary compact-metrics template-grid">
      ${baseTemplateCards({ limit: 4 })}
    </section>
  `;
}

function plannerFocusCard(review, plannedToday) {
  const headline = plannedToday.length ? `${plannedToday.length} comida(s) ya colocadas hoy` : "Hoy sigue libre";
  const detail = review.variety.missingFamilies.length
    ? review.variety.missingFamilies.slice(0, 2).map(displayFamilyLabel).join(SEP)
    : "Variedad bien cubierta";
  return `
    <article class="summary-card summary-card-soft">
      <p class="eyebrow">Foco</p>
      <p class="entry-title">${headline}</p>
      <p class="entry-meta">${detail}</p>
    </article>
  `;
}

function plannedTodayPreview(plannedToday) {
  if (!plannedToday.length) return emptyState("Hoy no tienes comidas previstas todav\u00eda.");
  return plannedToday
    .slice()
    .sort((left, right) => String(left.slot || "").localeCompare(String(right.slot || "")))
    .slice(0, 2)
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.slot}</p>
            <p class="entry-meta">${item.name}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function prepPreview(prep) {
  const items = Array.isArray(prep.batchItems) ? prep.batchItems.slice(0, 2) : [];
  if (!items.length) return emptyState("A\u00fan no hay prep semanal claro.");
  return items
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.title}</p>
            <p class="entry-meta">${item.detail}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function compactMealLog(meals) {
  if (!meals.length) return emptyState("Hoy todav\u00eda va en blanco.");
  return `
    <div class="mini-entry-list">
      ${meals
        .slice(-3)
        .reverse()
        .map(meal => {
          const names = meal.items.map(item => item.name).join(", ");
          const families = mealFamilies(meal).slice(0, 2).map(displayFamilyLabel).join(SEP);
          return `<article class="mini-entry"><p class="entry-title">${meal.type}</p><p class="entry-meta">${names}${families ? `${SEP}${families}` : ""}</p></article>`;
        })
        .join("")}
    </div>
  `;
}

function compactPlanPeek(items) {
  if (!items.length) return emptyState("Sin huecos cerrados para hoy.");
  return `
    <div class="mini-entry-list">
      ${items
        .slice(0, 2)
        .map(item => `<article class="mini-entry"><p class="entry-title">${item.slot}</p><p class="entry-meta">${item.name}</p></article>`)
        .join("")}
    </div>
  `;
}

function compactShoppingStatus(pantryStatus) {
  const need = Object.entries(pantryStatus || {})
    .filter(([, value]) => value === "need")
    .map(([item]) => item)
    .slice(0, 4);
  const bought = Object.entries(pantryStatus || {})
    .filter(([, value]) => value === "bought")
    .map(([item]) => item)
    .slice(0, 4);
  return `
    <div class="mini-entry-list">
      <article class="mini-entry">
        <p class="entry-title">Por comprar</p>
        <p class="entry-meta">${need.length ? need.join(SEP) : "Nada pendiente"}</p>
      </article>
      <article class="mini-entry">
        <p class="entry-title">Cerrado</p>
        <p class="entry-meta">${bought.length ? bought.join(SEP) : "Nada marcado a\u00fan"}</p>
      </article>
    </div>
  `;
}

function pantryQuickState(pantryStatus) {
  const have = Object.entries(pantryStatus || {})
    .filter(([, value]) => value === "have")
    .map(([item]) => item)
    .slice(0, 5);
  const need = Object.entries(pantryStatus || {})
    .filter(([, value]) => value === "need")
    .map(([item]) => item)
    .slice(0, 5);
  return `
    <div class="mini-entry-list">
      <article class="mini-entry">
        <p class="entry-title">En casa</p>
        <p class="entry-meta">${have.length ? have.join(SEP) : "Sin b\u00e1sicos marcados"}</p>
      </article>
      <article class="mini-entry">
        <p class="entry-title">Falta</p>
        <p class="entry-meta">${need.length ? need.join(SEP) : "Compra tranquila"}</p>
      </article>
    </div>
  `;
}

export function renderNutritionFeature(state, options = {}) {
  const currentView = options.currentView || "today";
  const today = todayKey();
  const mealsToday = state.nutrition.meals.filter(meal => meal.date === today);
  const coveredToday = familiesCoveredToday(mealsToday);
  const waterToday = Number(state.nutrition.waterLog[today] || 0);
  const review = weeklyReview(state);
  const prep = weeklyPrepBoard(state);
  const plannedMeals = getPlannedMeals(state);
  const plannedToday = plannedMeals.filter(item => item.date === today);
  const pantryStatus = state.nutrition.pantryStatus || {};
  const groupedShoppingList = prep.review?.groupedShoppingList || [];
  const favoriteMeals = Array.isArray(state.nutrition.favoriteMeals) ? state.nutrition.favoriteMeals : [];
  const avoidIngredients = Array.isArray(state.nutrition.avoidIngredients) ? state.nutrition.avoidIngredients : [];
  const missingToday = nextMissingFamilies(review, coveredToday);
  const headerPills = [
    `${mealsToday.length} hoy`,
    `${coveredToday.length} grupo(s)`,
    `${waterToday}/${state.nutrition.waterGoal} agua`
  ];

  let body = "";

  if (currentView === "log") {
    body = `
      <div class="nutrition-secondary-grid nutrition-secondary-grid-tight">
        ${sectionCard("Hoy", "\u00daltimos registros", compactMealLog(mealsToday), "section-card-glass section-card-nutrition-light")}
        ${sectionCard("Plan", "Lo ya cerrado", compactPlanPeek(plannedToday), "section-card-glass section-card-nutrition-light")}
      </div>
      <div class="nutrition-secondary-grid">
        ${sectionCard("Atajos", "Bases", recurringMealsBlock(), "section-card-glass section-card-nutrition-light")}
        ${sectionCard(
          "Registrar",
          "Comida manual",
          `
            <datalist id="pantry-ingredients">${pantryOptions()}</datalist>
            <form id="meal-form" class="stack">
              <div class="field-grid compact-two">
                <label><span>Tipo</span><select name="type"><option>Desayuno</option><option>Comida</option><option>Cena</option><option>Snack</option></select></label>
                <label><span>Nombre</span><input name="name" placeholder="Ej. arroz con pollo" required></label>
              </div>
              ${ingredientPicker({ title: "Alimentos", suggestions: suggestedNutritionIngredients() })}
              <div class="field-grid compact-two">
                <label><span>Grupo principal</span><select name="primaryFamily">${familyOptions()}</select></label>
                <label><span>Grupo secundario</span><select name="secondaryFamily">${familyOptions()}</select></label>
              </div>
              <label><span>Postcomida</span><input name="reaction" placeholder="Ligera, pesada, hinchaz\u00f3n..."></label>
              <button class="primary" type="submit">Guardar comida</button>
            </form>
          `,
          "section-card-tinted section-card-nutrition"
        )}
        ${sectionCard("Registro", "Comidas de hoy", `<div class="stack stack-tight">${mealItems(mealsToday)}</div>`, "section-card-glass section-card-nutrition-light")}
      </div>
    `;
  } else if (currentView === "plan") {
    body = `
      ${sectionCard(
        "Plan",
        "Semana de comida",
        `
          ${nutritionSubviewRibbon("plan", mealsToday, plannedToday, groupedShoppingList, pantryStatus)}
          ${plannerFocusCard(review, plannedToday)}
          <div class="nutrition-secondary-grid">
            ${sectionCard("Hoy", "Lo ya previsto", `<div class="stack stack-tight">${plannedTodayPreview(plannedToday)}</div>`, "section-card-glass section-card-nutrition-light")}
            ${sectionCard("Prep", "Lo que conviene adelantar", `<div class="stack stack-tight">${prepPreview(prep)}</div>`, "section-card-glass section-card-nutrition-light")}
          </div>
        `,
        "section-card-hero section-card-nutrition"
      )}
      <details class="panel panel-toned disclosure-panel compact-disclosure">
            <summary class="disclosure-summary"><div><p class="eyebrow">Nueva</p><h4>Añadir comida prevista</h4></div></summary>
        <div class="stack disclosure-body">
          <datalist id="pantry-ingredients">${pantryOptions()}</datalist>
          <form id="planner-form" class="stack">
            <div class="field-grid compact-two">
              <label><span>Fecha</span><input name="date" type="date" value="${today}" required></label>
              <label><span>Slot</span><select name="slot"><option>Desayuno</option><option selected>Comida</option><option>Cena</option><option>Snack</option></select></label>
            </div>
            <div class="field-grid compact-two">
              <label><span>Plantilla</span><select name="templateKey"><option value="">Elegir una base real</option>${templateSelectOptions()}</select></label>
              <label><span>Receta</span><select name="recipeId"><option value="">o usar receta</option>${recipeOptions(state.recipes)}</select></label>
            </div>
            <div class="field-grid compact-two">
              <label><span>Nombre visible</span><input name="name" placeholder="Solo si es libre"></label>
              <label><span>Nota</span><input name="notes" placeholder="Fuera, sobras, batch..."></label>
            </div>
            <details class="panel panel-toned disclosure-panel compact-disclosure">
              <summary class="disclosure-summary"><div><p class="eyebrow">Libre</p><h4>M\u00e1s detalle</h4></div></summary>
              <div class="stack disclosure-body">
                <div class="field-grid compact-two">
                  <label><span>Grupo principal</span><select name="primaryFamily">${familyOptions()}</select></label>
                  <label><span>Grupo secundario</span><select name="secondaryFamily">${familyOptions()}</select></label>
                </div>
                ${ingredientPicker({ title: "Alimentos previstos", suggestions: suggestedNutritionIngredients() })}
              </div>
            </details>
            <button class="primary" type="submit">Guardar en plan</button>
          </form>
        </div>
      </details>
      ${sectionCard("Rotaci\u00f3n", "Bases de la semana", `<section class="dashboard-summary compact-metrics template-grid">${baseTemplateCards({ limit: 4 })}</section>`, "section-card-glass section-card-nutrition-light")}
      <details class="panel panel-toned disclosure-panel compact-disclosure">
        <summary class="disclosure-summary"><div><p class="eyebrow">Semana</p><h4>Ver plan completo</h4></div></summary>
        <div class="stack disclosure-body">${plannerItems(plannedMeals)}</div>
      </details>
    `;
  } else if (currentView === "shopping") {
    body = `
      ${sectionCard(
        "Compra",
        "Compra clara",
        `
          ${nutritionSubviewRibbon("shopping", mealsToday, plannedToday, groupedShoppingList, pantryStatus)}
          ${pantrySummaryCards(pantryStatus)}
          ${compactShoppingStatus(pantryStatus)}
          <section class="dashboard-summary compact-metrics pantry-shopping-grid">${shoppingGroupCards(groupedShoppingList)}</section>
        `,
        "section-card-hero section-card-nutrition"
      )}
      <div class="nutrition-secondary-grid">
        ${sectionCard("Falta", "Lo que compras esta semana", `<div class="stack stack-tight">${pantryListByStatus(pantryStatus, "need", "Todav\u00eda no has marcado faltas.")}</div>`, "section-card-glass section-card-nutrition-light")}
        ${sectionCard("Cerrado", "Lo que ya est\u00e1 resuelto", `<div class="stack stack-tight">${pantryListByStatus(pantryStatus, "bought", "Todav\u00eda no has cerrado compras.")}</div>`, "section-card-glass section-card-nutrition-light")}
      </div>
    `;
  } else if (currentView === "pantry") {
    body = `
      ${sectionCard(
        "Despensa",
        "Despensa viva",
        `
          ${nutritionSubviewRibbon("pantry", mealsToday, plannedToday, groupedShoppingList, pantryStatus)}
          ${pantrySummaryCards(pantryStatus)}
          ${pantryQuickState(pantryStatus)}
          <form id="pantry-item-form" class="inline-form inline-form-soft">
            <label><span>A\u00f1adir a compra</span><input name="item" placeholder="Ej. avena, tomates, garbanzos"></label>
            <button class="ghost compact" type="submit">A\u00f1adir</button>
          </form>
          <div class="button-row button-row-start button-row-soft">
            <button class="ghost compact" type="button" data-action="clear-pantry-status">Limpiar marcas</button>
          </div>
        `,
        "section-card-hero section-card-nutrition"
      )}
      <details class="panel panel-toned disclosure-panel compact-disclosure">
            <summary class="disclosure-summary"><div><p class="eyebrow">Editar</p><h4>Ver toda la despensa</h4></div></summary>
        <div class="stack disclosure-body">${pantryCards(pantryStatus)}</div>
      </details>
      <details class="panel panel-toned disclosure-panel compact-disclosure">
        <summary class="disclosure-summary"><div><p class="eyebrow">Preferencias</p><h4>Favoritos y evitar</h4></div></summary>
        <div class="stack disclosure-body">
          <form id="nutrition-preferences-form" class="stack">
            <label><span>Comidas favoritas</span><textarea name="favoriteMeals" rows="4" placeholder="Una por l\u00ednea o separadas por coma">${favoriteMeals.join("\n")}</textarea></label>
            <label><span>Ingredientes a evitar</span><textarea name="avoidIngredients" rows="4" placeholder="Uno por l\u00ednea o separados por coma">${avoidIngredients.join("\n")}</textarea></label>
            <button class="primary" type="submit">Guardar preferencias</button>
          </form>
          <div class="nutrition-secondary-grid">
            ${sectionCard("Favoritos", "Lo que s\u00ed quieres repetir", `<div class="stack stack-tight">${favoriteMealsPreview(favoriteMeals)}</div>`, "section-card-glass section-card-nutrition-light")}
            ${sectionCard("Evitar", "Lo que te aleja", `<div class="stack stack-tight">${avoidIngredientsPreview(avoidIngredients)}</div>`, "section-card-glass section-card-nutrition-light")}
          </div>
        </div>
      </details>
      <details class="panel panel-toned disclosure-panel compact-disclosure">
        <summary class="disclosure-summary"><div><p class="eyebrow">Lectura</p><h4>Tolerancia y repetici\u00f3n</h4></div></summary>
        <div class="stack disclosure-body">${signalItems(state)}</div>
      </details>
    `;
  } else if (currentView === "recipes") {
    body = `
      <div class="nutrition-secondary-grid">
        ${sectionCard(
          "Recetas",
          "Guardar base reutilizable",
          `
            <form id="recipe-form" class="stack">
              <div class="field-grid">
                <label><span>Nombre</span><input name="name" placeholder="Ej. arepa de pollo" required></label>
                <label><span>Raciones</span><input name="servings" type="number" min="1" value="2" required></label>
              </div>
              <label><span>Ingredientes</span><textarea name="ingredients" rows="5" placeholder="Arroz | Cereal/tuberculo&#10;Pollo | Ave y huevos&#10;Zanahoria | Verduras" required></textarea></label>
              <button class="primary" type="submit">Guardar receta</button>
            </form>
          `,
          "section-card-tinted section-card-nutrition"
        )}
        ${sectionCard("Guardadas", "Registrar o planificar", `<div class="stack stack-tight">${recipeItems(state.recipes)}</div>`, "section-card-glass section-card-nutrition-light")}
      </div>
    `;
  } else {
    body = `
      ${sectionCard(
        "Hoy",
        "Comer hoy",
        `
          <article class="summary-card summary-card-soft summary-card-premium">
            <p class="eyebrow">Siguiente</p>
            <p class="entry-title">${review.nextAction}</p>
            <p class="entry-meta">${missingToday.length ? missingToday.map(displayFamilyLabel).join(SEP) : "D\u00eda ya bastante cubierto"}</p>
          </article>
          ${familyChipRow(coveredToday)}
          <div class="button-row button-row-start button-row-soft">
            <button class="primary compact" data-action="add-water">+1 vaso</button>
            <button class="ghost compact" type="button" data-action="open-module-view" data-tab="nutrition" data-view="log">Registrar</button>
            <button class="ghost compact" type="button" data-action="open-module-view" data-tab="nutrition" data-view="plan">Plan</button>
          </div>
        `,
        "section-card-hero section-card-nutrition"
      )}
      <div class="nutrition-secondary-grid">
          ${sectionCard("Bases", "Tus comodines", recurringMealsBlock(), "section-card-glass section-card-nutrition-light")}
        ${sectionCard("Hoy", "\u00daltimo registrado", `<div class="stack stack-tight">${mealItems(mealsToday.slice(-2), "Todav\u00eda no hay \u00faltimas comidas que revisar.")}</div>`, "section-card-glass section-card-nutrition-light")}
      </div>
    `;
  }

  return `
    <section id="nutrition-panel" class="panel stack app-feature-shell" data-view="${currentView}">
      ${featureHeader("Nutrici\u00f3n", "Come mejor", "", { emblem: "\u25d4", emblemTone: "nutrition", artSrc: "./icons/scene-nutrition.svg", pills: headerPills })}
      ${viewSwitcher("nutrition", currentView, [
        { id: "today", label: "Resumen" },
        { id: "log", label: "Registrar" },
        { id: "plan", label: "Plan" },
        { id: "recipes", label: "Recetas" },
        { id: "shopping", label: "Compra" },
        { id: "pantry", label: "Despensa" }
      ])}
      ${body}
    </section>
  `;
}
