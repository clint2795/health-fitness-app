(function () {
  var navItems = [
    { page: "home", label: "Today", href: "index.html" },
    { page: "workout", label: "Workout", href: "workout.html" },
    { page: "setup", label: "Setup", href: "setup.html" },
    { page: "exercises", label: "Exercises", href: "exercises.html" },
    { page: "history", label: "History", href: "history.html" }
  ];

  var injuryLabels = {
    shoulderFriendlyMode: "Shoulder-friendly mode",
    lowerBackProtection: "Lower-back protection",
    avoidHeavyAxialLoading: "Avoid heavy axial loading",
    avoidRiskyOverheadPressing: "Avoid risky overhead pressing"
  };

  var muscleDisplayLabels = {
    shoulderPrep: "Shoulder Prep / Warm-Up",
    sideDelts: "Side Delts",
    upperChest: "Upper Chest",
    chest: "Chest",
    backWidth: "Back Width",
    backThickness: "Back Thickness / Support",
    rearDelts: "Rear Delts",
    biceps: "Biceps",
    triceps: "Triceps",
    legs: "Legs",
    absWaist: "Abs / Waist"
  };

  var muscleAliases = {
    shoulderPrep: ["shoulderPrep", "Shoulder Prep / Warm-Up"],
    sideDelts: ["sideDelts", "Side delts"],
    upperChest: ["upperChest", "Upper chest"],
    chest: ["chest", "Chest"],
    backWidth: ["backWidth", "Back width"],
    backThickness: ["backThickness", "Back thickness", "Back Thickness / Support"],
    rearDelts: ["rearDelts", "Rear delts"],
    biceps: ["biceps", "Biceps"],
    triceps: ["triceps", "Triceps"],
    legs: ["legs", "Legs"],
    absWaist: ["absWaist", "Abs / waist"]
  };

  var exercisePreferenceCategories = [
    "shoulderPrep",
    "sideDelts",
    "upperChest",
    "chest",
    "backWidth",
    "backThickness",
    "rearDelts",
    "biceps",
    "triceps",
    "legs",
    "absWaist"
  ];

  var exerciseGroupOrder = exercisePreferenceCategories.slice();

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeMuscle(muscle) {
    var keys = Object.keys(muscleAliases);
    var matched = keys.find(function (key) {
      return muscleAliases[key].indexOf(muscle) !== -1;
    });

    return matched || muscle;
  }

  function renderNavigation() {
    var nav = document.querySelector(".bottom-nav");
    var currentPage = document.body.dataset.page;

    if (!nav) {
      return;
    }

    nav.innerHTML = navItems.map(function (item) {
      var activeClass = item.page === currentPage ? " active" : "";
      var currentAttribute = item.page === currentPage ? ' aria-current="page"' : "";

      return '<a class="' + activeClass.trim() + '" href="' + item.href + '"' + currentAttribute + ">" + item.label + "</a>";
    }).join("");
  }

  function renderHomePage() {
    if (!window.TrainingLogic || !window.TrainingStorage) {
      return;
    }

    var state = window.TrainingStorage.getAppState();
    var session = window.TrainingLogic.generateTodaySession(state);
    var warnings = window.TrainingLogic.getRecoveryWarnings();
    var title = document.querySelector("#today-session-title");
    var week = document.querySelector("#today-week");
    var summary = document.querySelector("#today-session-summary");
    var goalName = document.querySelector("#today-goal-name");
    var bodyweight = document.querySelector("#today-bodyweight");
    var targetRir = document.querySelector("#today-target-rir");
    var focus = document.querySelector("#today-focus");
    var warningsList = document.querySelector("#recovery-warnings");
    var prepContainer = document.querySelector("#today-prep");
    var exercisesContainer = document.querySelector("#today-exercises");
    var weeklyVolumeContainer = document.querySelector("#weekly-volume-status");
    var sessionReason = document.querySelector("#today-session-reason");
    var generateButton = document.querySelector("#generate-session-button");
    var startButton = document.querySelector("#start-workout-button");

    if (title) title.textContent = session.title;
    if (week) week.textContent = "Week " + session.mesocycleWeek;
    if (summary) summary.textContent = "Muscle-priority session for " + session.date + ".";
    if (summary && (state.activeGoalPreset || state.selectedSessionTemplate)) {
      summary.textContent = "Muscle-priority session for " + session.date + ". " + getActiveSetupSummary(state);
    }
    if (goalName) goalName.textContent = state.userProfile.goalName;
    if (bodyweight) bodyweight.textContent = state.userProfile.bodyweightKg + " kg";
    if (targetRir) targetRir.textContent = session.targetRir;
    if (focus) {
      focus.textContent = session.muscles.map(function (muscle) {
        return getMuscleLabel(muscle);
      }).join(", ");
    }
    if (warningsList) {
      warningsList.innerHTML = warnings.map(function (warning) {
        return "<li>" + escapeHtml(warning) + "</li>";
      }).join("");
    }
    if (prepContainer) {
      prepContainer.innerHTML = renderPlanItems(session.prep, "prep");
    }
    if (exercisesContainer) {
      exercisesContainer.innerHTML = renderPlanItems(session.exercises, "exercise");
    }
    if (weeklyVolumeContainer) {
      weeklyVolumeContainer.innerHTML = renderWeeklyVolumeStatus(session.remainingWeeklySets);
    }
    if (sessionReason) {
      sessionReason.textContent = session.why || "Session selected from remaining weekly set targets and recent training history.";
    }
    if (generateButton) {
      generateButton.onclick = renderHomePage;
    }
    if (startButton) {
      startButton.onclick = function () {
        window.TrainingStorage.saveActiveSession(session);
        window.location.href = "workout.html";
      };
    }
    renderDebugPanel(state, session);
  }

  function renderPlanItems(items, type) {
    if (!items || items.length === 0) {
      return '<p class="subtle">None planned.</p>';
    }

    return items.map(function (item) {
      var setLabel = type === "prep" ? item.plannedSets + " prep sets" : item.plannedSets + " working sets";
      var rir = item.targetRir ? " - " + escapeHtml(item.targetRir) : "";

      return (
        '<article class="plan-card">' +
          '<div class="card-header">' +
            '<div>' +
              '<h3>' + escapeHtml(item.name) + '</h3>' +
              '<p class="subtle">' + escapeHtml(getMuscleLabel(item.primaryMuscle)) + '</p>' +
            '</div>' +
            '<span class="badge">' + escapeHtml(setLabel) + '</span>' +
          '</div>' +
          '<p>' + escapeHtml(item.repRange) + rir + '</p>' +
          '<p class="subtle">' + escapeHtml(item.notes) + '</p>' +
        '</article>'
      );
    }).join("");
  }

  function getActiveSetupSummary(state) {
    var preset = getGoalPresetById(state, state.activeGoalPreset);
    var template = getSessionTemplateById(state, state.selectedSessionTemplate);
    var parts = [];

    if (preset) {
      parts.push("Goal: " + preset.name);
    }

    if (template) {
      parts.push("Template preference: " + template.name);
    }

    return parts.join(" - ");
  }

  function getVolumeStatus(item) {
    if (item.remaining <= 0) {
      return "Done";
    }

    if (item.completed >= item.target * 0.6) {
      return "On track";
    }

    return "Behind";
  }

  function renderWeeklyVolumeStatus(remainingWeeklySets) {
    if (!remainingWeeklySets) {
      return '<p class="subtle">No weekly volume data yet.</p>';
    }

    return Object.keys(remainingWeeklySets).map(function (muscle) {
      var item = remainingWeeklySets[muscle];
      var status = getVolumeStatus(item);

      return (
        '<article class="volume-status-card">' +
          '<div class="card-header">' +
            '<div>' +
              '<h3>' + escapeHtml(getMuscleLabel(muscle)) + '</h3>' +
              '<p class="subtle">' + escapeHtml(item.completed) + ' / ' + escapeHtml(item.target) + ' sets completed - ' + escapeHtml(item.remaining) + ' remaining</p>' +
            '</div>' +
            '<span class="status-label status-' + escapeHtml(status.toLowerCase().replace(" ", "-")) + '">' + escapeHtml(status) + '</span>' +
          '</div>' +
        '</article>'
      );
    }).join("");
  }

  function renderDebugPanel(state, session) {
    var container = document.querySelector("#debug-summary");
    var clearActiveButton = document.querySelector("#debug-clear-active-session");
    var clearHistoryButton = document.querySelector("#debug-clear-workout-history");
    var resetStateButton = document.querySelector("#debug-reset-app-state");

    if (!container || !window.TrainingStorage || !window.TrainingLogic) {
      return;
    }

    container.innerHTML = buildDebugSummary(state, session);

    if (clearActiveButton) {
      clearActiveButton.onclick = function () {
        if (confirm("Clear activeSession only?")) {
          window.TrainingStorage.clearActiveSession();
          renderHomePage();
        }
      };
    }

    if (clearHistoryButton) {
      clearHistoryButton.onclick = function () {
        if (confirm("Clear workout history only?")) {
          window.TrainingStorage.clearWorkoutHistory();
          renderHomePage();
        }
      };
    }

    if (resetStateButton) {
      resetStateButton.onclick = function () {
        if (confirm("Reset app state to defaults? Workout history and activeSession are not cleared.")) {
          window.TrainingStorage.resetAppState();
          renderHomePage();
        }
      };
    }
  }

  function buildDebugSummary(state, session) {
    var history = window.TrainingStorage.getWorkoutHistory();
    var activeSession = window.TrainingStorage.getActiveSession();
    var recommendations = window.TrainingStorage.getPendingVolumeRecommendations();
    var weeklyVolume = window.TrainingLogic.calculateWeeklyVolume(history);
    var remaining = window.TrainingLogic.calculateRemainingWeeklySets(state, weeklyVolume);
    var appSummary = {
      goalName: state.userProfile.goalName,
      bodyweightKg: state.userProfile.bodyweightKg,
      currentWeek: state.mesocycleSettings.currentWeek,
      trainingDaysPerWeek: state.mesocycleSettings.trainingDaysPerWeek,
      injurySettings: state.injurySettings
    };
    var sessionSummary = {
      id: session.id,
      title: session.title,
      muscles: session.muscles,
      targetRir: session.targetRir,
      prepCount: session.prep.length,
      exerciseCount: session.exercises.length,
      workingSets: session.exercises.reduce(function (total, exercise) {
        return total + exercise.plannedSets;
      }, 0)
    };

    return (
      '<div class="debug-grid">' +
        renderDebugBlock("Current app state", appSummary) +
        renderDebugBlock("Weekly volume", weeklyVolume) +
        renderDebugBlock("Remaining weekly sets", remaining) +
        renderDebugBlock("Generated session", sessionSummary) +
        renderDebugBlock("Storage counts", {
          activeSessionStatus: activeSession ? activeSession.status : "none",
          workoutHistoryCount: history.length,
          pendingVolumeRecommendationCount: recommendations.filter(function (item) {
            return item.status === "pending";
          }).length
        }) +
      '</div>'
    );
  }

  function renderDebugBlock(title, value) {
    return (
      '<article class="debug-block">' +
        '<h3>' + escapeHtml(title) + '</h3>' +
        '<pre>' + escapeHtml(JSON.stringify(value, null, 2)) + '</pre>' +
      '</article>'
    );
  }

  function setValue(id, value) {
    var element = document.querySelector("#" + id);

    if (element) {
      element.value = value;
    }
  }

  function getNumberValue(id, fallback) {
    var element = document.querySelector("#" + id);
    var value = element ? Number(element.value) : NaN;

    return Number.isFinite(value) ? value : fallback;
  }

  function renderPriorityEditor(musclePriorities) {
    var container = document.querySelector("#priority-muscles");

    if (!container) {
      return;
    }

    container.innerHTML = musclePriorities.map(function (muscle) {
      return (
        '<article class="priority-card" data-muscle-id="' + escapeHtml(muscle.id) + '">' +
          '<div class="card-header">' +
            '<div>' +
              '<h3>' + escapeHtml(muscle.name) + '</h3>' +
              '<p class="subtle">' + escapeHtml(muscle.priority) + " priority - " + escapeHtml(muscle.goal) + " - " + escapeHtml(muscle.frequency) + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="set-row">' +
            '<label>Starting sets<input class="muscle-starting-sets" type="number" min="0" max="40" value="' + escapeHtml(muscle.startingSets) + '"></label>' +
            '<label>Max sets<input class="muscle-max-sets" type="number" min="0" max="40" value="' + escapeHtml(muscle.maxSets) + '"></label>' +
          '</div>' +
        '</article>'
      );
    }).join("");
  }

  function renderInjurySettings(injurySettings) {
    var container = document.querySelector("#injury-settings");

    if (!container) {
      return;
    }

    container.innerHTML = Object.keys(injuryLabels).map(function (key) {
      var checked = injurySettings[key] ? " checked" : "";

      return (
        '<label class="toggle-row">' +
          '<input type="checkbox" data-injury-setting="' + key + '"' + checked + '>' +
          '<span>' + injuryLabels[key] + '</span>' +
        '</label>'
      );
    }).join("");
  }

  function getGoalPresetById(state, id) {
    return (state.goalPresets || []).find(function (preset) {
      return preset.id === id;
    });
  }

  function getSessionTemplateById(state, id) {
    return (state.sessionTemplates || []).find(function (template) {
      return template.id === id;
    });
  }

  function renderGoalPresetOptions(state) {
    var select = document.querySelector("#goal-preset-select");

    if (!select) {
      return;
    }

    select.innerHTML = (state.goalPresets || []).map(function (preset) {
      var selected = preset.id === state.activeGoalPreset ? " selected" : "";

      return '<option value="' + escapeHtml(preset.id) + '"' + selected + '>' + escapeHtml(preset.name) + '</option>';
    }).join("");
    select.value = state.activeGoalPreset || ((state.goalPresets || [])[0] || {}).id || "";
  }

  function renderGoalPresetSummary() {
    var state = window.TrainingStorage.getAppState();
    var select = document.querySelector("#goal-preset-select");
    var summary = document.querySelector("#goal-preset-summary");
    var preset = select ? getGoalPresetById(state, select.value) : null;
    var muscleRows;

    if (!summary || !preset) {
      return;
    }

    muscleRows = Object.keys(preset.muscleUpdates || {}).map(function (muscle) {
      var item = preset.muscleUpdates[muscle];

      return '<span class="tag">' + escapeHtml(getMuscleLabel(muscle)) + ': ' + escapeHtml(item.startingSets) + ' sets, ' + escapeHtml(item.priority) + '</span>';
    }).join("");

    summary.innerHTML = (
      '<article class="preset-card">' +
        '<h3>' + escapeHtml(preset.name) + '</h3>' +
        '<p>' + escapeHtml(preset.purpose) + '</p>' +
        '<p class="subtle">Training days: ' + escapeHtml(preset.trainingDaysPerWeek) + ' per week</p>' +
        '<div class="tag-row">' + muscleRows + '</div>' +
      '</article>'
    );
  }

  function applyGoalPreset() {
    var state = collectSetupState();
    var select = document.querySelector("#goal-preset-select");
    var preset = select ? getGoalPresetById(state, select.value) : null;
    var status = document.querySelector("#settings-save-status");

    if (!preset) {
      return;
    }

    if (!confirm("Apply " + preset.name + "? This updates goal name, priority targets, training days, and safe default exercise preferences.")) {
      return;
    }

    state.activeGoalPreset = preset.id;
    state.userProfile.goalName = preset.name;
    state.userProfile.goalDescription = preset.purpose;
    state.mesocycleSettings.trainingDaysPerWeek = preset.trainingDaysPerWeek || state.mesocycleSettings.trainingDaysPerWeek;

    state.musclePriorities = state.musclePriorities.map(function (muscle) {
      return Object.assign({}, muscle, (preset.muscleUpdates || {})[muscle.id] || {});
    });

    Object.keys(preset.exercisePreferences || {}).forEach(function (muscle) {
      state.exercisePreferences[muscle] = preset.exercisePreferences[muscle].slice();
    });

    window.TrainingStorage.saveAppState(state);
    loadSetupForm();

    if (status) {
      status.textContent = "Goal preset applied.";
    }
  }

  function renderSessionTemplates(state) {
    var container = document.querySelector("#session-templates");

    if (!container) {
      return;
    }

    container.innerHTML = (state.sessionTemplates || []).map(function (template) {
      var selected = template.id === state.selectedSessionTemplate;

      return (
        '<article class="template-card' + (selected ? " selected" : "") + '">' +
          '<div class="card-header">' +
            '<div>' +
              '<h3>' + escapeHtml(template.name) + '</h3>' +
              '<p class="subtle">' + escapeHtml(template.recoveryNote) + '</p>' +
            '</div>' +
            '<span class="badge">' + escapeHtml(template.setRange) + '</span>' +
          '</div>' +
          '<div class="tag-row">' + template.targetMuscles.map(function (muscle) {
            return '<span class="tag">' + escapeHtml(muscle) + '</span>';
          }).join("") + '</div>' +
          '<button class="button" type="button" data-select-template="' + escapeHtml(template.id) + '">' + (selected ? "Selected" : "Use / Preview Template") + '</button>' +
        '</article>'
      );
    }).join("");

    container.querySelectorAll("[data-select-template]").forEach(function (button) {
      button.addEventListener("click", function () {
        var latest = collectSetupState();
        latest.selectedSessionTemplate = button.dataset.selectTemplate;
        window.TrainingStorage.saveAppState(latest);
        renderSessionTemplates(window.TrainingStorage.getAppState());
        var status = document.querySelector("#settings-save-status");

        if (status) {
          status.textContent = "Template preference saved.";
        }
      });
    });
  }

  function getExercisesForPreferenceCategory(state, muscle) {
    return (state.exerciseLibrary || []).filter(function (exercise) {
      return normalizeMuscle(exercise.primaryMuscle) === muscle;
    }).sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
  }

  function getExerciseOptionLabel(exercise) {
    var labels = [exercise.name, exercise.status];

    if (exercise.shoulderFriendly === "caution") {
      labels.push("shoulder caution");
    }

    if (exercise.lowerBackFriendly === "caution") {
      labels.push("lower-back caution");
    }

    if (exercise.status === "avoid") {
      labels.push("avoid");
    }

    return labels.join(" - ");
  }

  function renderExercisePreferenceSelect(muscle, slot, options, selectedId) {
    var choices = '<option value="">No preference</option>' + options.map(function (exercise) {
      var selected = exercise.id === selectedId ? " selected" : "";

      return '<option value="' + escapeHtml(exercise.id) + '"' + selected + '>' + escapeHtml(getExerciseOptionLabel(exercise)) + '</option>';
    }).join("");

    return (
      '<label>' + escapeHtml(slot) +
        '<select data-exercise-preference="' + escapeHtml(muscle) + '">' +
          choices +
        '</select>' +
      '</label>'
    );
  }

  function renderExercisePreferences(state) {
    var container = document.querySelector("#exercise-preferences");
    var preferences = state.exercisePreferences || {};

    if (!container) {
      return;
    }

    container.innerHTML = exercisePreferenceCategories.map(function (muscle) {
      var options = getExercisesForPreferenceCategory(state, muscle);
      var saved = preferences[muscle] || [];

      if (options.length === 0) {
        return "";
      }

      return (
        '<article class="exercise-preference-card">' +
          '<div class="card-header">' +
            '<div>' +
              '<h3>' + escapeHtml(getMuscleLabel(muscle)) + '</h3>' +
              '<p class="subtle">Choose default movements for this category. Avoid choices are marked if shown.</p>' +
            '</div>' +
          '</div>' +
          '<div class="preference-select-row">' +
            renderExercisePreferenceSelect(muscle, "First choice", options, saved[0]) +
            renderExercisePreferenceSelect(muscle, "Second choice", options, saved[1]) +
            renderExercisePreferenceSelect(muscle, "Backup", options, saved[2]) +
          '</div>' +
        '</article>'
      );
    }).join("");
  }

  function loadSetupForm() {
    var state = window.TrainingStorage.getAppState();

    setValue("goal-name", state.userProfile.goalName);
    setValue("bodyweight-kg", state.userProfile.bodyweightKg);
    setValue("target-date", state.userProfile.targetDate);
    setValue("training-days-per-week", state.mesocycleSettings.trainingDaysPerWeek);
    setValue("session-length-minutes", state.userProfile.preferredSessionLengthMinutes);
    setValue("current-week", state.mesocycleSettings.currentWeek);
    renderGoalPresetOptions(state);
    renderGoalPresetSummary();
    renderSessionTemplates(state);
    renderPriorityEditor(state.musclePriorities);
    renderExercisePreferences(state);
    renderInjurySettings(state.injurySettings);
  }

  function collectSetupState() {
    var state = window.TrainingStorage.getAppState();
    var priorityCards = document.querySelectorAll("[data-muscle-id]");
    var injuryInputs = document.querySelectorAll("[data-injury-setting]");
    var preferenceInputs = document.querySelectorAll("[data-exercise-preference]");

    state.userProfile.bodyweightKg = getNumberValue("bodyweight-kg", state.userProfile.bodyweightKg);
    state.userProfile.preferredSessionLengthMinutes = getNumberValue("session-length-minutes", state.userProfile.preferredSessionLengthMinutes);
    state.mesocycleSettings.trainingDaysPerWeek = getNumberValue("training-days-per-week", state.mesocycleSettings.trainingDaysPerWeek);
    state.mesocycleSettings.currentWeek = getNumberValue("current-week", state.mesocycleSettings.currentWeek);

    priorityCards.forEach(function (card) {
      var muscle = state.musclePriorities.find(function (item) {
        return item.id === card.dataset.muscleId;
      });
      var startingSetsInput = card.querySelector(".muscle-starting-sets");
      var maxSetsInput = card.querySelector(".muscle-max-sets");

      if (muscle) {
        muscle.startingSets = Number(startingSetsInput.value);
        muscle.maxSets = Number(maxSetsInput.value);
      }
    });

    injuryInputs.forEach(function (input) {
      state.injurySettings[input.dataset.injurySetting] = input.checked;
    });

    state.exercisePreferences = {};
    preferenceInputs.forEach(function (input) {
      var muscle = input.dataset.exercisePreference;

      state.exercisePreferences[muscle] = state.exercisePreferences[muscle] || [];

      if (input.value && state.exercisePreferences[muscle].indexOf(input.value) === -1) {
        state.exercisePreferences[muscle].push(input.value);
      }
    });

    return state;
  }

  function saveSetupForm() {
    var state = collectSetupState();
    var status = document.querySelector("#settings-save-status");

    window.TrainingStorage.saveAppState(state);

    if (status) {
      status.textContent = "Settings saved.";
    }
  }

  function renderSetupPage() {
    var saveButton = document.querySelector("#save-settings-button");
    var presetSelect = document.querySelector("#goal-preset-select");
    var applyPresetButton = document.querySelector("#apply-goal-preset-button");

    if (!window.TrainingStorage) {
      return;
    }

    loadSetupForm();

    if (saveButton) {
      saveButton.addEventListener("click", saveSetupForm);
    }

    if (presetSelect) {
      presetSelect.addEventListener("change", renderGoalPresetSummary);
    }

    if (applyPresetButton) {
      applyPresetButton.addEventListener("click", applyGoalPreset);
    }
  }

  function getUniqueMuscles(exercises) {
    return exercises.reduce(function (muscles, exercise) {
      var muscle = normalizeMuscle(exercise.primaryMuscle);

      if (muscles.indexOf(muscle) === -1) {
        muscles.push(muscle);
      }

      return muscles;
    }, []);
  }

  function getMuscleLabel(muscle) {
    var normalized = normalizeMuscle(muscle);

    return muscleDisplayLabels[normalized] || muscle;
  }

  function isFriendly(value) {
    return value === true;
  }

  function matchesExerciseSearch(exercise, searchTerm) {
    var text;

    if (!searchTerm) {
      return true;
    }

    text = [
      exercise.name,
      exercise.primaryMuscle,
      exercise.equipment,
      exercise.status,
      exercise.notes,
      (exercise.secondaryMuscles || []).join(" ")
    ].join(" ").toLowerCase();

    return text.indexOf(searchTerm.toLowerCase()) !== -1;
  }

  function filterExercises(exercises, filters) {
    filters = filters || {};

    return exercises.filter(function (exercise) {
      var exerciseMuscle = normalizeMuscle(exercise.primaryMuscle);

      if (!matchesExerciseSearch(exercise, filters.search)) {
        return false;
      }

      if (filters.muscle && filters.muscle !== "all" && exerciseMuscle !== filters.muscle) {
        return false;
      }

      if (filters.status && filters.status !== "all" && exercise.status !== filters.status) {
        return false;
      }

      if (filters.preferredOnly && exercise.status !== "preferred") {
        return false;
      }

      if (!filters.showAvoid && exercise.status === "avoid") {
        return false;
      }

      if (filters.shoulderFriendlyOnly && !isFriendly(exercise.shoulderFriendly)) {
        return false;
      }

      if (filters.lowerBackFriendlyOnly && !isFriendly(exercise.lowerBackFriendly)) {
        return false;
      }

      return true;
    });
  }

  function getExerciseFilters() {
    var search = document.querySelector("#exercise-search");
    var status = document.querySelector("#exercise-filter-status");

    return {
      search: search ? search.value : "",
      muscle: document.querySelector("#exercise-filter-muscle").value,
      status: status ? status.value : "all",
      preferredOnly: document.querySelector("#filter-preferred-only").checked,
      showAvoid: document.querySelector("#filter-show-avoid").checked,
      shoulderFriendlyOnly: document.querySelector("#filter-shoulder-friendly").checked,
      lowerBackFriendlyOnly: document.querySelector("#filter-lower-back-friendly").checked
    };
  }

  function renderExerciseFilterOptions(exercises) {
    var select = document.querySelector("#exercise-filter-muscle");

    if (!select) {
      return;
    }

    select.innerHTML = '<option value="all">All muscles</option>' + getUniqueMuscles(exercises).map(function (muscle) {
      return '<option value="' + escapeHtml(muscle) + '">' + escapeHtml(getMuscleLabel(muscle)) + '</option>';
    }).join("");
  }

  function formatFriendliness(value) {
    if (value === true) return "yes";
    if (value === false) return "no";
    return value;
  }

  function renderExerciseLibrary() {
    var container = document.querySelector("#exercise-library");
    var state = window.TrainingStorage.getAppState();
    var filteredExercises = filterExercises(state.exerciseLibrary, getExerciseFilters());
    var muscles = getUniqueMuscles(filteredExercises).sort(function (a, b) {
      var aIndex = exerciseGroupOrder.indexOf(a);
      var bIndex = exerciseGroupOrder.indexOf(b);

      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex) || getMuscleLabel(a).localeCompare(getMuscleLabel(b));
    });

    if (!container) {
      return;
    }

    if (filteredExercises.length === 0) {
      container.innerHTML = '<section class="card"><p class="subtle">No exercises match these filters.</p></section>';
      return;
    }

    container.innerHTML = muscles.map(function (muscle) {
      var cards = filteredExercises.filter(function (exercise) {
        return normalizeMuscle(exercise.primaryMuscle) === muscle;
      }).map(function (exercise) {
        return renderCompactExerciseRow(exercise);
      }).join("");

      return (
        '<section class="exercise-group">' +
          '<h2>' + escapeHtml(getMuscleLabel(muscle)) + '</h2>' +
          '<div class="stack">' + cards + '</div>' +
        '</section>'
      );
    }).join("");

    bindExerciseLibraryActions(container);
  }

  function renderCompactExerciseRow(exercise) {
    return (
      '<article class="exercise-row" data-exercise-row="' + escapeHtml(exercise.id) + '">' +
        '<button class="exercise-row-summary" type="button" data-toggle-exercise="' + escapeHtml(exercise.id) + '" aria-expanded="false">' +
          '<span>' +
            '<strong>' + escapeHtml(exercise.name) + '</strong>' +
            '<span class="subtle">' + escapeHtml(getMuscleLabel(exercise.primaryMuscle)) + ' - ' + escapeHtml(exercise.equipment) + '</span>' +
          '</span>' +
          '<span class="status-label status-' + escapeHtml(exercise.status) + '">' + escapeHtml(exercise.status) + '</span>' +
        '</button>' +
        '<div class="compact-safety-row">' +
          '<span class="tag">shoulder: ' + escapeHtml(formatFriendliness(exercise.shoulderFriendly)) + '</span>' +
          '<span class="tag">lower back: ' + escapeHtml(formatFriendliness(exercise.lowerBackFriendly)) + '</span>' +
        '</div>' +
        '<div class="exercise-row-details" hidden>' +
          '<dl class="compact-details">' +
            '<div><dt>Rep range</dt><dd>' + escapeHtml(exercise.repRange) + '</dd></div>' +
            '<div><dt>Secondary</dt><dd>' + escapeHtml((exercise.secondaryMuscles || []).join(", ") || "None") + '</dd></div>' +
            '<div><dt>Shoulder</dt><dd>' + escapeHtml(formatFriendliness(exercise.shoulderFriendly)) + '</dd></div>' +
            '<div><dt>Lower back</dt><dd>' + escapeHtml(formatFriendliness(exercise.lowerBackFriendly)) + '</dd></div>' +
          '</dl>' +
          '<p>' + escapeHtml(exercise.notes) + '</p>' +
          '<div class="button-row">' +
            '<button class="button" type="button" data-set-preferred="' + escapeHtml(exercise.id) + '">Set as Preferred</button>' +
            '<button class="button" type="button" disabled>Add to Workout Later</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function bindExerciseLibraryActions(container) {
    container.querySelectorAll("[data-toggle-exercise]").forEach(function (button) {
      button.addEventListener("click", function () {
        var row = button.closest("[data-exercise-row]");
        var details = row ? row.querySelector(".exercise-row-details") : null;
        var expanded = details ? details.hidden : false;

        if (details) {
          details.hidden = !expanded;
          button.setAttribute("aria-expanded", String(expanded));
        }
      });
    });

    container.querySelectorAll("[data-set-preferred]").forEach(function (button) {
      button.addEventListener("click", function () {
        setExerciseAsPreferred(button.dataset.setPreferred);
      });
    });
  }

  function setExerciseAsPreferred(exerciseId) {
    var state = window.TrainingStorage.getAppState();
    var exercise = state.exerciseLibrary.find(function (item) {
      return item.id === exerciseId;
    });
    var muscle;
    var current;

    if (!exercise) {
      return;
    }

    muscle = normalizeMuscle(exercise.primaryMuscle);
    current = state.exercisePreferences[muscle] || [];
    state.exercisePreferences[muscle] = [exercise.id].concat(current.filter(function (id) {
      return id !== exercise.id;
    })).slice(0, 3);

    window.TrainingStorage.saveAppState(state);
    renderExerciseLibrary();
  }

  function renderExercisesPage() {
    var filterControls = document.querySelectorAll("#exercise-search, #exercise-filter-muscle, #exercise-filter-status, #filter-preferred-only, #filter-show-avoid, #filter-shoulder-friendly, #filter-lower-back-friendly");
    var state = window.TrainingStorage.getAppState();

    renderExerciseFilterOptions(state.exerciseLibrary);
    renderExerciseLibrary();

    filterControls.forEach(function (control) {
      control.addEventListener("input", renderExerciseLibrary);
      control.addEventListener("change", renderExerciseLibrary);
    });
  }

  function renderHistoryPage() {
    var sessionsContainer = document.querySelector("#previous-sessions");
    var weeklySetsContainer = document.querySelector("#weekly-sets");
    var recommendationsContainer = document.querySelector("#volume-recommendations");
    var history = window.TrainingStorage ? window.TrainingStorage.getWorkoutHistory() : [];

    if (recommendationsContainer) {
      renderVolumeRecommendations(recommendationsContainer);
    }

    if (sessionsContainer && history.length > 0) {
      sessionsContainer.innerHTML = history.slice().reverse().map(renderHistorySession).join("");
    } else if (sessionsContainer) {
      sessionsContainer.innerHTML = '<p class="subtle">No completed sessions yet.</p>';
    }

    if (weeklySetsContainer) {
      var totals = getWeeklySetTotals(history);
      var muscles = Object.keys(totals);

      if (muscles.length === 0) {
        weeklySetsContainer.innerHTML = '<p class="subtle">No completed working sets yet.</p>';
        return;
      }

      weeklySetsContainer.innerHTML = muscles.map(function (muscle) {
        return (
          '<div class="volume-item">' +
            '<dt>' + escapeHtml(getMuscleLabel(muscle)) + '</dt>' +
            '<dd>' + escapeHtml(totals[muscle]) + ' sets</dd>' +
          '</div>'
        );
      }).join("");
    }
  }

  function getMinimumWeeklySets(muscle) {
    if (muscle === "legs") return 4;
    if (muscle === "rearDelts") return 4;
    return 6;
  }

  function getStateMuscleId(muscle) {
    if (muscle === "chest") return "upperChest";
    return muscle;
  }

  function renderVolumeRecommendations(container) {
    var recommendations = window.TrainingStorage.getPendingVolumeRecommendations();
    var sorted = recommendations.slice().sort(function (a, b) {
      if (a.status === b.status) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }

      return a.status === "pending" ? -1 : 1;
    });

    if (sorted.length === 0) {
      container.innerHTML = '<p class="subtle">No volume recommendations yet.</p>';
      return;
    }

    container.innerHTML = sorted.map(renderRecommendationCard).join("");
    container.querySelectorAll("[data-apply-rec]").forEach(function (button) {
      button.addEventListener("click", function () {
        applyVolumeRecommendation(button.dataset.applyRec);
      });
    });
    container.querySelectorAll("[data-ignore-rec]").forEach(function (button) {
      button.addEventListener("click", function () {
        ignoreVolumeRecommendation(button.dataset.ignoreRec);
      });
    });
  }

  function renderRecommendationCard(recommendation) {
    var pending = recommendation.status === "pending";
    var rows = Object.keys(recommendation.muscles || {}).map(function (muscle) {
      var item = recommendation.muscles[muscle];
      var changeLabel = item.suggestedChange > 0 ? "+" + item.suggestedChange : String(item.suggestedChange);

      return (
        '<article class="recommendation-muscle">' +
          '<div class="card-header">' +
            '<div>' +
              '<h3>' + escapeHtml(getMuscleLabel(muscle)) + '</h3>' +
              '<p class="subtle">' + escapeHtml(item.reason) + '</p>' +
            '</div>' +
            '<span class="signal-label signal-' + escapeHtml(item.signal) + '">' + escapeHtml(item.signal) + '</span>' +
          '</div>' +
          '<dl class="recommendation-sets">' +
            '<div><dt>Current</dt><dd>' + escapeHtml(item.currentWeeklySets) + '</dd></div>' +
            '<div><dt>Change</dt><dd>' + escapeHtml(changeLabel) + '</dd></div>' +
            '<div><dt>Suggested</dt><dd>' + escapeHtml(item.suggestedWeeklySets) + '</dd></div>' +
          '</dl>' +
        '</article>'
      );
    }).join("");

    return (
      '<article class="recommendation-card">' +
        '<div class="card-header">' +
          '<div>' +
            '<h3>Session recommendation</h3>' +
            '<p class="subtle">' + escapeHtml(new Date(recommendation.createdAt).toLocaleString()) + '</p>' +
          '</div>' +
          '<span class="badge">' + escapeHtml(recommendation.status) + '</span>' +
        '</div>' +
        '<div class="stack">' + rows + '</div>' +
        (pending ? '<div class="button-row"><button class="button button-primary" type="button" data-apply-rec="' + escapeHtml(recommendation.id) + '">Apply Recommendation</button><button class="button" type="button" data-ignore-rec="' + escapeHtml(recommendation.id) + '">Ignore Recommendation</button></div>' : '') +
      '</article>'
    );
  }

  function applyVolumeRecommendation(id) {
    var state = window.TrainingStorage.getAppState();
    var recommendation = window.TrainingStorage.getPendingVolumeRecommendations().find(function (item) {
      return item.id === id;
    });

    if (!recommendation || recommendation.status !== "pending") {
      return;
    }

    Object.keys(recommendation.muscles || {}).forEach(function (muscle) {
      var stateMuscleId = getStateMuscleId(muscle);
      var target = state.musclePriorities.find(function (item) {
        return item.id === stateMuscleId;
      });
      var rec = recommendation.muscles[muscle];
      var minimum = getMinimumWeeklySets(stateMuscleId);

      if (!target || muscle === "shoulderPrep") {
        return;
      }

      target.startingSets = Math.min(
        Number(target.maxSets),
        Math.max(minimum, Number(target.startingSets) + Number(rec.suggestedChange))
      );
    });

    window.TrainingStorage.saveAppState(state);
    window.TrainingStorage.updateVolumeRecommendationStatus(id, "applied");
    renderHistoryPage();
  }

  function ignoreVolumeRecommendation(id) {
    window.TrainingStorage.updateVolumeRecommendationStatus(id, "ignored");
    renderHistoryPage();
  }

  function countLoggedSets(exercise) {
    if (!Array.isArray(exercise.loggedSets)) {
      return Number(exercise.plannedSets) || 0;
    }

    return exercise.loggedSets.filter(function (set) {
      return set && !set.skipped && (set.completed || set.saved || set.weightKg || set.weight || set.reps || set.actualRir);
    }).length;
  }

  function getHistoryExerciseLabel(exercise) {
    if (!exercise.substitution) {
      return exercise.name;
    }

    return exercise.name + " (planned: " + exercise.substitution.originalExerciseName + ")";
  }

  function renderLoggedExerciseSummary(exercise) {
    var loggedCount = countLoggedSets(exercise);
    var setCount = loggedCount || 0;
    var summary = escapeHtml(exercise.name) + ": " + escapeHtml(setCount) + " sets";

    if (exercise.substitution) {
      summary += '<br><span class="subtle">Originally planned: ' + escapeHtml(exercise.substitution.originalExerciseName) + '</span>';

      if (exercise.substitution.reason) {
        summary += '<br><span class="subtle">Reason: ' + escapeHtml(exercise.substitution.reason) + '</span>';
      }
    }

    return summary;
  }

  function getWeeklySetTotals(history) {
    return history.reduce(function (totals, session) {
      (session.exercises || []).forEach(function (exercise) {
        var muscle = exercise.primaryMuscle;
        var loggedCount = countLoggedSets(exercise);
        var setCount = loggedCount || 0;

        totals[muscle] = (totals[muscle] || 0) + setCount;
      });

      return totals;
    }, {});
  }

  function renderHistorySession(session) {
    var feedbackSummary = session.feedback && window.TrainingFeedback
      ? window.TrainingFeedback.summarizeSessionFeedback(session.feedback)
      : null;
    var exerciseNames = (session.exercises || []).map(function (exercise) {
      return getHistoryExerciseLabel(exercise);
    }).join(", ");
    var loggedSummary = (session.exercises || []).map(function (exercise) {
      return renderLoggedExerciseSummary(exercise);
    }).join("<br>");
    var signals = feedbackSummary ? Object.keys(feedbackSummary.signals).map(function (muscle) {
      return '<span class="tag">' + escapeHtml(getMuscleLabel(muscle)) + ': ' + escapeHtml(feedbackSummary.signals[muscle]) + '</span>';
    }).join("") : '<span class="tag">No feedback</span>';

    return (
      '<article class="card history-session-card">' +
        '<div class="card-header">' +
          '<div>' +
            '<h3>' + escapeHtml(session.title) + '</h3>' +
            '<p class="subtle">' + escapeHtml(new Date(session.completedAt || session.date).toLocaleString()) + '</p>' +
          '</div>' +
          '<span class="badge">Week ' + escapeHtml(session.mesocycleWeek) + '</span>' +
        '</div>' +
        '<dl class="history-details">' +
          '<div><dt>Target RIR</dt><dd>' + escapeHtml(session.targetRir) + '</dd></div>' +
          '<div><dt>Muscles</dt><dd>' + escapeHtml((session.muscles || []).map(getMuscleLabel).join(", ")) + '</dd></div>' +
          '<div><dt>Exercises</dt><dd>' + escapeHtml(exerciseNames) + '</dd></div>' +
          '<div><dt>Logged sets</dt><dd>' + loggedSummary + '</dd></div>' +
          '<div><dt>Feedback</dt><dd>' + renderFeedbackSummary(feedbackSummary) + '</dd></div>' +
        '</dl>' +
        '<div class="tag-row">' + signals + '</div>' +
      '</article>'
    );
  }

  function renderFeedbackSummary(summary) {
    if (!summary) {
      return "No feedback submitted.";
    }

    return "Fatigue: " + escapeHtml(summary.fatigue) +
      "<br>Sleep/recovery: " + escapeHtml(summary.sleepRecovery) +
      "<br>Signals: add " + escapeHtml(summary.signalCounts.add) +
      ", hold " + escapeHtml(summary.signalCounts.hold) +
      ", reduce " + escapeHtml(summary.signalCounts.reduce);
  }

  function initPage() {
    var page = document.body.dataset.page;

    renderNavigation();

    if (page === "home") renderHomePage();
    if (page === "setup") renderSetupPage();
    if (page === "exercises") renderExercisesPage();
    if (page === "history") renderHistoryPage();
    if (page === "workout" && window.TrainingWorkout) window.TrainingWorkout.initWorkoutPage();
  }

  window.TrainingApp = {
    filterExercises: filterExercises,
    getUniqueMuscles: getUniqueMuscles,
    renderExercisesPage: renderExercisesPage,
    renderExerciseLibrary: renderExerciseLibrary,
    renderSetupPage: renderSetupPage,
    setExerciseAsPreferred: setExerciseAsPreferred,
    applyGoalPreset: applyGoalPreset,
    renderSessionTemplates: renderSessionTemplates,
    renderHistoryPage: renderHistoryPage,
    applyVolumeRecommendation: applyVolumeRecommendation,
    ignoreVolumeRecommendation: ignoreVolumeRecommendation
  };

  document.addEventListener("DOMContentLoaded", initPage);
})();
