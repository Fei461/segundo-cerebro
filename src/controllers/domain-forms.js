export function wireDomainForms(options) {
  const {
    documentRef,
    bindFamilyAutofill,
    bindPlannerRecipeAutofill,
    findRecipe,
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
    addSymptom,
    addEvent,
    addScheduleBlock,
    addSleepEntry,
    saveNoteEntry,
    addMedication,
    addWeeklyTask
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
        const recipe = recipeId ? findRecipe(recipeId) : null;
        const families = uniqueFamilies([formData.get("primaryFamily"), formData.get("secondaryFamily")]);
        const plannedItem = recipe
          ? {
              id: Date.now() + Math.random(),
              date,
              slot,
              name: recipe.name,
              recipeId: recipe.id,
              families: Array.isArray(recipe.familyCoverage) ? recipe.familyCoverage : [],
              calories: Math.round(recipe.totals.calories / recipe.servings),
              protein: Math.round(recipe.totals.protein / recipe.servings),
              carbs: Math.round(recipe.totals.carbs / recipe.servings),
              fat: Math.round(recipe.totals.fat / recipe.servings),
              status: "planned",
              notes: ""
            }
          : {
              id: Date.now() + Math.random(),
              date,
              slot,
              name: requireText(formData.get("name"), "nombre del item planificado"),
              families,
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              status: "planned",
              notes: ""
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
          exercises: String(formData.get("exercises") || "").trim()
        });
        routineForm.reset();
      } catch (error) {
        setStatus(error.message || "No se pudo guardar la rutina.");
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
}
