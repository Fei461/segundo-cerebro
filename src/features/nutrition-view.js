import { getPlannedMeals } from "../../domain/plans.js";
import {
  PERSONAL_MEAL_TEMPLATES,
  PERSONAL_PANTRY,
  canonicalizeIngredientName,
  getWeeklyNutritionPrepBoard,
  getWeeklyNutritionReview,
  mealReactionSignals,
  repeatedPlannedMealNames
} from "../../domain/personal-nutrition.js";
import { formatPlanStatus } from "../../ui/formatters.js";

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

function weeklyVariety(state) {
  return weeklyReview(state).variety;
}

function weeklyReview(state) {
  const { plannedMeals, loggedMeals } = weeklyMeals(state);
  return getWeeklyNutritionReview({
    plannedMeals,
    loggedMeals,
    recipes: state.recipes
  });
}

function weeklyPrepBoard(state) {
  const { plannedMeals, loggedMeals } = weeklyMeals(state);
  return getWeeklyNutritionPrepBoard({
    plannedMeals,
    loggedMeals,
    recipes: state.recipes
  });
}

function recipeOptions(recipes) {
  return recipes
    .map(recipe => `<option value="${recipe.id}">${recipe.name} - ${formatNumber(recipe.totals?.calories / recipe.servings)} kcal/racion</option>`)
    .join("");
}

function mealItems(meals) {
  if (meals.length === 0) {
    return `<p class="muted">Todavia no has registrado ninguna comida hoy.</p>`;
  }

  return meals
    .map(
      meal => `
        <article class="entry">
          <div>
            <p class="entry-title">${meal.type} - ${meal.items.map(item => item.name).join(", ")}</p>
            <p class="entry-meta">${formatNumber(meal.totals?.calories)} kcal - P ${formatNumber(meal.totals?.protein)} - C ${formatNumber(meal.totals?.carbs)} - G ${formatNumber(meal.totals?.fat)}</p>
            ${meal.reaction?.length ? `<p class="entry-note">Postcomida: ${meal.reaction.join(" - ")}</p>` : ""}
          </div>
          <button class="ghost compact" data-action="delete-meal" data-id="${meal.id}">Eliminar</button>
        </article>
      `
    )
    .join("");
}

function recipeIdentityLine(recipe) {
  const families = Array.isArray(recipe.familyCoverage) ? recipe.familyCoverage : [];
  return families.length > 0 ? families.join(" - ") : "Aun sin familias detectadas";
}

function recipeIngredientLine(recipe) {
  const names = Array.isArray(recipe.canonicalIngredients) ? recipe.canonicalIngredients : [];
  return names.length > 0 ? names.slice(0, 5).join(" - ") : "Ingredientes canonicos pendientes";
}

function recipeItems(recipes) {
  if (recipes.length === 0) {
    return `<p class="muted">Aun no hay recetas guardadas en esta nueva app.</p>`;
  }

  return recipes
    .map(
      recipe => `
        <article class="entry">
          <div>
            <p class="entry-title">${recipe.name}</p>
            <p class="entry-meta">${recipe.servings} raciones - ${formatNumber(recipe.totals?.calories / recipe.servings)} kcal/racion</p>
            <p class="entry-note">${recipeIdentityLine(recipe)}</p>
            <p class="entry-note">${recipeIngredientLine(recipe)}</p>
          </div>
          <button class="ghost compact" data-action="log-recipe" data-id="${recipe.id}">Log hoy</button>
        </article>
      `
    )
    .join("");
}

function pantryCards() {
  return PERSONAL_PANTRY.map(
    group => `
      <article class="summary-card">
        <p class="eyebrow">${group.family}</p>
        <p class="entry-meta">${group.items.join(" - ")}</p>
      </article>
    `
  ).join("");
}

function templateItems(items, tone) {
  return items
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.name}</p>
            <p class="entry-meta">${tone}</p>
            <p class="entry-note">${(item.ingredients || [item.type]).join(" - ")}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function canonicalIngredientItems(state) {
  const seen = new Map();

  state.recipes.forEach(recipe => {
    (recipe.ingredients || []).forEach(ingredient => {
      const canonical = canonicalizeIngredientName(ingredient.name);
      if (!canonical) return;
      seen.set(canonical, (seen.get(canonical) || 0) + 1);
    });
  });

  return Array.from(seen.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 16)
    .map(
      ([name, count]) => `
        <article class="entry">
          <div>
            <p class="entry-title">${name}</p>
            <p class="entry-meta">${count} apariciones en recetas guardadas</p>
          </div>
        </article>
      `
    )
    .join("");
}

function shoppingListItems(state) {
  const items = weeklyReview(state).groupedShoppingList.slice(0, 6);
  if (items.length === 0) {
    return `<p class="muted">Aun no hay suficiente planner semanal para derivar una lista de compra.</p>`;
  }

  return items
    .map(
      group => `
        <article class="entry">
          <div>
            <p class="entry-title">${group.family}</p>
            <p class="entry-meta">${group.items.slice(0, 4).map(item => `${item.name} (${item.count})`).join(" - ")}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function repetitionItems(state) {
  const repeated = repeatedPlannedMealNames(getPlannedMeals(state)).slice(0, 8);
  if (repeated.length === 0) {
    return `<p class="muted">No se detecta repeticion excesiva en el planner actual.</p>`;
  }

  return repeated
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.name}</p>
            <p class="entry-meta">${item.count} veces esta semana</p>
          </div>
        </article>
      `
    )
    .join("");
}

function reactionSignalItems(state) {
  const signals = mealReactionSignals(state.nutrition.meals).slice(0, 8);
  if (signals.length === 0) {
    return `<p class="muted">Aun no hay suficientes comidas con malestar registrado para detectar patrones claros.</p>`;
  }

  return signals
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.name}</p>
            <p class="entry-meta">${item.count} apariciones en comidas con malestar</p>
          </div>
        </article>
      `
    )
    .join("");
}

function weeklyReviewItems(review) {
  return `
    <article class="entry">
      <div>
        <p class="entry-title">Variedad cubierta</p>
        <p class="entry-meta">${review.variety.covered}/${review.variety.total} familias</p>
        <p class="entry-note">${review.variety.families.length ? review.variety.families.join(" - ") : "Aun no hay familias detectadas"}</p>
      </div>
    </article>
    <article class="entry">
      <div>
        <p class="entry-title">Huecos de variedad</p>
        <p class="entry-meta">${review.variety.missingFamilies.length ? review.variety.missingFamilies.slice(0, 4).join(" - ") : "Semana bastante variada"}</p>
      </div>
    </article>
    <article class="entry">
      <div>
        <p class="entry-title">Repeticion principal</p>
        <p class="entry-meta">${review.repeatedMeals.length ? `${review.repeatedMeals[0].name} (${review.repeatedMeals[0].count} veces)` : "Sin repeticion excesiva clara"}</p>
      </div>
    </article>
    <article class="entry">
      <div>
        <p class="entry-title">Siguiente accion nutricional</p>
        <p class="entry-meta">${review.nextAction}</p>
      </div>
    </article>
    <article class="entry">
      <div>
        <p class="entry-title">Ingredientes a vigilar</p>
        <p class="entry-meta">${review.suspectIngredients.length ? review.suspectIngredients.slice(0, 4).map(item => `${item.name} (${item.count})`).join(" - ") : "Sin ingredientes sospechosos repetidos"}</p>
      </div>
    </article>
  `;
}

function batchItemCards(board) {
  if (board.batchItems.length === 0) {
    return `<p class="muted">Aun no hay un batch cooking claro derivado del planner semanal.</p>`;
  }

  return board.batchItems
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.title}</p>
            <p class="entry-meta">${item.detail}</p>
            ${item.ingredients?.length ? `<p class="entry-note">${item.ingredients.join(" - ")}</p>` : ""}
          </div>
        </article>
      `
    )
    .join("");
}

function priorityMealCards(board) {
  if (board.priorityMeals.length === 0) {
    return `<p class="muted">Aun no hay primeras comidas marcadas por resolver.</p>`;
  }

  return board.priorityMeals
    .map(
      meal => `
        <article class="entry">
          <div>
            <p class="entry-title">${meal.date} - ${meal.slot}</p>
            <p class="entry-meta">${meal.name}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function prepSuggestionItems(review) {
  if (review.prepSuggestions.length === 0) {
    return `<p class="muted">Cuando haya mas planner semanal, aqui apareceran sugerencias de batch cooking y meal prep.</p>`;
  }

  return review.prepSuggestions
    .map(
      suggestion => `
        <article class="entry">
          <div>
            <p class="entry-title">${suggestion}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function collapsiblePanel(eyebrow, title, body, open = false) {
  return `
    <details class="subpanel disclosure-panel"${open ? " open" : ""}>
      <summary class="disclosure-summary">
        <div>
          <p class="eyebrow">${eyebrow}</p>
          <h4>${title}</h4>
        </div>
      </summary>
      <div class="stack disclosure-body">${body}</div>
    </details>
  `;
}

function plannerRows(state, recipes) {
  const plannedMeals = getPlannedMeals(state);
  const currentWeek = [];
  const start = new Date();
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    const dayMeals = plannedMeals.filter(meal => meal.date === key);
    currentWeek.push([key, dayMeals]);
  }

  return currentWeek
    .map(([date, dayMeals]) => {
      const meals = ["Desayuno", "Comida", "Cena", "Snack"]
        .map(slot => {
          const item = dayMeals.find(entry => entry.slot === slot);
          if (!item) return `<li>${slot}: <span class="muted">sin plan</span></li>`;
          const recipe = item.recipeId ? recipes.find(entry => String(entry.id) === String(item.recipeId)) : null;
          const calories = recipe ? Math.round(recipe.totals.calories / recipe.servings) : Number(item.calories || 0);
          const statusLabel = formatPlanStatus(item.status);
          return `
            <li>
              ${slot}: ${item.name}${calories ? ` - ${calories} kcal` : ""}
              <span class="status-chip">${statusLabel}</span>
              <span class="planner-actions-inline">
                <button class="ghost compact" data-action="cycle-planned-meal-status" data-id="${item.id}">Estado</button>
                <button class="ghost compact" data-action="delete-planned-meal" data-id="${item.id}">Eliminar</button>
              </span>
            </li>
          `;
        })
        .join("");

      return `
        <article class="planner-day">
          <div class="planner-day-head">
            <p class="entry-title">${date}</p>
            <button class="ghost compact" data-action="log-day-plan" data-date="${date}">Log de hoy si aplica</button>
          </div>
          <ul class="planner-list">${meals}</ul>
        </article>
      `;
    })
    .join("");
}

export function renderNutritionFeature(state) {
  const today = todayKey();
  const mealsToday = state.nutrition.meals.filter(meal => meal.date === today);
  const totals = totalsForMeals(mealsToday);
  const water = Number(state.nutrition.waterLog?.[today] || 0);
  const weight = state.nutrition.weightLog?.[today] ?? "";
  const variety = weeklyVariety(state);
  const review = weeklyReview(state);
  const prepBoard = weeklyPrepBoard(state);

  return `
    <section id="nutrition-panel" class="panel stack nutrition-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Migracion activa</p>
          <h3>Nutricion que apetece usar</h3>
        </div>
        <p class="muted">Registrar, planificar y preparar sin sentirlo como una hoja eterna.</p>
      </div>

      <section class="nutrition-summary compact-metrics">
        <article class="summary-card">
          <p class="eyebrow">Hoy</p>
          <p class="metric">${formatNumber(totals.calories)} kcal</p>
          <p class="entry-meta">P ${formatNumber(totals.protein)} - C ${formatNumber(totals.carbs)} - G ${formatNumber(totals.fat)}</p>
        </article>
        <article class="summary-card">
          <p class="eyebrow">Agua</p>
          <p class="metric">${water}/${state.nutrition.waterGoal || 8}</p>
          <button class="primary compact" data-action="add-water">+1 vaso</button>
        </article>
        <article class="summary-card">
          <p class="eyebrow">Peso</p>
          <form id="weight-form" class="inline-form">
            <input name="weight" type="number" step="0.1" placeholder="kg" value="${weight}">
            <button class="ghost compact" type="submit">Guardar</button>
          </form>
        </article>
        <article class="summary-card">
          <p class="eyebrow">Variedad semanal</p>
          <p class="metric">${variety.covered}/${variety.total}</p>
          <p class="entry-meta">${variety.families.length ? variety.families.join(" - ") : "Aun sin familias detectadas esta semana"}</p>
        </article>
      </section>

      <section class="subpanel stack panel-toned">
        <div class="section-head">
          <div>
            <p class="eyebrow">Pack semanal</p>
            <h4>Semana nutricional</h4>
          </div>
        </div>
        <section class="dashboard-summary compact-metrics">
          <article class="summary-card">
            <p class="eyebrow">Batchs</p>
            <p class="metric">${prepBoard.batchItems.length}</p>
            <p class="entry-meta">bloques accionables detectados</p>
          </article>
          <article class="summary-card">
            <p class="eyebrow">Primeras comidas</p>
            <p class="metric">${prepBoard.priorityMeals.length}</p>
            <p class="entry-meta">comidas a resolver antes</p>
          </article>
          <article class="summary-card">
            <p class="eyebrow">Checklist util</p>
            <p class="metric">${prepBoard.checklistTitles.length}</p>
            <p class="entry-meta">tareas derivables del planner</p>
          </article>
          <article class="summary-card">
            <p class="eyebrow">Alertas</p>
            <p class="metric">${prepBoard.watchouts.length}</p>
            <p class="entry-meta">puntos a vigilar esta semana</p>
          </article>
        </section>
        <div class="button-row">
          <button class="primary compact" data-action="apply-weekly-nutrition-pack">Aplicar pack nutricional</button>
          <button class="ghost compact" data-action="save-weekly-nutrition-notes">Guardar notas semanales</button>
        </div>
        <div class="nutrition-grid">
          <section class="subpanel stack">
            <div class="section-head">
              <div>
                <p class="eyebrow">Batch cooking</p>
                <h4>Bloques recomendados</h4>
              </div>
            </div>
            <div class="stack">${batchItemCards(prepBoard)}</div>
          </section>
          <section class="subpanel stack">
            <div class="section-head">
              <div>
                <p class="eyebrow">Montaje</p>
                <h4>Primeras comidas a cerrar</h4>
              </div>
            </div>
            <div class="stack">${priorityMealCards(prepBoard)}</div>
          </section>
        </div>
      </section>

      <div class="nutrition-grid">
        <section class="subpanel stack rail-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">Hoy</p>
              <h4>Registro rapido y real</h4>
            </div>
          </div>
          <div class="button-row button-row-start">
            <button class="primary compact" data-action="add-water">+1 vaso</button>
          </div>
          <div class="stack">${mealItems(mealsToday)}</div>
        </section>

        <section class="subpanel stack rail-card">
          <div class="section-head">
            <div>
              <p class="eyebrow">Planner</p>
              <h4>Anadir al planner</h4>
            </div>
          </div>
          <form id="planner-form" class="stack">
            <div class="field-grid planner-fields">
              <label><span>Fecha</span><input name="date" type="date" value="${today}" required></label>
              <label><span>Slot</span><input name="slot" value="Comida" required></label>
              <label><span>Receta</span><select name="recipeId"><option value="">Libre</option>${recipeOptions(state.recipes)}</select></label>
            </div>
            <div class="field-grid">
              <label><span>Nombre visible</span><input name="name" placeholder="Se autocompleta si eliges receta"></label>
              <label><span>Kcal libres</span><input name="calories" type="number" step="1" value="0"></label>
            </div>
            <button class="primary" type="submit">Guardar en planner</button>
          </form>
        </section>
      </div>

      ${collapsiblePanel(
        "Semana",
        "Ver planner semanal",
        `<div class="planner-grid">${plannerRows(state, state.recipes)}</div>`
      )}

      ${collapsiblePanel(
        "Registrar hoy",
        "Anadir comida manual",
        `
          <form id="meal-form" class="stack">
            <div class="field-grid">
              <label><span>Tipo</span><input name="type" value="Comida" required></label>
              <label><span>Nombre</span><input name="name" placeholder="Ej. Bowl de arroz con salmon" required></label>
            </div>
            <div class="field-grid four">
              <label><span>Kcal</span><input name="calories" type="number" step="1" value="0" required></label>
              <label><span>Proteina</span><input name="protein" type="number" step="0.1" value="0"></label>
              <label><span>Carbos</span><input name="carbs" type="number" step="0.1" value="0"></label>
              <label><span>Grasas</span><input name="fat" type="number" step="0.1" value="0"></label>
            </div>
            <label><span>Postcomida</span><input name="reaction" placeholder="Ej. Hinchazon, Pesadez o Energia baja"></label>
            <button class="primary" type="submit">Guardar comida</button>
          </form>
        `
      )}

      <section class="fold-grid">
        ${collapsiblePanel(
          "Recetas",
          "Guardar y reutilizar",
          `
            <form id="recipe-form" class="stack">
              <div class="field-grid">
                <label><span>Nombre</span><input name="name" placeholder="Ej. Tortilla con ensalada" required></label>
                <label><span>Raciones</span><input name="servings" type="number" step="1" min="1" value="2" required></label>
              </div>
              <label>
                <span>Ingredientes</span>
                <textarea name="ingredients" rows="5" placeholder="Una linea por ingrediente: nombre|kcal|proteina|carbs|fat" required></textarea>
              </label>
              <button class="primary" type="submit">Guardar receta</button>
            </form>
            <div class="stack">${recipeItems(state.recipes)}</div>
          `
        )}

        ${collapsiblePanel(
          "Despensa personal",
          "Plantillas y fondo de armario",
          `
            <section class="dashboard-summary compact-metrics">
              <article class="summary-card">
                <p class="eyebrow">Desayunos base</p>
                <p class="metric">${PERSONAL_MEAL_TEMPLATES.breakfasts.length}</p>
                <p class="entry-meta">muy repetidos en tu historico</p>
              </article>
              <article class="summary-card">
                <p class="eyebrow">Comidas base</p>
                <p class="metric">${PERSONAL_MEAL_TEMPLATES.lunches.length}</p>
                <p class="entry-meta">fondo de armario operativo</p>
              </article>
              <article class="summary-card">
                <p class="eyebrow">Cenas base</p>
                <p class="metric">${PERSONAL_MEAL_TEMPLATES.dinners.length}</p>
                <p class="entry-meta">rotacion realista</p>
              </article>
              <article class="summary-card">
                <p class="eyebrow">Snacks base</p>
                <p class="metric">${PERSONAL_MEAL_TEMPLATES.snacks.length}</p>
                <p class="entry-meta">los mas repetidos o utiles</p>
              </article>
            </section>
            <div class="planner-grid">${pantryCards()}</div>
            <div class="nutrition-grid">
              <section class="subpanel stack">
                <div class="section-head">
                  <div>
                    <p class="eyebrow">Plantillas reales</p>
                    <h4>Desayunos y snacks</h4>
                  </div>
                </div>
                <div class="stack">
                  ${templateItems(PERSONAL_MEAL_TEMPLATES.breakfasts, "Desayuno")}
                  ${templateItems(PERSONAL_MEAL_TEMPLATES.snacks, "Snack")}
                </div>
              </section>
              <section class="subpanel stack">
                <div class="section-head">
                  <div>
                    <p class="eyebrow">Plantillas reales</p>
                    <h4>Comidas y cenas</h4>
                  </div>
                </div>
                <div class="stack">
                  ${templateItems(PERSONAL_MEAL_TEMPLATES.lunches, "Comida")}
                  ${templateItems(PERSONAL_MEAL_TEMPLATES.dinners, "Cena")}
                </div>
              </section>
            </div>
          `
        )}

        ${collapsiblePanel(
          "Variedad y compra",
          "Lectura semanal util",
          `
            <div class="nutrition-grid">
              <section class="subpanel stack">
                <div class="section-head">
                  <div>
                    <p class="eyebrow">Ingredientes canonicos</p>
                    <h4>Base consolidada</h4>
                  </div>
                </div>
                <div class="stack">${canonicalIngredientItems(state)}</div>
              </section>
              <section class="subpanel stack">
                <div class="section-head">
                  <div>
                    <p class="eyebrow">Lista de compra</p>
                    <h4>Derivada del planner</h4>
                  </div>
                </div>
                <div class="stack">${shoppingListItems(state)}</div>
              </section>
            </div>
            <section class="subpanel stack">
              <div class="section-head">
                <div>
                  <p class="eyebrow">Revision semanal</p>
                  <h4>Lectura util de nutricion</h4>
                </div>
              </div>
              <div class="stack">${weeklyReviewItems(review)}</div>
            </section>
            <section class="subpanel stack">
              <div class="section-head">
                <div>
                  <p class="eyebrow">Meal prep</p>
                  <h4>Preparacion sugerida</h4>
                </div>
              </div>
              <div class="stack">${prepSuggestionItems(review)}</div>
            </section>
            <div class="nutrition-grid">
              <section class="subpanel stack">
                <div class="section-head">
                  <div>
                    <p class="eyebrow">Monotonia</p>
                    <h4>Detector simple de repeticion</h4>
                  </div>
                </div>
                <div class="stack">${repetitionItems(state)}</div>
              </section>
              <section class="subpanel stack">
                <div class="section-head">
                  <div>
                    <p class="eyebrow">Tolerancia</p>
                    <h4>Ingredientes sospechosos</h4>
                  </div>
                </div>
                <div class="stack">${reactionSignalItems(state)}</div>
              </section>
            </div>
          `
        )}
      </section>
    </section>
  `;
}
