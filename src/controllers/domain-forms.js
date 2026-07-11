export function wireDomainForms(options) {
  const {
    documentRef,
    bindFamilyAutofill,
    bindPlannerRecipeAutofill,
    findRecipe,
    findMealTemplate,
    requireNumberInRange,
    requireText,
    uniqueFamilies,
    resolveSleepHours,
    setStatus,
    todayKey,
    mealPayloadFromFormData,
    trainingPayloadFromFormData,
    addMealEntry,
    persistState,
    viewModel,
    parseRecipeIngredients,
    totalsFromIngredients,
    recipeMetaFromIngredients,
    replacePlannedMeal,
    addTrainingSession,
    addPlannedSession,
    addRoutine,
    addCustomExercise,
    addSymptom,
    addEvent,
    addScheduleBlock,
    addSleepEntry,
    saveNoteEntry,
    addMedication,
    addWeeklyTask,
    addBookEntry,
    saveLibraryChallenge,
    addGoalEntry,
    addHabitEntry
  } = options;

  const mealForm = documentRef.getElementById("meal-form");
  if (mealForm) {
    bindFamilyAutofill(mealForm);
    mealForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(mealForm);
        await addMealEntry(mealPayloadFromFormData(formData));
        mealForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la comida.");
      }
    });
  }

  const quickMealForm = documentRef.getElementById("quick-meal-form");
  if (quickMealForm) {
    bindFamilyAutofill(quickMealForm);
    quickMealForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(quickMealForm);
        await addMealEntry(mealPayloadFromFormData(formData));
        quickMealForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la comida rápida.");
      }
    });
  }

  const weightForm = documentRef.getElementById("weight-form");
  if (weightForm) {
    weightForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(weightForm);
        const weight = requireNumberInRange(formData.get("weight"), "peso", { min: 20, max: 400 });
        const nextState = {
          ...viewModel.state,
          nutrition: {
            ...viewModel.state.nutrition,
            weightLog: {
              ...viewModel.state.nutrition.weightLog,
              [todayKey()]: weight
            }
          }
        };

        await persistState(nextState, "Peso guardado.");
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el peso.");
      }
    });
  }

  const recipeForm = documentRef.getElementById("recipe-form");
  if (recipeForm) {
    recipeForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(recipeForm);
        const ingredients = parseRecipeIngredients(String(formData.get("ingredients") || ""));
        if (ingredients.length === 0) {
          throw new Error("La receta necesita al menos un ingrediente.");
        }
        const totals = totalsFromIngredients(ingredients);
        const recipe = {
          id: Date.now(),
          servings: Math.max(1, requireNumberInRange(formData.get("servings"), "raciones", { min: 1, max: 20 })),
          name: requireText(formData.get("name"), "nombre de la receta"),
          ingredients,
          totals,
          createdAt: new Date().toISOString()
        };
        Object.assign(recipe, recipeMetaFromIngredients(ingredients, recipe.servings));

        const nextState = {
          ...viewModel.state,
          recipes: [...viewModel.state.recipes, recipe]
        };

        await persistState(nextState, "Receta guardada.");
        recipeForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la receta.");
      }
    });
  }

  const pantryItemForm = documentRef.getElementById("pantry-item-form");
  if (pantryItemForm) {
    pantryItemForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(pantryItemForm);
        const item = requireText(formData.get("item"), "ingrediente de compra");
        const nextState = {
          ...viewModel.state,
          nutrition: {
            ...viewModel.state.nutrition,
            pantryStatus: {
              ...viewModel.state.nutrition.pantryStatus,
              [item]: "need"
            }
          }
        };
        await persistState(nextState, `${item} añadido a la compra.`);
        pantryItemForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo añadir el ingrediente.");
      }
    });
  }

  const plannerForm = documentRef.getElementById("planner-form");
  if (plannerForm) {
    bindPlannerRecipeAutofill(plannerForm, findRecipe);
    bindFamilyAutofill(plannerForm);
    plannerForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(plannerForm);
        const date = requireText(formData.get("date"), "fecha del planner");
        const slot = requireText(formData.get("slot"), "slot del planner");
        const recipeId = String(formData.get("recipeId") || "").trim();
        const templateValue = String(formData.get("templateKey") || "").trim();
        const [templateSlot = "", ...templateNameParts] = templateValue.split("::");
        const templateName = templateNameParts.join("::").trim();
        const recipe = recipeId ? findRecipe(recipeId) : null;
        const template = templateSlot && templateName ? findMealTemplate(templateSlot, templateName) : null;
        const families = uniqueFamilies([formData.get("primaryFamily"), formData.get("secondaryFamily")]);
        const plannedItem = recipe
          ? {
              id: Date.now() + Math.random(),
              date,
              slot,
              name: recipe.name,
              recipeId: recipe.id,
              families: Array.isArray(recipe.familyCoverage) ? recipe.familyCoverage : [],
              ingredientsText: Array.isArray(recipe.ingredients) ? recipe.ingredients.map(item => item.name).filter(Boolean).join(", ") : "",
              canonicalIngredients: Array.isArray(recipe.canonicalIngredients)
                ? recipe.canonicalIngredients
                : Array.isArray(recipe.ingredients)
                  ? recipe.ingredients.map(item => item.name).filter(Boolean)
                  : [],
              calories: Math.round(recipe.totals.calories / recipe.servings),
              protein: Math.round(recipe.totals.protein / recipe.servings),
              carbs: Math.round(recipe.totals.carbs / recipe.servings),
              fat: Math.round(recipe.totals.fat / recipe.servings),
              status: "planned",
              notes: String(formData.get("notes") || "").trim()
            }
          : template
            ? {
                id: Date.now() + Math.random(),
                date,
                slot,
                name: template.name,
                recipeId: null,
                families: Array.isArray(template.families) ? template.families : families,
                ingredientsText: Array.isArray(template.ingredients) ? template.ingredients.join(", ") : "",
                canonicalIngredients: Array.isArray(template.ingredients) ? template.ingredients.filter(Boolean) : [],
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                status: "planned",
                notes: String(formData.get("notes") || "").trim() || "Planificada desde plantilla"
              }
          : {
              id: Date.now() + Math.random(),
              date,
              slot,
              name: requireText(formData.get("name"), "nombre del item planificado"),
              families,
              ingredientsText: String(formData.get("ingredientsText") || "").trim(),
              canonicalIngredients: String(formData.get("ingredientsText") || "")
                .split(/\r?\n|,| con | y /i)
                .map(item => item.trim())
                .filter(Boolean),
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              status: "planned",
              notes: String(formData.get("notes") || "").trim()
            };
        await persistState(replacePlannedMeal(viewModel.state, plannedItem), "Planner actualizado.");
        plannerForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el planner.");
      }
    });
  }

  const trainingForm = documentRef.getElementById("training-form");
  if (trainingForm) {
    trainingForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(trainingForm);
        await addTrainingSession(trainingPayloadFromFormData(formData));
        trainingForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la sesión.");
      }
    });
  }

  const quickTrainingForm = documentRef.getElementById("quick-training-form");
  if (quickTrainingForm) {
    quickTrainingForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(quickTrainingForm);
        await addTrainingSession(trainingPayloadFromFormData(formData));
        quickTrainingForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el entreno rápido.");
      }
    });
  }

  const plannedSessionForm = documentRef.getElementById("planned-session-form");
  if (plannedSessionForm) {
    plannedSessionForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(plannedSessionForm);
        await addPlannedSession({
          date: requireText(formData.get("date"), "fecha de la sesión programada"),
          type: requireText(formData.get("type"), "tipo de sesión"),
          activity: requireText(formData.get("activity"), "actividad programada"),
          duration: requireNumberInRange(formData.get("duration"), "duracion programada", { min: 1, max: 600 }),
          routineName: String(formData.get("routineName") || "").trim(),
          status: requireText(formData.get("status"), "estado"),
          notes: String(formData.get("notes") || "").trim()
        });
        plannedSessionForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo programar la sesión.");
      }
    });
  }

  const routineForm = documentRef.getElementById("routine-form");
  if (routineForm) {
    routineForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(routineForm);
        await addRoutine({
          name: requireText(formData.get("name"), "nombre de la rutina"),
          focus: requireText(formData.get("focus"), "foco de la rutina"),
          exercises: String(formData.get("exercises") || "")
            .split(/\r?\n/)
            .map(item => item.trim())
            .filter(Boolean)
        });
        routineForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la rutina.");
      }
    });
  }

  const customExerciseForm = documentRef.getElementById("custom-exercise-form");
  if (customExerciseForm) {
    customExerciseForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(customExerciseForm);
        await addCustomExercise({
          name: requireText(formData.get("name"), "nombre del ejercicio"),
          type: requireText(formData.get("type"), "tipo"),
          notes: String(formData.get("notes") || "").trim()
        });
        customExerciseForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el ejercicio.");
      }
    });
  }

  const bookForm = documentRef.getElementById("book-form");
  if (bookForm) {
    bookForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(bookForm);
        const rawRating = String(formData.get("rating") || "").trim();
        await addBookEntry({
          title: requireText(formData.get("title"), "título"),
          author: String(formData.get("author") || "").trim(),
          isbn: String(formData.get("isbn") || "").trim(),
          startedAt: String(formData.get("startedAt") || "").trim(),
          finishedAt: String(formData.get("finishedAt") || "").trim(),
          rating: rawRating ? requireNumberInRange(rawRating, "valoración", { min: 1, max: 5 }) : null,
          status: requireText(formData.get("status"), "estado"),
          format: String(formData.get("format") || "").trim(),
          note: String(formData.get("note") || "").trim()
        });
        bookForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el libro.");
      }
    });
  }

  const readingChallengeForm = documentRef.getElementById("reading-challenge-form");
  if (readingChallengeForm) {
    readingChallengeForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(readingChallengeForm);
        await saveLibraryChallenge({
          year: requireNumberInRange(formData.get("year"), "año del reto", { min: 2000, max: 2100 }),
          target: requireNumberInRange(formData.get("target"), "objetivo del reto", { min: 1, max: 365 })
        });
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el reto de lectura.");
      }
    });
  }

  const nutritionPreferencesForm = documentRef.getElementById("nutrition-preferences-form");
  if (nutritionPreferencesForm) {
    nutritionPreferencesForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(nutritionPreferencesForm);
        const favoriteMeals = String(formData.get("favoriteMeals") || "")
          .split(/\r?\n|,/)
          .map(item => item.trim())
          .filter(Boolean);
        const avoidIngredients = String(formData.get("avoidIngredients") || "")
          .split(/\r?\n|,/)
          .map(item => item.trim())
          .filter(Boolean);
        await persistState(
          {
            ...viewModel.state,
            nutrition: {
              ...viewModel.state.nutrition,
              favoriteMeals,
              avoidIngredients
            }
          },
          "Preferencias de nutrición guardadas."
        );
      } catch (error) {
        setStatus(error.message || "No se pudieron guardar las preferencias.");
      }
    });
  }

  const symptomForm = documentRef.getElementById("symptom-form");
  if (symptomForm) {
    symptomForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(symptomForm);
        await addSymptom({
          id: Date.now() + Math.random(),
          date: requireText(formData.get("date"), "fecha del síntoma"),
          name: requireText(formData.get("name"), "nombre del síntoma"),
          intensity: requireNumberInRange(formData.get("intensity"), "intensidad", { min: 1, max: 5 }),
          digestion: String(formData.get("digestion") || "").trim(),
          energy: String(formData.get("energy") || "").trim() ? requireNumberInRange(formData.get("energy"), "energía", { min: 1, max: 5 }) : null,
          mood: String(formData.get("mood") || "").trim() ? requireNumberInRange(formData.get("mood"), "ánimo", { min: 1, max: 5 }) : null,
          note: String(formData.get("note") || "").trim()
        });
        symptomForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el síntoma.");
      }
    });
  }

  const quickCheckinForm = documentRef.getElementById("quick-checkin-form");
  if (quickCheckinForm) {
    quickCheckinForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(quickCheckinForm);
        await addSymptom({
          id: Date.now() + Math.random(),
          date: todayKey(),
          name: requireText(formData.get("name"), "nombre del síntoma"),
          intensity: requireNumberInRange(formData.get("intensity"), "intensidad", { min: 1, max: 5 }),
          digestion: String(formData.get("digestion") || "").trim(),
          energy: String(formData.get("energy") || "").trim() ? requireNumberInRange(formData.get("energy"), "energía", { min: 1, max: 5 }) : null,
          mood: String(formData.get("mood") || "").trim() ? requireNumberInRange(formData.get("mood"), "ánimo", { min: 1, max: 5 }) : null,
          note: String(formData.get("note") || "").trim()
        });
        quickCheckinForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el check-in rápido.");
      }
    });
  }

  const quickSleepForm = documentRef.getElementById("quick-sleep-form");
  if (quickSleepForm) {
    quickSleepForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(quickSleepForm);
        const sleepData = resolveSleepHours(formData);
        await addSleepEntry({
          date: requireText(formData.get("date"), "fecha del sueño"),
          hours: sleepData.hours,
          quality: requireNumberInRange(formData.get("quality"), "calidad del sueño", { min: 1, max: 5 }),
          sleepStart: sleepData.sleepStart,
          sleepEnd: sleepData.sleepEnd,
          notes: String(formData.get("notes") || "").trim()
        });
        quickSleepForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el sueño rápido.");
      }
    });
  }

  const quickEventForm = documentRef.getElementById("quick-event-form");
  if (quickEventForm) {
    quickEventForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(quickEventForm);
        await addEvent({
          title: requireText(formData.get("title"), "titulo del evento"),
          category: String(formData.get("category") || "").trim(),
          date: requireText(formData.get("date"), "fecha del evento"),
          time: String(formData.get("time") || "").trim(),
          note: String(formData.get("note") || "").trim()
        });
        quickEventForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el evento rápido.");
      }
    });
  }

  const quickNoteForm = documentRef.getElementById("quick-note-form");
  if (quickNoteForm) {
    quickNoteForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(quickNoteForm);
        const key = requireText(formData.get("key"), "clave de la nota");
        const value = requireText(formData.get("value"), "contenido de la nota");
        await saveNoteEntry(key, value);
        quickNoteForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la nota rápida.");
      }
    });
  }

  const medForm = documentRef.getElementById("med-form");
  if (medForm) {
    medForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(medForm);
        await addMedication({
          name: requireText(formData.get("name"), "nombre de la medicación"),
          dose: String(formData.get("dose") || "").trim(),
          notes: String(formData.get("notes") || "").trim()
        });
        medForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la medicación.");
      }
    });
  }

  const eventForm = documentRef.getElementById("event-form");
  if (eventForm) {
    eventForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(eventForm);
        await addEvent({
          title: requireText(formData.get("title"), "titulo del evento"),
          category: String(formData.get("category") || "").trim(),
          date: requireText(formData.get("date"), "fecha del evento"),
          time: String(formData.get("time") || "").trim(),
          note: String(formData.get("note") || "").trim()
        });
        eventForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el evento.");
      }
    });
  }

  const blockForm = documentRef.getElementById("block-form");
  if (blockForm) {
    blockForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(blockForm);
        const start = requireText(formData.get("start"), "hora de inicio");
        const end = requireText(formData.get("end"), "hora de fin");
        if (end <= start) {
          throw new Error("La hora de fin debe ser posterior al inicio.");
        }
        await addScheduleBlock({
          title: requireText(formData.get("title"), "titulo del bloque"),
          day: requireText(formData.get("day"), "día del bloque"),
          start,
          end,
          category: String(formData.get("category") || "").trim()
        });
        blockForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el bloque.");
      }
    });
  }

  const sleepForm = documentRef.getElementById("sleep-form");
  if (sleepForm) {
    sleepForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(sleepForm);
        const sleepData = resolveSleepHours(formData);
        await addSleepEntry({
          date: requireText(formData.get("date"), "fecha del sueño"),
          hours: sleepData.hours,
          quality: requireNumberInRange(formData.get("quality"), "calidad del sueño", { min: 1, max: 5 }),
          sleepStart: sleepData.sleepStart,
          sleepEnd: sleepData.sleepEnd,
          notes: String(formData.get("notes") || "").trim()
        });
        sleepForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el sueño.");
      }
    });
  }

  const noteForm = documentRef.getElementById("note-form");
  if (noteForm) {
    noteForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(noteForm);
        const key = requireText(formData.get("key"), "clave de la nota");
        const value = requireText(formData.get("value"), "contenido de la nota");
        await saveNoteEntry(key, value);
        noteForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la nota.");
      }
    });
  }

  const weeklyForm = documentRef.getElementById("weekly-form");
  if (weeklyForm) {
    weeklyForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(weeklyForm);
        await addWeeklyTask({
          title: requireText(formData.get("title"), "tarea semanal"),
          resetDay: requireText(formData.get("resetDay"), "día de reset")
        });
        weeklyForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la checklist semanal.");
      }
    });
  }

  const goalForm = documentRef.getElementById("goal-form");
  if (goalForm) {
    goalForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(goalForm);
        await addGoalEntry({
          title: requireText(formData.get("title"), "objetivo"),
          area: String(formData.get("area") || "").trim(),
          target: String(formData.get("target") || "").trim(),
          notes: String(formData.get("notes") || "").trim()
        });
        goalForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el objetivo.");
      }
    });
  }

  const habitForm = documentRef.getElementById("habit-form");
  if (habitForm) {
    habitForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const formData = new FormData(habitForm);
        await addHabitEntry({
          title: requireText(formData.get("title"), "hábito"),
          cadence: String(formData.get("cadence") || "").trim(),
          notes: String(formData.get("notes") || "").trim()
        });
        habitForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar el hábito.");
      }
    });
  }
}


