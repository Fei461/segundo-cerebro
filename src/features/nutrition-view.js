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

function todayKey() {
  return localDateKey(new Date());
}

function currentWeekKeySet() {
  const startKey = weekStartKeyFromLocalDate(new Date());
  const keys = [];
  for (let index = 0; index < 7; index += 1) {
    keys.push(addDaysToDateKey(startKey, index));
  }
  return new Set(keys);
}

function pantryIngredientList() {
  return PERSONAL_PANTRY.flatMap(group => group.items);
}

function pantryOptions() {
  return pantryIngredientList().map(item => `<option value="${item}"></option>`).join("");
}

function familyOptions(selected = "") {
  return `
    <option value="">Sin definir</option>
    ${VARIETY_FAMILY_RULES.map(rule => `<option value="${rule.family}"${rule.family === selected ? " selected" : ""}>${rule.family}</option>`).join("")}
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

function recipeItems(recipes) {
  if (!recipes.length) return emptyState("Aún no hay recetas guardadas.");
  return recipes
    .map(
      recipe => `
        <article class="entry">
          <div>
            <p class="entry-title">${recipe.name}</p>
            <p class="entry-meta">${recipe.servings} raciones · ${(recipe.familyCoverage || []).slice(0, 3).join(" · ") || "familias por definir"}</p>
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

function mealItems(meals) {
  if (!meals.length) return emptyState("Todavía no has registrado ninguna comida hoy.");
  return meals
    .map(meal => {
      const families = mealFamilies(meal);
      const names = meal.items.map(item => item.name).join(", ");
      const ingredients = meal.items.map(item => item.ingredientsText).filter(Boolean).join(" · ");
      const reaction = Array.isArray(meal.reaction) ? meal.reaction.filter(Boolean).join(" · ") : String(meal.reaction || "").trim();
      return `
        <article class="entry">
          <div>
            <p class="entry-title">${meal.type} · ${names}</p>
            <p class="entry-meta">${families.length ? families.join(" · ") : "Grupos sin definir"}</p>
            ${ingredients ? `<p class="entry-note">${ingredients}</p>` : ""}
            ${reaction ? `<p class="entry-note">Postcomida: ${reaction}</p>` : ""}
          </div>
          <button class="ghost compact" data-action="delete-meal" data-id="${meal.id}">Eliminar</button>
        </article>
      `;
    })
    .join("");
}

function plannerItems(items) {
  if (!items.length) return emptyState("Aún no hay comidas programadas.");
  return items
    .slice()
    .sort((left, right) => `${left.date}-${left.slot}`.localeCompare(`${right.date}-${right.slot}`))
    .slice(0, 8)
    .map(
      item => `
        <article class="entry">
          <div>
            <p class="entry-title">${item.date} · ${item.slot}</p>
            <p class="entry-meta">${item.name} · ${formatPlanStatus(item.status)}</p>
            ${item.ingredientsText ? `<p class="entry-note">${item.ingredientsText}</p>` : ""}
            ${Array.isArray(item.families) && item.families.length ? `<p class="entry-note">${item.families.join(" · ")}</p>` : ""}
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

function pantrySummaryCards(pantryStatus) {
  const values = Object.values(pantryStatus || {});
  const have = values.filter(value => value === "have").length;
  const need = values.filter(value => value === "need").length;
  return `
    <section class="dashboard-summary compact-metrics feature-metrics-soft">
      ${statCard("Tengo", have, "marcados")}
      ${statCard("Falta", need, "por reponer")}
      ${statCard("Fondos", PERSONAL_PANTRY.length, "familias")}
      ${statCard("Plantillas", Object.keys(PERSONAL_MEAL_TEMPLATES).length, "bases")}
    </section>
  `;
}

function pantryCards(pantryStatus) {
  return `
    <div class="pantry-groups-grid">
      ${PERSONAL_PANTRY.map(
        group => `
          <details class="panel panel-toned disclosure-panel compact-disclosure pantry-group-card">
            <summary class="disclosure-summary"><div><p class="eyebrow">${group.family}</p><h4>${group.items.length} básicos</h4></div></summary>
            <div class="stack disclosure-body">
              <div class="pantry-chip-grid">
                ${group.items
                  .map(item => {
                    const status = pantryStatus?.[item] || "";
                    const label = status === "have" ? "Tengo" : status === "need" ? "Falta" : "Neutro";
                    return `
                      <button class="pantry-chip${status ? ` is-${status}` : ""}" type="button" data-action="toggle-pantry-item" data-item="${item}" aria-label="${item}: ${label}">
                        ${item}
                      </button>
                    `;
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

function pantryNeedList(pantryStatus) {
  const needItems = Object.entries(pantryStatus || {})
    .filter(([, value]) => value === "need")
    .map(([item]) => item);
  if (!needItems.length) return emptyState("Todavía no has marcado faltas en la despensa.");
  return needItems.map(item => `<article class="entry"><div><p class="entry-title">${item}</p></div></article>`).join("");
}

function pantryHaveList(pantryStatus) {
  const haveItems = Object.entries(pantryStatus || {})
    .filter(([, value]) => value === "have")
    .map(([item]) => item);
  if (!haveItems.length) return emptyState("Aún no has marcado básicos disponibles.");
  return haveItems.slice(0, 12).map(item => `<article class="entry"><div><p class="entry-title">${item}</p></div></article>`).join("");
}

function pantryCounts(pantryStatus) {
  const values = Object.values(pantryStatus || {});
  return {
    have: values.filter(value => value === "have").length,
    need: values.filter(value => value === "need").length
  };
}

function templateFamilyPreview(items) {
  return Array.from(new Set(items.flatMap(item => varietyFamiliesFromText(`${item.name || ""} ${(item.ingredients || []).join(" ")}`))))
    .slice(0, 3)
    .join(" · ");
}

function templateCards(limit = 6) {
  return Object.entries(PERSONAL_MEAL_TEMPLATES)
    .flatMap(([slot, items]) =>
      items.slice(0, 2).map(template => `
        <article class="summary-card summary-card-soft template-card">
          <p class="eyebrow">${slot}</p>
          <p class="entry-title">${template.name}</p>
          <p class="entry-meta">${templateFamilyPreview([template]) || "familias base"}</p>
          <button class="ghost compact" type="button" data-action="log-meal-template" data-slot="${slot}" data-name="${template.name.replace(/"/g, "&quot;")}">Usar hoy</button>
        </article>
      `)
    )
    .slice(0, limit)
    .join("");
}

function quickTemplateButtons() {
  return Object.entries(PERSONAL_MEAL_TEMPLATES)
    .flatMap(([slot, items]) =>
      items.slice(0, 1).map(template => `
        <button class="ghost compact" type="button" data-action="log-meal-template" data-slot="${slot}" data-name="${template.name.replace(/"/g, "&quot;")}">
          ${template.name}
        </button>
      `)
    )
    .slice(0, 4)
    .join("");
}

function signalItems(state) {
  const items = mealReactionSignals(state.nutrition.meals).slice(0, 3);
  if (!items.length) return emptyState("Aún no hay suficientes postcomidas para detectar patrones.");
  return items
    .map(item => `<article class="entry"><div><p class="entry-title">${item.name}</p><p class="entry-meta">${item.count} apariciones</p></div></article>`)
    .join("");
}

function familyChipRow(families) {
  if (!families.length) return emptyState("Todavía no has cubierto grupos hoy.");
  return `
    <div class="family-chip-row">
      ${families.map(family => `<span class="family-chip">${family}</span>`).join("")}
    </div>
  `;
}

function prepSuggestionPreview(review) {
  const suggestions = review.prepSuggestions.slice(0, 3);
  if (!suggestions.length) return emptyState("Todavía no hay una preparación dominante.");
  return suggestions.map(item => `<article class="entry"><div><p class="entry-title">${item}</p></div></article>`).join("");
}

function plannerNeedSummary(review) {
  const missing = review.variety.missingFamilies.slice(0, 2);
  if (!missing.length) return "Semana bastante cubierta.";
  return `Conviene meter: ${missing.join(" · ")}`;
}

function familyFocusList(review, coveredToday) {
  const todayMissing = review.variety.missingFamilies.filter(item => !coveredToday.includes(item)).slice(0, 2);
  if (!todayMissing.length) return emptyState("Hoy ya vas razonablemente cubierta a nivel de grupos.");
  return todayMissing
    .map(item => `<article class="entry"><div><p class="entry-title">${item}</p><p class="entry-meta">Buen hueco para la siguiente comida.</p></div></article>`)
    .join("");
}

function shoppingGroupCards(groups) {
  if (!groups.length) return emptyState("Todavía no hay compra derivada suficiente.");
  return groups
    .slice(0, 5)
    .map(
      group => `
        <article class="summary-card summary-card-soft pantry-shopping-card">
          <p class="eyebrow">${group.family}</p>
          <div class="stack stack-tight">
            ${group.items
              .slice(0, 5)
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

export function renderNutritionFeature(state, options = {}) {
  const currentView = options.currentView || "today";
  const today = todayKey();
  const mealsToday = state.nutrition.meals.filter(meal => meal.date === today);
  const coveredToday = familiesCoveredToday(mealsToday);
  const waterToday = Number(state.nutrition.waterLog[today] || 0);
  const review = weeklyReview(state);
  const prep = weeklyPrepBoard(state);
  const plannedMeals = getPlannedMeals(state);
  const pantryStatus = state.nutrition.pantryStatus || {};
  const groupedShoppingList = prep.review?.groupedShoppingList || [];
  const pantryTotals = pantryCounts(pantryStatus);

  let body = "";

  if (currentView === "log") {
    body = `
      <div class="nutrition-secondary-grid">
        ${sectionCard(
          "Registrar",
          "Comida manual",
          `
            <datalist id="pantry-ingredients">${pantryOptions()}</datalist>
            <form id="meal-form" class="stack">
              <div class="field-grid">
                <label><span>Tipo</span><select name="type"><option>Desayuno</option><option>Comida</option><option>Cena</option><option>Snack</option></select></label>
                <label><span>Nombre</span><input name="name" placeholder="Ej. pasta con pollo, yogur con fruta..." required></label>
              </div>
              <div class="field-grid">
                <label><span>Grupo principal</span><select name="primaryFamily">${familyOptions()}</select></label>
                <label><span>Grupo secundario</span><select name="secondaryFamily">${familyOptions()}</select></label>
              </div>
              <label><span>Ingredientes</span><input name="ingredientsText" list="pantry-ingredients" placeholder="Ej. arroz, pollo, zanahoria"></label>
              <label><span>Postcomida</span><input name="reaction" placeholder="Ej. ligera, pesada, hinchazón"></label>
              <button class="primary" type="submit">Guardar comida</button>
            </form>
            <form id="weight-form" class="inline-form inline-form-soft">
              <label><span>Peso</span><input name="weight" type="number" step="0.1" min="0" placeholder="kg"></label>
              <button class="ghost compact" type="submit">Guardar peso</button>
            </form>
          `,
          "section-card-tinted section-card-nutrition"
        )}
        ${sectionCard(
          "Plantillas",
          "Usar sin pensar",
          `
            <div class="button-row button-row-start button-row-wrap">
              ${quickTemplateButtons()}
            </div>
            <div class="stack stack-tight">${mealItems(mealsToday)}</div>
          `,
          "section-card-glass section-card-nutrition-light"
        )}
      </div>
    `;
  } else if (currentView === "plan") {
    body = `
      <div class="nutrition-secondary-grid">
        ${sectionCard(
          "Planner",
          "Plan semanal real",
          `
            <datalist id="pantry-ingredients">${pantryOptions()}</datalist>
            <form id="planner-form" class="stack">
              <div class="field-grid">
                <label><span>Fecha</span><input name="date" type="date" value="${today}" required></label>
                <label><span>Slot</span><select name="slot"><option>Desayuno</option><option selected>Comida</option><option>Cena</option><option>Snack</option></select></label>
              </div>
              <div class="field-grid">
                <label><span>Receta</span><select name="recipeId"><option value="">Libre</option>${recipeOptions(state.recipes)}</select></label>
                <label><span>Nombre visible</span><input name="name" placeholder="Ej. bowl rápido, tortilla suave..."></label>
              </div>
              <div class="field-grid">
                <label><span>Grupo principal</span><select name="primaryFamily">${familyOptions()}</select></label>
                <label><span>Grupo secundario</span><select name="secondaryFamily">${familyOptions()}</select></label>
              </div>
              <label><span>Ingredientes previstos</span><textarea name="ingredientsText" rows="3" placeholder="Unos pocos ingredientes clave, separados por comas"></textarea></label>
              <label><span>Nota</span><input name="notes" placeholder="Batch cooking, sobras, comida fuera..."></label>
              <button class="primary" type="submit">Guardar en planner</button>
            </form>
            <p class="muted">${plannerNeedSummary(review)}</p>
          `,
          "section-card-tinted section-card-nutrition"
        )}
        ${sectionCard("Previstas", "Lo ya programado", `<div class="stack stack-tight">${plannerItems(plannedMeals)}</div>`, "section-card-glass section-card-nutrition-light")}
        ${sectionCard(
          "Preparación",
          "Compra y base semanal",
          `
            <div class="button-row button-row-start button-row-soft">
              <button class="primary compact" data-action="apply-weekly-nutrition-pack">Preparar semana</button>
              <button class="ghost compact" data-action="save-weekly-nutrition-notes">Guardar notas</button>
            </div>
            <div class="stack stack-tight">
              ${groupedShoppingList.length
                ? groupedShoppingList
                    .slice(0, 5)
                    .map(group => `<article class="entry"><div><p class="entry-title">${group.family}</p><p class="entry-meta">${group.items.slice(0, 4).map(item => item.name).join(" · ")}</p></div></article>`)
                    .join("")
                : emptyState("Aún no hay suficiente planner para generar compra automática.")}
            </div>
            <div class="stack stack-tight">
              ${prepSuggestionPreview(review)}
            </div>
          `,
          "section-card-glass section-card-nutrition-light"
        )}
      </div>
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
                <label><span>Nombre</span><input name="name" placeholder="Ej. Bowl tofu arroz" required></label>
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
      ${sectionCard("Plantillas", "Usar sin pensar", `<section class="dashboard-summary compact-metrics template-grid">${templateCards(6)}</section>`, "section-card-glass section-card-nutrition-light")}
    `;
  } else if (currentView === "pantry") {
    body = `
      ${sectionCard(
        "Despensa",
        "Tengo y falta",
        `
          ${pantrySummaryCards(pantryStatus)}
          <p class="muted">Toca para alternar entre tengo, falta o neutro.</p>
          <form id="pantry-item-form" class="inline-form inline-form-soft">
            <label><span>Añadir a compra</span><input name="item" placeholder="Ej. garbanzos, tomates, avena"></label>
            <button class="ghost compact" type="submit">Añadir</button>
          </form>
          <div class="button-row button-row-start button-row-soft">
            <button class="ghost compact" type="button" data-action="clear-pantry-status">Limpiar marcas</button>
          </div>
          <div class="stack stack-tight">${pantryCards(pantryStatus)}</div>
        `,
        "section-card-hero section-card-nutrition"
      )}
      <details class="panel panel-toned compact-vault-bar disclosure-panel">
        <summary class="disclosure-summary">
          <div>
            <p class="eyebrow">Lista viva</p>
            <h4>Tengo, falta y compra</h4>
          </div>
        </summary>
        <div class="stack disclosure-body">
          <div class="nutrition-secondary-grid">
            ${sectionCard("Falta", "Lo que reponer", `<div class="stack stack-tight">${pantryNeedList(pantryStatus)}</div>`, "section-card-glass section-card-nutrition-light")}
            ${sectionCard("Tengo", "Base real", `<div class="stack stack-tight">${pantryHaveList(pantryStatus)}</div>`, "section-card-glass section-card-nutrition-light")}
          </div>
          ${sectionCard("Compra", "Convertir planner en despensa", `<section class="dashboard-summary compact-metrics pantry-shopping-grid">${shoppingGroupCards(groupedShoppingList)}</section>`, "section-card-glass section-card-nutrition-light")}
        </div>
      </details>
    `;
  } else {
    body = `
      ${sectionCard(
        "Hoy",
        "Resumen por grupos",
        `
          <section class="dashboard-summary compact-metrics feature-metrics-soft">
            ${statCard("Comidas", mealsToday.length, "registradas")}
            ${statCard("Agua", `${waterToday}/8`, "vasos")}
            ${statCard("Grupos", coveredToday.length, "hoy")}
            ${statCard("Falta", pantryTotals.need, "despensa")}
          </section>
          <article class="entry"><div><p class="entry-title">Variedad semanal</p><p class="entry-meta">${review.variety.covered}/8 familias cubiertas</p></div></article>
          ${familyChipRow(coveredToday)}
          <div class="button-row button-row-start button-row-soft">
            <button class="primary compact" data-action="add-water">+1 vaso</button>
            <button class="ghost compact" type="button" data-action="open-module-view" data-tab="nutrition" data-view="log">Registrar</button>
            <button class="ghost compact" type="button" data-action="open-module-view" data-tab="nutrition" data-view="plan">Planner</button>
            <button class="ghost compact" type="button" data-action="open-module-view" data-tab="nutrition" data-view="recipes">Recetas</button>
            <button class="ghost compact" type="button" data-action="open-module-view" data-tab="nutrition" data-view="pantry">Despensa</button>
          </div>
        `,
        "section-card-hero section-card-nutrition"
      )}
      ${sectionCard(
        "Siguiente",
        "Siguiente comida",
        `
          <article class="entry"><div><p class="entry-title">${review.nextAction}</p></div></article>
          <div class="stack stack-tight">${familyFocusList(review, coveredToday)}</div>
          <div class="button-row button-row-start button-row-soft">
            <button class="ghost compact" type="button" data-action="open-module-view" data-tab="nutrition" data-view="log">Registrar comida</button>
            <button class="ghost compact" type="button" data-action="open-module-view" data-tab="nutrition" data-view="plan">Abrir planner</button>
          </div>
        `,
        "section-card-glass section-card-nutrition-light"
      )}
      <details class="panel panel-toned compact-vault-bar disclosure-panel">
        <summary class="disclosure-summary">
          <div>
            <p class="eyebrow">Más</p>
            <h4>Despensa y tolerancia</h4>
          </div>
        </summary>
        <div class="stack disclosure-body">
          <div class="nutrition-secondary-grid">
            ${sectionCard(
              "Despensa viva",
              "Lo que ya tienes y lo que falta",
              `
                <div class="stack stack-tight">
                  ${Object.values(pantryStatus || {}).some(value => value === "need") ? pantryNeedList(pantryStatus) : pantryHaveList(pantryStatus)}
                </div>
                <div class="button-row button-row-start button-row-soft">
                  <button class="ghost compact" type="button" data-action="open-module-view" data-tab="nutrition" data-view="pantry">Abrir despensa</button>
                </div>
              `,
              "section-card-glass section-card-nutrition-light"
            )}
            ${sectionCard("Lectura", "Variedad y tolerancia", `<div class="stack stack-tight">${signalItems(state)}</div>`, "section-card-glass section-card-nutrition-light")}
          </div>
          ${sectionCard("Registro", "Comidas de hoy", `<div class="stack stack-tight">${mealItems(mealsToday)}</div>`, "section-card-glass section-card-nutrition-light")}
        </div>
      </details>
    `;
  }

  return `
    <section id="nutrition-panel" class="panel stack app-feature-shell">
      ${featureHeader("Nutrición", "Comer sin fricción", "", { emblem: "◔", emblemTone: "nutrition" })}
      ${viewSwitcher("nutrition", currentView, [
        { id: "today", label: "Resumen" },
        { id: "log", label: "Registrar" },
        { id: "plan", label: "Planner" },
        { id: "recipes", label: "Recetas" },
        { id: "pantry", label: "Despensa" }
      ])}
      ${body}
    </section>
  `;
}
