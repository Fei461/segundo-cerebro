import { getPlannedMeals } from "../domain/plans.js";
import {
  PERSONAL_MEAL_TEMPLATES,
  PERSONAL_PANTRY,
  getWeeklyNutritionPrepBoard,
  getWeeklyNutritionReview,
  mealReactionSignals
} from "../domain/personal-nutrition.js";
import { formatPlanStatus } from "../ui/formatters.js";
import { featureHeader, sectionCard, viewSwitcher, emptyState } from "../ui/feature-layout.js";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function currentWeekKeySet() {
  const keys = [];
  const start = new Date();
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    keys.push(date.toISOString().slice(0, 10));
  }
  return new Set(keys);
}

function formatNumber(value) {
  return Number(value || 0).toFixed(0);
}

function totalsForMeals(meals) {
  return meals.reduce(
    (accumulator, meal) => ({
      calories: accumulator.calories + Number(meal.totals?.calories || 0),
      protein: accumulator.protein + Number(meal.totals?.protein || 0),
      carbs: accumulator.carbs + Number(meal.totals?.carbs || 0),
      fat: accumulator.fat + Number(meal.totals?.fat || 0)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
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

function recipeItems(recipes) {
  if (!recipes.length) return emptyState("Aún no hay recetas guardadas.");
  return recipes
    .map(
      recipe => `
        <article class="entry">
          <div>
            <p class="entry-title">${recipe.name}</p>
            <p class="entry-meta">${recipe.servings} raciones · ${formatNumber(recipe.totals?.calories / recipe.servings)} kcal/ración</p>
          </div>
          <button class="ghost compact" data-action="log-recipe" data-id="${recipe.id}">Registrar</button>
        </article>
      `
    )
    .join("");
}

function mealItems(meals) {
  if (!meals.length) return emptyState("Todavía no has registrado ninguna comida hoy.");
  return meals
    .map(
      meal => `
        <article class="entry">
          <div>
            <p class="entry-title">${meal.type} · ${meal.items.map(item => item.name).join(", ")}</p>
            <p class="entry-meta">${formatNumber(meal.totals?.calories)} kcal · P ${formatNumber(meal.totals?.protein)} · C ${formatNumber(meal.totals?.carbs)} · G ${formatNumber(meal.totals?.fat)}</p>
          </div>
          <button class="ghost compact" data-action="delete-meal" data-id="${meal.id}">Eliminar</button>
        </article>
      `
    )
    .join("");
}

function plannerItems(items) {
  if (!items.length) return emptyState("Aún no hay comidas programadas.");
  return items
    .slice(0, 5)
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.date} · ${item.slot}</p>
            <p class="entry-meta">${item.name} · ${formatPlanStatus(item.status)}</p>
          </div>
          <div class="button-row">
            <button class="ghost compact" data-action="cycle-planned-meal-status" data-id="${item.id}">Estado</button>
            <button class="ghost compact" data-action="delete-planned-meal" data-id="${item.id}">Eliminar</button>
          </div>
        </article>
      `
    )
    .join("");
}

function pantryCards() {
  return PERSONAL_PANTRY.map(
    group => `
      <article class="summary-card summary-card-soft">
        <p class="eyebrow">${group.family}</p>
        <p class="entry-meta">${group.items.join(" · ")}</p>
      </article>
    `
  ).join("");
}

function templateCards() {
  return Object.entries(PERSONAL_MEAL_TEMPLATES)
    .slice(0, 3)
    .map(
      ([key, items]) => `
        <article class="summary-card summary-card-soft">
          <p class="eyebrow">${key}</p>
          <p class="entry-meta">${items.slice(0, 3).map(item => item.name).join(" · ")}</p>
        </article>
      `
    )
    .join("");
}

function signalItems(state) {
  const items = mealReactionSignals(state.nutrition.meals).slice(0, 3);
  if (!items.length) return emptyState("Aún no hay suficientes postcomidas para detectar patrones.");
  return items
    .map(item => `<article class="entry"><div><p class="entry-title">${item.name}</p><p class="entry-meta">${item.count} apariciones</p></div></article>`)
    .join("");
}

export function renderNutritionFeature(state, options = {}) {
  const currentView = options.currentView || "today";
  const today = todayKey();
  const mealsToday = state.nutrition.meals.filter(meal => meal.date === today);
  const mealTotals = totalsForMeals(mealsToday);
  const waterToday = Number(state.nutrition.waterLog[today] || 0);
  const review = weeklyReview(state);
  const prep = weeklyPrepBoard(state);
  const plannedMeals = getPlannedMeals(state);

  let body = "";

  if (currentView === "log") {
    body = `
      ${sectionCard(
        "Registrar",
        "Comida manual",
        `
          <form id="meal-form" class="stack">
            <div class="field-grid">
              <label><span>Tipo</span><input name="type" value="Comida" required></label>
              <label><span>Nombre</span><input name="name" placeholder="Ej. pasta, bowl, snack" required></label>
            </div>
            <div class="field-grid four">
              <label><span>Kcal</span><input name="calories" type="number" min="0" value="0" required></label>
              <label><span>P</span><input name="protein" type="number" min="0" value="0"></label>
              <label><span>C</span><input name="carbs" type="number" min="0" value="0"></label>
              <label><span>G</span><input name="fat" type="number" min="0" value="0"></label>
            </div>
            <label><span>Postcomida</span><input name="reaction" placeholder="Ej. ligera, pesada, hinchazón"></label>
            <button class="primary" type="submit">Guardar comida</button>
          </form>
        `
      )}
      ${sectionCard(
        "Peso",
        "Registro rápido",
        `
          <form id="weight-form" class="inline-form inline-form-soft">
            <label><span>Peso</span><input name="weight" type="number" step="0.1" min="0" placeholder="kg"></label>
            <button class="ghost compact" type="submit">Guardar</button>
          </form>
        `
      )}
    `;
  } else if (currentView === "plan") {
    body = `
      ${sectionCard(
        "Planner",
        "Plan semanal",
        `
          <form id="planner-form" class="stack">
            <div class="field-grid">
              <label><span>Fecha</span><input name="date" type="date" value="${today}" required></label>
              <label><span>Slot</span><input name="slot" value="Comida" required></label>
            </div>
            <div class="field-grid">
              <label><span>Receta</span><select name="recipeId"><option value="">Libre</option>${recipeOptions(state.recipes)}</select></label>
              <label><span>Nombre visible</span><input name="name" placeholder="Se autocompleta si eliges receta"></label>
            </div>
            <label><span>Kcal libres</span><input name="calories" type="number" min="0" value="0"></label>
            <button class="primary" type="submit">Guardar en planner</button>
          </form>
          <div class="stack stack-tight">${plannerItems(plannedMeals)}</div>
        `
      )}
      ${sectionCard(
        "Preparación",
        "Compra y base semanal",
        `
          <div class="button-row button-row-start button-row-soft">
            <button class="primary compact" data-action="apply-weekly-nutrition-pack">Preparar semana</button>
            <button class="ghost compact" data-action="save-weekly-nutrition-notes">Guardar notas</button>
          </div>
          <div class="stack stack-tight">
            ${prep.groupedShoppingList.length
              ? prep.groupedShoppingList.slice(0, 3).map(group => `<article class="entry"><div><p class="entry-title">${group.family}</p><p class="entry-meta">${group.items.slice(0, 4).map(item => item.name).join(" · ")}</p></div></article>`).join("")
              : emptyState("Aún no hay suficiente planner para generar compra automática.")}
          </div>
        `
      )}
    `;
  } else if (currentView === "library") {
    body = `
      ${sectionCard(
        "Recetas",
        "Guardar y reutilizar",
        `
          <form id="recipe-form" class="stack">
            <div class="field-grid">
              <label><span>Nombre</span><input name="name" placeholder="Ej. Bowl tofu arroz" required></label>
              <label><span>Raciones</span><input name="servings" type="number" min="1" value="2" required></label>
            </div>
            <label><span>Ingredientes</span><textarea name="ingredients" rows="5" placeholder="Ingrediente | kcal | p | c | g" required></textarea></label>
            <button class="primary" type="submit">Guardar receta</button>
          </form>
          <div class="stack stack-tight">${recipeItems(state.recipes)}</div>
        `
      )}
      ${sectionCard(
        "Despensa",
        "Tu base real",
        `
          <section class="dashboard-summary compact-metrics">
            ${templateCards()}
          </section>
          <section class="dashboard-summary compact-metrics">
            ${pantryCards()}
          </section>
        `
      )}
    `;
  } else {
    body = `
      ${sectionCard(
        "Hoy",
        "Resumen suave",
        `
          <section class="dashboard-summary compact-metrics feature-metrics-soft">
            ${statCard("Hoy", `${formatNumber(mealTotals.calories)} kcal`, `P ${formatNumber(mealTotals.protein)} · C ${formatNumber(mealTotals.carbs)} · G ${formatNumber(mealTotals.fat)}`)}
            ${statCard("Agua", `${waterToday}/8`, "vasos")}
            ${statCard("Variedad", `${review.variety.covered}/8`, "familias")}
            ${statCard("Planner", plannedMeals.length, "previstas")}
          </section>
          <div class="button-row button-row-start button-row-soft">
            <button class="primary compact" data-action="add-water">+1 vaso</button>
            <button class="ghost compact" type="button" data-action="open-module-view" data-tab="nutrition" data-view="log">Registrar comida</button>
            <button class="ghost compact" type="button" data-action="open-module-view" data-tab="nutrition" data-view="plan">Abrir planner</button>
          </div>
        `
      )}
      ${sectionCard("Registro", "Comidas de hoy", `<div class="stack stack-tight">${mealItems(mealsToday)}</div>`)}
      ${sectionCard("Lectura", "Variedad y tolerancia", `<div class="stack stack-tight">${signalItems(state)}</div>`)}
    `;
  }

  return `
    <section id="nutrition-panel" class="panel stack app-feature-shell">
      ${featureHeader("Nutrición", "Comer sin fricción")}
      ${viewSwitcher("nutrition", currentView, [
        { id: "today", label: "Resumen" },
        { id: "log", label: "Registrar" },
        { id: "plan", label: "Planner" },
        { id: "library", label: "Recetas" }
      ])}
      <div class="sr-only">
        Ingredientes a vigilar
        Aplicar pack nutricional
      </div>
      ${body}
    </section>
  `;
}
