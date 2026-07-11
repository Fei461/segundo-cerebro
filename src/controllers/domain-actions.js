export function wireDomainActions(options) {
  const {
    appElement,
    viewModel,
    persistState,
    saveUiState,
    paint,
    todayKey,
    numberValue,
    cyclePantryItem,
    clearPantryStatus,
    regeneratePlannedMeal,
    logRecipeToToday,
    logMealTemplateToToday,
    logPlannedDay,
    getPlannedMeals,
    replacePlannedMeal,
    cyclePlanStatus,
    setPlannedMealStatus,
    setPlannedSessionStatus,
    removePlannedMeal,
    addSuggestedWeeklyTasks,
    getSuggestedWeeklyTasks,
    ensureResetBlockForWeek,
    applyResetRoutine,
    applySuggestedMealSlots,
    applySuggestedSessions,
    saveWeeklyNutritionNotes,
    applyNutritionPrepPack,
    saveWeeklyCalibrationNote,
    applyWeeklyCalibrationPack,
    toggleReviewStep,
    getPlannedSessions,
    replacePlannedSession,
    removePlannedSession,
    togglePeriodToday,
    createSupportBlock,
    toggleMedicationToday,
    currentWeekStartKey,
    getWeeklyChecklist,
    replaceWeeklyChecklist,
    findRecipe
  } = options;

  appElement.querySelectorAll("[data-action='add-water']").forEach(button => {
    button.addEventListener("click", async () => {
      const key = todayKey();
      const current = numberValue(viewModel.state.nutrition.waterLog[key]);
      const nextState = {
        ...viewModel.state,
        nutrition: {
          ...viewModel.state.nutrition,
          waterLog: {
            ...viewModel.state.nutrition.waterLog,
            [key]: current + 1
          }
        }
      };
      await persistState(nextState, "Agua registrada.");
    });
  });

  appElement.querySelectorAll("[data-action='set-home-capture']").forEach(button => {
    button.addEventListener("click", () => {
      viewModel.homeCapture = String(button.dataset.capture || "meal");
      viewModel.currentTab = "home";
      viewModel.moduleViews = {
        ...viewModel.moduleViews,
        home: "capture"
      };
      saveUiState();
      paint();
    });
  });

  appElement.querySelectorAll("[data-action='delete-meal']").forEach(button => {
    button.addEventListener("click", async () => {
      const mealId = Number(button.dataset.id);
      const nextState = {
        ...viewModel.state,
        nutrition: {
          ...viewModel.state.nutrition,
          meals: viewModel.state.nutrition.meals.filter(meal => meal.id !== mealId)
        }
      };
      await persistState(nextState, "Comida eliminada.");
    });
  });

  appElement.querySelectorAll("[data-action='toggle-pantry-item']").forEach(button => {
    button.addEventListener("click", async () => {
      const itemName = String(button.dataset.item || "").trim();
      if (!itemName) return;
      await cyclePantryItem(itemName);
    });
  });

  appElement.querySelectorAll("[data-action='clear-pantry-status']").forEach(button => {
    button.addEventListener("click", async () => {
      await clearPantryStatus();
    });
  });

  appElement.querySelectorAll("[data-action='mark-pantry-need']").forEach(button => {
    button.addEventListener("click", async () => {
      const itemName = String(button.dataset.item || "").trim();
      if (!itemName) return;
      const nextState = {
        ...viewModel.state,
        nutrition: {
          ...viewModel.state.nutrition,
          pantryStatus: {
            ...viewModel.state.nutrition.pantryStatus,
            [itemName]: "need"
          }
        }
      };
      await persistState(nextState, `${itemName} marcado como falta.`);
    });
  });

  appElement.querySelectorAll("[data-action='mark-pantry-have']").forEach(button => {
    button.addEventListener("click", async () => {
      const itemName = String(button.dataset.item || "").trim();
      if (!itemName) return;
      const nextState = {
        ...viewModel.state,
        nutrition: {
          ...viewModel.state.nutrition,
          pantryStatus: {
            ...viewModel.state.nutrition.pantryStatus,
            [itemName]: "have"
          }
        }
      };
      await persistState(nextState, `${itemName} marcado como disponible.`);
    });
  });

  appElement.querySelectorAll("[data-action='log-recipe']").forEach(button => {
    button.addEventListener("click", async () => {
      await logRecipeToToday(button.dataset.id);
    });
  });

  appElement.querySelectorAll("[data-action='regenerate-planned-meal']").forEach(button => {
    button.addEventListener("click", async () => {
      await regeneratePlannedMeal(button.dataset.id);
    });
  });

  appElement.querySelectorAll("[data-action='plan-recipe']").forEach(button => {
    button.addEventListener("click", async () => {
      const recipe = findRecipe(button.dataset.id);
      if (!recipe) return;
      await persistState(
        replacePlannedMeal(viewModel.state, {
          id: Date.now() + Math.random(),
          date: todayKey(),
          slot: "Comida",
          name: recipe.name,
          recipeId: recipe.id,
          families: Array.isArray(recipe.familyCoverage) ? recipe.familyCoverage : [],
          ingredientsText: Array.isArray(recipe.ingredients) ? recipe.ingredients.map(item => item.name).filter(Boolean).join(", ") : "",
          canonicalIngredients: Array.isArray(recipe.canonicalIngredients) ? recipe.canonicalIngredients : [],
          calories: Math.round(Number(recipe.totals?.calories || 0) / Math.max(1, Number(recipe.servings || 1))),
          protein: Math.round(Number(recipe.totals?.protein || 0) / Math.max(1, Number(recipe.servings || 1))),
          carbs: Math.round(Number(recipe.totals?.carbs || 0) / Math.max(1, Number(recipe.servings || 1))),
          fat: Math.round(Number(recipe.totals?.fat || 0) / Math.max(1, Number(recipe.servings || 1))),
          status: "planned",
          notes: "Programada desde recetas"
        }),
        "Receta enviada al planner de hoy."
      );
    });
  });

  appElement.querySelectorAll("[data-action='log-meal-template']").forEach(button => {
    button.addEventListener("click", async () => {
      await logMealTemplateToToday(button.dataset.slot, button.dataset.name);
    });
  });

  appElement.querySelectorAll("[data-action='log-day-plan']").forEach(button => {
    button.addEventListener("click", async () => {
      await logPlannedDay(button.dataset.date);
    });
  });

  appElement.querySelectorAll("[data-action='cycle-planned-meal-status']").forEach(button => {
    button.addEventListener("click", async () => {
      const mealId = String(button.dataset.id || "");
      const meal = getPlannedMeals(viewModel.state).find(entry => String(entry.id) === mealId);
      if (!meal) return;
      await persistState(
        replacePlannedMeal(viewModel.state, {
          ...meal,
          status: cyclePlanStatus(meal.status)
        }),
        "Estado del meal planner actualizado."
      );
    });
  });

  appElement.querySelectorAll("[data-action='set-planned-status']").forEach(button => {
    button.addEventListener("click", async () => {
      const itemId = String(button.dataset.id || "");
      const status = String(button.dataset.status || "planned");
      const kind = String(button.dataset.kind || "");
      if (!itemId || !kind) return;

      if (kind === "meal") {
        await setPlannedMealStatus(itemId, status);
        return;
      }

      if (kind === "session") {
        await setPlannedSessionStatus(itemId, status);
      }
    });
  });

  appElement.querySelectorAll("[data-action='delete-planned-meal']").forEach(button => {
    button.addEventListener("click", async () => {
      const mealId = String(button.dataset.id || "");
      await persistState(removePlannedMeal(viewModel.state, mealId), "Slot planificado eliminado.");
    });
  });

  appElement.querySelectorAll("[data-action='add-weekly-suggestion']").forEach(button => {
    button.addEventListener("click", async () => {
      const title = String(button.dataset.title || "").trim();
      if (!title) return;
      await addSuggestedWeeklyTasks([title]);
    });
  });

  appElement.querySelectorAll("[data-action='add-all-weekly-suggestions']").forEach(button => {
    button.addEventListener("click", async () => {
      const suggestions = getSuggestedWeeklyTasks(viewModel.state).map(item => item.title);
      await addSuggestedWeeklyTasks(suggestions);
    });
  });

  appElement.querySelectorAll("[data-action='create-weekly-reset-block']").forEach(button => {
    button.addEventListener("click", async () => {
      await ensureResetBlockForWeek();
    });
  });

  appElement.querySelectorAll("[data-action='apply-weekly-reset-routine']").forEach(button => {
    button.addEventListener("click", async () => {
      await applyResetRoutine();
    });
  });

  appElement.querySelectorAll("[data-action='apply-suggested-meal-slots']").forEach(button => {
    button.addEventListener("click", async () => {
      await applySuggestedMealSlots();
    });
  });

  appElement.querySelectorAll("[data-action='apply-suggested-sessions']").forEach(button => {
    button.addEventListener("click", async () => {
      await applySuggestedSessions();
    });
  });

  appElement.querySelectorAll("[data-action='save-weekly-nutrition-notes']").forEach(button => {
    button.addEventListener("click", async () => {
      await saveWeeklyNutritionNotes();
    });
  });

  appElement.querySelectorAll("[data-action='apply-weekly-nutrition-pack']").forEach(button => {
    button.addEventListener("click", async () => {
      await applyNutritionPrepPack();
    });
  });

  appElement.querySelectorAll("[data-action='save-weekly-calibration-note']").forEach(button => {
    button.addEventListener("click", async () => {
      await saveWeeklyCalibrationNote();
    });
  });

  appElement.querySelectorAll("[data-action='apply-weekly-calibration-pack']").forEach(button => {
    button.addEventListener("click", async () => {
      await applyWeeklyCalibrationPack();
    });
  });

  appElement.querySelectorAll("[data-action='toggle-weekly-review-step']").forEach(button => {
    button.addEventListener("click", async () => {
      await toggleReviewStep(String(button.dataset.step || ""));
    });
  });

  appElement.querySelectorAll("[data-action='delete-session']").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      await persistState(
        {
          ...viewModel.state,
          training: {
            ...viewModel.state.training,
            sessions: viewModel.state.training.sessions.filter(session => session.id !== id)
          }
        },
        "Sesión eliminada."
      );
    });
  });

  appElement.querySelectorAll("[data-action='delete-routine']").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      await persistState(
        {
          ...viewModel.state,
          training: {
            ...viewModel.state.training,
            routines: viewModel.state.training.routines.filter(routine => routine.id !== id)
          }
        },
        "Rutina eliminada."
      );
    });
  });

  appElement.querySelectorAll("[data-action='delete-book']").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      await persistState(
        {
          ...viewModel.state,
          library: {
            ...(viewModel.state.library || {}),
            books: (Array.isArray(viewModel.state.library?.books) ? viewModel.state.library.books : []).filter(book => book.id !== id)
          }
        },
        "Libro eliminado."
      );
    });
  });

  appElement.querySelectorAll("[data-action='toggle-goal']").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      await persistState(
        {
          ...viewModel.state,
          goals: (Array.isArray(viewModel.state.goals) ? viewModel.state.goals : []).map(goal =>
            goal.id === id ? { ...goal, completed: !goal.completed } : goal
          )
        },
        "Objetivo actualizado."
      );
    });
  });

  appElement.querySelectorAll("[data-action='delete-goal']").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      await persistState(
        {
          ...viewModel.state,
          goals: (Array.isArray(viewModel.state.goals) ? viewModel.state.goals : []).filter(goal => goal.id !== id)
        },
        "Objetivo eliminado."
      );
    });
  });

  appElement.querySelectorAll("[data-action='toggle-habit']").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      await persistState(
        {
          ...viewModel.state,
          habits: (Array.isArray(viewModel.state.habits) ? viewModel.state.habits : []).map(habit =>
            habit.id === id ? { ...habit, activeToday: !habit.activeToday } : habit
          )
        },
        "Hábito actualizado."
      );
    });
  });

  appElement.querySelectorAll("[data-action='delete-habit']").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      await persistState(
        {
          ...viewModel.state,
          habits: (Array.isArray(viewModel.state.habits) ? viewModel.state.habits : []).filter(habit => habit.id !== id)
        },
        "Hábito eliminado."
      );
    });
  });

  appElement.querySelectorAll("[data-action='complete-planned-session']").forEach(button => {
    button.addEventListener("click", async () => {
      const sessionId = String(button.dataset.id || "");
      const session = getPlannedSessions(viewModel.state).find(entry => String(entry.id) === sessionId);
      if (!session) return;

      const nextState = replacePlannedSession(
        {
          ...viewModel.state,
          training: {
            ...viewModel.state.training,
            sessions: [
              ...viewModel.state.training.sessions,
              {
                id: Date.now() + Math.random(),
                date: session.date,
                type: session.type,
                activity: session.activity,
                duration: session.duration,
                structure: session.structure || "",
                exercises: Array.isArray(session.exercises) ? session.exercises : [],
                rpe: null,
                loadKg: null,
                distanceKm: null,
                preEnergy: null,
                recoveryScore: null,
                sorenessScore: null,
                routineName: session.routineName,
                notes: session.notes
              }
            ]
          }
        },
        {
          ...session,
          status: "done"
        }
      );

      await persistState(nextState, "Sesión programada pasada a ejecutada.");
    });
  });

  appElement.querySelectorAll("[data-action='cycle-planned-session-status']").forEach(button => {
    button.addEventListener("click", async () => {
      const sessionId = String(button.dataset.id || "");
      const session = getPlannedSessions(viewModel.state).find(entry => String(entry.id) === sessionId);
      if (!session) return;
      await persistState(
        replacePlannedSession(viewModel.state, {
          ...session,
          status: cyclePlanStatus(session.status)
        }),
        "Estado de la sesión programada actualizado."
      );
    });
  });

  appElement.querySelectorAll("[data-action='delete-planned-session']").forEach(button => {
    button.addEventListener("click", async () => {
      const sessionId = String(button.dataset.id || "");
      await persistState(removePlannedSession(viewModel.state, sessionId), "Sesión programada eliminada.");
    });
  });

  appElement.querySelectorAll("[data-action='toggle-period']").forEach(button => {
    button.addEventListener("click", togglePeriodToday);
  });

  appElement.querySelectorAll("[data-action='create-support-block']").forEach(button => {
    button.addEventListener("click", async () => {
      await createSupportBlock(String(button.dataset.kind || ""));
    });
  });

  appElement.querySelectorAll("[data-action='toggle-med']").forEach(button => {
    button.addEventListener("click", async () => {
      await toggleMedicationToday(Number(button.dataset.id));
    });
  });

  appElement.querySelectorAll("[data-action='delete-med']").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      const nextMeds = viewModel.state.medication.meds.filter(med => med.id !== id);
      const nextLog = Object.fromEntries(
        Object.entries(viewModel.state.medication.log).map(([date, ids]) => [
          date,
          ids.filter(entryId => entryId !== id)
        ])
      );
      await persistState(
        {
          ...viewModel.state,
          medication: {
            ...viewModel.state.medication,
            meds: nextMeds,
            log: nextLog
          }
        },
        "Medicación eliminada."
      );
    });
  });

  appElement.querySelectorAll("[data-action='delete-event']").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      await persistState(
        {
          ...viewModel.state,
          calendar: {
            ...viewModel.state.calendar,
            events: viewModel.state.calendar.events.filter(event => event.id !== id)
          }
        },
        "Evento eliminado."
      );
    });
  });

  appElement.querySelectorAll("[data-action='delete-block']").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.id);
      await persistState(
        {
          ...viewModel.state,
          schedule: {
            ...viewModel.state.schedule,
            blocks: viewModel.state.schedule.blocks.filter(block => block.id !== id)
          }
        },
        "Bloque eliminado."
      );
    });
  });

  appElement.querySelectorAll("[data-action='delete-sleep']").forEach(button => {
    button.addEventListener("click", async () => {
      const date = String(button.dataset.date || "");
      const nextEntries = { ...viewModel.state.sleepEntries };
      delete nextEntries[date];
      await persistState(
        {
          ...viewModel.state,
          sleepEntries: nextEntries
        },
        "Registro de sueño eliminado."
      );
    });
  });

  appElement.querySelectorAll("[data-action='delete-note']").forEach(button => {
    button.addEventListener("click", async () => {
      const key = String(button.dataset.key || "");
      const nextNotes = { ...viewModel.state.notes };
      delete nextNotes[key];
      await persistState(
        {
          ...viewModel.state,
          notes: nextNotes
        },
        "Nota eliminada."
      );
    });
  });

  appElement.querySelectorAll("[data-action='toggle-weekly-task']").forEach(button => {
    button.addEventListener("click", async () => {
      const taskId = String(button.dataset.id || "");
      const weekKey = currentWeekStartKey();
      const checklist = getWeeklyChecklist(viewModel.state, weekKey);
      const nextChecklist = checklist.map(item =>
        String(item.id) === taskId ? { ...item, done: !item.done } : item
      );
      await persistState(replaceWeeklyChecklist(viewModel.state, weekKey, nextChecklist), "Checklist semanal actualizada.");
    });
  });

  appElement.querySelectorAll("[data-action='delete-weekly-task']").forEach(button => {
    button.addEventListener("click", async () => {
      const taskId = String(button.dataset.id || "");
      const weekKey = currentWeekStartKey();
      const checklist = getWeeklyChecklist(viewModel.state, weekKey);
      const nextChecklist = checklist.filter(item => String(item.id) !== taskId);
      await persistState(replaceWeeklyChecklist(viewModel.state, weekKey, nextChecklist), "Tarea semanal eliminada.");
    });
  });
}
