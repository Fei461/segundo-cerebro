import { varietyFamiliesFromText } from "../domain/personal-nutrition.js";

export function uniqueFamilies(values = []) {
  return Array.from(new Set(values.map(value => String(value || "").trim()).filter(Boolean)));
}

export function inferFamiliesFromFields(...values) {
  return uniqueFamilies(values.flatMap(value => varietyFamiliesFromText(String(value || "").trim())));
}

export function sleepHoursFromClockRange(start, end) {
  if (!start || !end) return null;
  const [startHour, startMinute] = String(start).split(":").map(Number);
  const [endHour, endMinute] = String(end).split(":").map(Number);
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return null;

  const startTotal = startHour * 60 + startMinute;
  let endTotal = endHour * 60 + endMinute;
  if (endTotal <= startTotal) endTotal += 24 * 60;
  const diffHours = (endTotal - startTotal) / 60;
  return diffHours > 0 && diffHours <= 24 ? Number(diffHours.toFixed(1)) : null;
}

export function resolveSleepHoursFromValues({ rawHours = "", sleepStart = "", sleepEnd = "" }, requireNumberInRange) {
  const normalizedHours = String(rawHours || "").trim();
  const normalizedStart = String(sleepStart || "").trim();
  const normalizedEnd = String(sleepEnd || "").trim();

  if (normalizedHours) {
    return {
      hours: requireNumberInRange(normalizedHours, "horas de sueño", { min: 0, max: 24 }),
      sleepStart: normalizedStart,
      sleepEnd: normalizedEnd
    };
  }

  const inferred = sleepHoursFromClockRange(normalizedStart, normalizedEnd);
  if (inferred != null) {
    return { hours: inferred, sleepStart: normalizedStart, sleepEnd: normalizedEnd };
  }

  throw new Error("Añade horas o completa la hora de acostarte y levantarte.");
}

export function applyFamilySelects(form, families = []) {
  if (!form) return;
  const primary = form.querySelector("[name='primaryFamily']");
  const secondary = form.querySelector("[name='secondaryFamily']");
  if (!primary || !secondary) return;

  if (!primary.value && families[0]) primary.value = families[0];
  if (!secondary.value && families[1]) secondary.value = families[1];
}

export function bindFamilyAutofill(form) {
  if (!form) return;
  const nameInput = form.querySelector("[name='name']");
  const ingredientsInput = form.querySelector("[name='ingredientsText']");
  const sync = () => {
    const families = inferFamiliesFromFields(nameInput?.value, ingredientsInput?.value);
    applyFamilySelects(form, families);
  };
  nameInput?.addEventListener("blur", sync);
  ingredientsInput?.addEventListener("blur", sync);
}

export function bindPlannerRecipeAutofill(form, findRecipe) {
  if (!form) return;
  const recipeSelect = form.querySelector("[name='recipeId']");
  const nameInput = form.querySelector("[name='name']");
  const ingredientsInput = form.querySelector("[name='ingredientsText']");
  if (!recipeSelect || !nameInput || typeof findRecipe !== "function") return;

  recipeSelect.addEventListener("change", () => {
    const recipeId = String(recipeSelect.value || "").trim();
    if (!recipeId) return;
    const recipe = findRecipe(recipeId);
    if (!recipe) return;
    if (!nameInput.value.trim()) {
      nameInput.value = recipe.name || "";
    }
    if (ingredientsInput && !ingredientsInput.value.trim()) {
      ingredientsInput.value = Array.isArray(recipe.ingredients)
        ? recipe.ingredients.map(item => item.name).filter(Boolean).join(", ")
        : "";
    }
    applyFamilySelects(form, Array.isArray(recipe.familyCoverage) ? recipe.familyCoverage : []);
  });
}
