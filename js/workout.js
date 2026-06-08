(function () {
  var workoutClickBound = false;
  var lastWorkoutActionAt = 0;
  var lastWorkoutActionKey = "";

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getMuscleLabel(muscle) {
    if (window.TrainingLogic && window.TrainingLogic.getMuscleLabel) {
      return window.TrainingLogic.getMuscleLabel(muscle);
    }

    return muscle;
  }

  function getClosest(target, selector) {
    var element = target && target.closest ? target : (target && target.parentElement ? target.parentElement : null);

    return element && element.closest ? element.closest(selector) : null;
  }

  function getActiveSession() {
    var session = window.TrainingStorage.getActiveSession();

    if (!session && window.TrainingLogic) {
      session = window.TrainingLogic.generateTodaySession(window.TrainingStorage.getAppState());
      window.TrainingStorage.saveActiveSession(session);
    }

    return session;
  }

  function getSetValue(set, field) {
    if (!set) {
      return "";
    }

    if (field === "weightKg") {
      return set.weightKg !== undefined ? set.weightKg : (set.weight !== undefined ? set.weight : "");
    }

    return set[field] !== undefined ? set[field] : "";
  }

  function hasLoggedValue(set) {
    return Boolean(
      set &&
      (getSetValue(set, "weightKg") || getSetValue(set, "reps") || getSetValue(set, "actualRir"))
    );
  }

  function isSetCompleted(set) {
    return Boolean(set && !set.skipped && (set.completed || set.saved));
  }

  function isExerciseLocked(exercise) {
    return Boolean(exercise && (exercise.exerciseCompleted || exercise.exerciseSkipped));
  }

  function isExerciseSkipped(exercise) {
    return Boolean(exercise && exercise.exerciseSkipped);
  }

  function ensureLoggedSets(exercise) {
    if (!Array.isArray(exercise.loggedSets)) {
      exercise.loggedSets = [];
    }

    for (var index = exercise.loggedSets.length; index < exercise.plannedSets; index += 1) {
      exercise.loggedSets.push({
        weightKg: "",
        reps: "",
        actualRir: "",
        completed: false
      });
    }

    exercise.loggedSets = exercise.loggedSets.map(function (set) {
      return {
        weightKg: getSetValue(set, "weightKg"),
        reps: getSetValue(set, "reps"),
        actualRir: getSetValue(set, "actualRir"),
        completed: Boolean(!set.skipped && (set.completed || set.saved)),
        skipped: Boolean(set.skipped),
        skippedAt: set.skippedAt || null,
        updatedAt: set.updatedAt || set.savedAt || null
      };
    });
  }

  function getCompletedSetCount(exercise) {
    if (isExerciseSkipped(exercise)) {
      return 0;
    }

    ensureLoggedSets(exercise);

    return exercise.loggedSets.filter(isSetCompleted).length;
  }

  function getActiveSetIndex(exercise) {
    ensureLoggedSets(exercise);

    return exercise.loggedSets.findIndex(function (set) {
      return !isSetCompleted(set) && !set.skipped;
    });
  }

  function getProgressMarkup(exercise) {
    var completed = getCompletedSetCount(exercise);
    var total = exercise.loggedSets.length;
    var skipped = exercise.loggedSets.filter(function (set) {
      return set.skipped;
    }).length;
    var percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    var text = completed + " / " + total + " sets logged";

    if (skipped > 0) {
      text += " - " + skipped + " skipped";
    }

    return (
      '<div class="set-progress" data-progress-for="' + escapeHtml(exercise.exerciseId) + '">' +
        '<div class="set-progress-text">' + text + '</div>' +
        '<div class="set-progress-bar" aria-hidden="true"><span style="width: ' + percent + '%"></span></div>' +
      '</div>'
    );
  }

  function formatFriendliness(value) {
    if (value === true) return "yes";
    if (value === false) return "no";
    return value;
  }

  function getLibraryExerciseById(state, exerciseId) {
    return (state.exerciseLibrary || []).find(function (exercise) {
      return exercise.id === exerciseId;
    });
  }

  function normalizeMuscle(muscle) {
    if (window.TrainingLogic && window.TrainingLogic.normalizeMuscle) {
      return window.TrainingLogic.normalizeMuscle(muscle);
    }

    return muscle;
  }

  function getExerciseRiskReasons(exercise, state) {
    var settings = state.injurySettings || {};
    var reasons = [];

    if (exercise.status === "avoid") {
      reasons.push("marked avoid");
    }

    if (settings.shoulderFriendlyMode && exercise.shoulderFriendly === false) {
      reasons.push("not shoulder-friendly");
    }

    if (settings.shoulderFriendlyMode && exercise.shoulderFriendly === "caution") {
      reasons.push("shoulder caution");
    }

    if (settings.lowerBackProtection && exercise.lowerBackFriendly === false) {
      reasons.push("not lower-back-friendly");
    }

    if (settings.lowerBackProtection && exercise.lowerBackFriendly === "caution") {
      reasons.push("lower-back caution");
    }

    if (settings.avoidRiskyOverheadPressing && exercise.id === "high-incline-barbell-press") {
      reasons.push("risky overhead/incline pressing");
    }

    if (settings.shoulderFriendlyMode && exercise.id === "upright-row") {
      reasons.push("upright row shoulder risk");
    }

    if (settings.lowerBackProtection && (exercise.id === "barbell-row" || exercise.id === "romanian-deadlift")) {
      reasons.push("lower-back loading risk");
    }

    return reasons;
  }

  function statusRank(status) {
    if (status === "preferred") return 1;
    if (status === "neutral") return 2;
    if (status === "conditional") return 3;
    if (status === "prep") return 4;
    if (status === "avoid") return 5;
    return 6;
  }

  function getReplacementOptions(sessionExercise) {
    var state = window.TrainingStorage.getAppState();
    var muscle = normalizeMuscle(sessionExercise.primaryMuscle);
    var options = (state.exerciseLibrary || []).filter(function (exercise) {
      return normalizeMuscle(exercise.primaryMuscle) === muscle && exercise.status !== "prep";
    }).sort(function (a, b) {
      var aRisk = getExerciseRiskReasons(a, state).length;
      var bRisk = getExerciseRiskReasons(b, state).length;

      return aRisk - bRisk || statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name);
    });

    return options.filter(function (exercise) {
      return exercise.id !== sessionExercise.exerciseId;
    });
  }

  function hasAnyLoggedSetData(exercise) {
    ensureLoggedSets(exercise);

    return exercise.loggedSets.some(function (set) {
      return hasLoggedValue(set) || isSetCompleted(set) || set.skipped;
    });
  }

  function getSubstitutionMarkup(exercise) {
    if (!exercise.substitution) {
      return "";
    }

    return (
      '<p class="substitution-note">' +
        '<strong>Changed exercise</strong><br>' +
        'Originally planned: ' + escapeHtml(exercise.substitution.originalExerciseName) + '<br>' +
        'Reason: ' + escapeHtml(exercise.substitution.reason || "not recorded") +
      '</p>'
    );
  }

  function renderPrep(session) {
    var container = document.querySelector("#workout-prep");

    if (!container) {
      return;
    }

    if (!session.prep || session.prep.length === 0) {
      container.innerHTML = '<p class="subtle">No prep work planned.</p>';
      return;
    }

    container.innerHTML = session.prep.map(function (item) {
      return (
        '<article class="prep-card">' +
          '<div class="card-header">' +
            '<div>' +
              '<h3>' + escapeHtml(item.name) + '</h3>' +
              '<p class="subtle">' + escapeHtml(getMuscleLabel(item.primaryMuscle)) + '</p>' +
            '</div>' +
            '<span class="badge">' + escapeHtml(item.plannedSets) + ' prep sets</span>' +
          '</div>' +
          '<p>' + escapeHtml(item.repRange) + '</p>' +
          '<p class="subtle">' + escapeHtml(item.notes) + '</p>' +
        '</article>'
      );
    }).join("");
  }

  function getSetSummaryText(set) {
    var weight = getSetValue(set, "weightKg") || "0";
    var reps = getSetValue(set, "reps") || "0";
    var rir = getSetValue(set, "actualRir");

    return escapeHtml(weight) + "kg x " + escapeHtml(reps) + (rir ? " @ " + escapeHtml(rir) + " RIR" : "");
  }

  function createSetInputs(exerciseIndex, exercise, isCurrentExercise) {
    ensureLoggedSets(exercise);
    var activeSetIndex = getActiveSetIndex(exercise);

    return exercise.loggedSets.map(function (set, setIndex) {
      var locked = isExerciseLocked(exercise);
      var savedClass = isSetCompleted(set) ? " saved" : "";
      var skippedClass = set.skipped ? " skipped" : "";
      var activeClass = !locked && setIndex === activeSetIndex ? " active-set" : "";
      var savedLabel = set.skipped ? "Skipped" : (isSetCompleted(set) ? "Logged" : "Not logged");
      var disabledAttribute = locked ? " disabled" : "";
      var skipButton = set.skipped
        ? '<button class="button set-secondary-button skip-set-button" type="button" data-unskip-set="' + exerciseIndex + ':' + setIndex + '"' + disabledAttribute + '>Undo Skip</button>'
        : '<button class="button set-secondary-button skip-set-button" type="button" data-skip-set="' + exerciseIndex + ':' + setIndex + '"' + disabledAttribute + '>Skip</button>';
      var removeButton = '<button class="button set-secondary-button remove-set-button" type="button" data-remove-set="' + exerciseIndex + ':' + setIndex + '"' + disabledAttribute + '>Remove</button>';
      var isActiveSet = !locked && isCurrentExercise && setIndex === activeSetIndex;

      if (isSetCompleted(set)) {
        return (
          '<div class="workout-set-summary logged-summary" data-exercise-index="' + exerciseIndex + '" data-set-index="' + setIndex + '">' +
            '<span class="set-state-mark">Done</span>' +
            '<p><strong>Set ' + (setIndex + 1) + '</strong> - ' + getSetSummaryText(set) + '</p>' +
            '<button class="set-text-button" type="button" data-remove-set="' + exerciseIndex + ':' + setIndex + '"' + disabledAttribute + '>Remove</button>' +
          '</div>'
        );
      }

      if (set.skipped) {
        return (
          '<div class="workout-set-summary skipped-summary" data-exercise-index="' + exerciseIndex + '" data-set-index="' + setIndex + '">' +
            '<span class="set-state-mark">Skip</span>' +
            '<p><strong>Set ' + (setIndex + 1) + '</strong> - skipped</p>' +
            '<button class="set-text-button" type="button" data-unskip-set="' + exerciseIndex + ':' + setIndex + '"' + disabledAttribute + '>Undo</button>' +
          '</div>'
        );
      }

      if (!isActiveSet) {
        return (
          '<div class="workout-set-summary waiting-summary" data-exercise-index="' + exerciseIndex + '" data-set-index="' + setIndex + '">' +
            '<span class="set-state-mark"></span>' +
            '<p><strong>Set ' + (setIndex + 1) + '</strong> - waiting</p>' +
            (isCurrentExercise && !locked ? '<button class="set-text-button" type="button" data-remove-set="' + exerciseIndex + ':' + setIndex + '">Remove</button>' : '') +
          '</div>'
        );
      }

      return (
        '<div class="workout-set-row' + savedClass + skippedClass + activeClass + '" data-exercise-index="' + exerciseIndex + '" data-set-index="' + setIndex + '">' +
          '<div class="set-row-header"><strong>Set ' + (setIndex + 1) + ' of ' + exercise.loggedSets.length + '</strong><span class="saved-label">' + savedLabel + '</span></div>' +
          '<label>Weight<input type="number" inputmode="decimal" data-field="weightKg" value="' + escapeHtml(getSetValue(set, "weightKg")) + '" placeholder="0"' + disabledAttribute + '></label>' +
          '<label>Reps<input type="number" inputmode="numeric" data-field="reps" value="' + escapeHtml(getSetValue(set, "reps")) + '" placeholder="0"' + disabledAttribute + '></label>' +
          '<label>Actual RIR<input type="number" inputmode="numeric" data-field="actualRir" value="' + escapeHtml(getSetValue(set, "actualRir")) + '" placeholder="' + escapeHtml(exercise.targetRir || "") + '"' + disabledAttribute + '></label>' +
          '<div class="set-button-row">' +
            '<button class="button button-primary save-set-button" type="button" data-save-set="' + exerciseIndex + ':' + setIndex + '"' + disabledAttribute + '>Log Set</button>' +
            '<div class="set-secondary-actions">' + skipButton + removeButton + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  function getExerciseActionsMarkup(exerciseIndex, exercise, isCurrentExercise) {
    if (isExerciseSkipped(exercise)) {
      return (
        '<div class="exercise-actions completed skipped-exercise-actions" data-exercise-actions="' + exerciseIndex + '">' +
          '<p class="exercise-complete-label">Exercise skipped: ' + escapeHtml(exercise.exerciseSkipReason || "No reason recorded") + '</p>' +
          '<button class="button" type="button" data-unskip-exercise="' + exerciseIndex + '">Undo Skip / Edit</button>' +
        '</div>'
      );
    }

    if (isExerciseLocked(exercise)) {
      return (
        '<div class="exercise-actions completed" data-exercise-actions="' + exerciseIndex + '">' +
          '<p class="exercise-complete-label">Exercise complete</p>' +
          '<button class="button" type="button" data-unlock-exercise="' + exerciseIndex + '">Edit / Unlock</button>' +
        '</div>'
      );
    }

    if (!isCurrentExercise) {
      return "";
    }

    if (getActiveSetIndex(exercise) !== -1) {
      return (
        '<div class="exercise-actions" data-exercise-actions="' + exerciseIndex + '">' +
          '<div class="exercise-secondary-actions">' +
            '<button class="button exercise-secondary-button add-set-button" type="button" data-add-set="' + exerciseIndex + '">+ Add Set</button>' +
            '<button class="button exercise-secondary-button" type="button" data-skip-exercise="' + exerciseIndex + '">Skip Exercise</button>' +
          '</div>' +
        '</div>'
      );
    }

    return (
      '<div class="exercise-actions" data-exercise-actions="' + exerciseIndex + '">' +
        '<button class="button button-primary complete-exercise-button" type="button" data-complete-exercise="' + exerciseIndex + '">Complete Exercise</button>' +
        '<div class="exercise-secondary-actions">' +
          '<button class="button exercise-secondary-button add-set-button" type="button" data-add-set="' + exerciseIndex + '">+ Add Set</button>' +
          '<button class="button exercise-secondary-button" type="button" data-skip-exercise="' + exerciseIndex + '">Skip Exercise</button>' +
        '</div>' +
      '</div>'
    );
  }

  function getCurrentExerciseIndex(session) {
    return (session.exercises || []).findIndex(function (exercise) {
      return !isExerciseLocked(exercise);
    });
  }

  function areAllExercisesResolved(session) {
    return (session.exercises || []).length > 0 && session.exercises.every(function (exercise) {
      return isExerciseLocked(exercise);
    });
  }

  function getNextExercisePreview(session, currentExerciseIndex) {
    var nextExercise = (session.exercises || []).slice(currentExerciseIndex + 1).find(function (exercise) {
      return !isExerciseLocked(exercise);
    });

    if (!nextExercise) {
      return "";
    }

    return (
      '<section class="next-exercise-preview">' +
        '<p class="current-exercise-label">Next</p>' +
        '<div><strong>' + escapeHtml(nextExercise.name) + '</strong><span>' + escapeHtml(nextExercise.plannedSets) + ' sets</span></div>' +
      '</section>'
    );
  }

  function renderQueuedExerciseCard(exercise, index) {
    return (
      '<article class="card workout-exercise-card queued-exercise-card" data-exercise-card="' + index + '">' +
        '<div class="queued-exercise-row">' +
          '<div>' +
            '<p class="current-exercise-label">Upcoming</p>' +
            '<h2>' + escapeHtml(exercise.name) + '</h2>' +
            '<p class="subtle">' + escapeHtml(getMuscleLabel(exercise.primaryMuscle)) + ' - ' + escapeHtml(exercise.plannedSets) + ' sets</p>' +
          '</div>' +
          '<span class="badge">waiting</span>' +
        '</div>' +
      '</article>'
    );
  }

  function renderWorkoutLogger() {
    var session = getActiveSession();
    var container = document.querySelector("#workout-exercises");
    var title = document.querySelector("#workout-session-title");
    var week = document.querySelector("#workout-session-week");
    var meta = document.querySelector("#workout-session-meta");
    var finishButton = document.querySelector("#finish-workout-button");

    if (!session || !container) {
      return;
    }

    if (title) title.textContent = session.title;
    if (week) week.textContent = "Week " + session.mesocycleWeek;
    if (meta) {
      meta.textContent = session.date + " - " + session.targetRir + " - " + session.muscles.map(getMuscleLabel).join(", ");
    }

    if (finishButton && finishButton.classList) {
      if (areAllExercisesResolved(session)) {
        finishButton.classList.add("button-primary");
      } else {
        finishButton.classList.remove("button-primary");
      }
    }

    renderPrep(session);
    var currentExerciseIndex = getCurrentExerciseIndex(session);

    container.innerHTML = session.exercises.map(function (exercise, index) {
      var lockedClass = isExerciseLocked(exercise) ? " completed-exercise" : "";
      var skippedClass = isExerciseSkipped(exercise) ? " skipped-exercise" : "";
      var currentClass = index === currentExerciseIndex ? " current-exercise-card" : "";
      var currentLabel = index === currentExerciseIndex ? '<p class="current-exercise-label">Current Exercise</p>' : "";
      var isCurrentExercise = index === currentExerciseIndex;

      if (!isCurrentExercise && !isExerciseLocked(exercise)) {
        return renderQueuedExerciseCard(exercise, index);
      }

      return (
        '<article class="card workout-exercise-card' + lockedClass + skippedClass + currentClass + '" data-exercise-card="' + index + '">' +
          '<div class="card-header workout-card-header">' +
            '<div>' +
              currentLabel +
              '<h2>' + escapeHtml(exercise.name) + '</h2>' +
              '<p class="subtle">' + escapeHtml(getMuscleLabel(exercise.primaryMuscle)) + ' - ' + escapeHtml(exercise.repRange) + ' - ' + escapeHtml(exercise.targetRir) + '</p>' +
            '</div>' +
            '<div class="workout-header-actions">' +
              (!isExerciseLocked(exercise) ? '<button class="button change-exercise-top-button" type="button" data-change-exercise="' + index + '">Change</button>' : '') +
              '<span class="badge">' + getCompletedSetCount(exercise) + ' / ' + escapeHtml(exercise.loggedSets.length) + ' logged</span>' +
            '</div>' +
          '</div>' +
          getSubstitutionMarkup(exercise) +
          (isCurrentExercise ? '<p class="subtle">' + escapeHtml(exercise.notes) + '</p>' : '') +
          createSetInputs(index, exercise, isCurrentExercise) +
          getExerciseActionsMarkup(index, exercise, isCurrentExercise) +
          (isCurrentExercise ? getNextExercisePreview(session, currentExerciseIndex) : '') +
        '</article>'
      );
    }).join("");

    window.TrainingStorage.saveActiveSession(session);
  }

  function getSetRow(exerciseIndex, setIndex) {
    return document.querySelector('[data-exercise-index="' + exerciseIndex + '"][data-set-index="' + setIndex + '"]');
  }

  function updateSetFromRow(session, exerciseIndex, setIndex, completed) {
    var row = getSetRow(exerciseIndex, setIndex);
    var exercise = session.exercises[exerciseIndex];
    var existingSet;

    if (!row || !exercise) {
      return null;
    }

    ensureLoggedSets(exercise);
    existingSet = exercise.loggedSets[setIndex] || {};
    exercise.loggedSets[setIndex] = {
      weightKg: row.querySelector('[data-field="weightKg"]').value,
      reps: row.querySelector('[data-field="reps"]').value,
      actualRir: row.querySelector('[data-field="actualRir"]').value,
      completed: completed === true ? true : Boolean(existingSet.completed),
      skipped: completed === true ? false : Boolean(existingSet.skipped),
      skippedAt: completed === true ? null : existingSet.skippedAt || null,
      updatedAt: new Date().toISOString()
    };

    return exercise.loggedSets[setIndex];
  }

  function updateProgressDisplay(exerciseIndex) {
    var session = getActiveSession();
    var exercise = session && session.exercises ? session.exercises[exerciseIndex] : null;
    var card = document.querySelector('[data-exercise-card="' + exerciseIndex + '"]');
    var badge = card ? card.querySelector(".badge") : null;
    var progressText = card ? card.querySelector(".set-progress-text") : null;
    var progressBar = card ? card.querySelector(".set-progress-bar span") : null;
    var completed;
    var total;

    if (!exercise) {
      return;
    }

    completed = getCompletedSetCount(exercise);
    total = exercise.loggedSets.length;

    if (badge) {
      badge.textContent = completed + " / " + total + " logged";
    }

    if (progressText) {
      var skipped = exercise.loggedSets.filter(function (set) {
        return set.skipped;
      }).length;
      progressText.textContent = completed + " / " + total + " sets logged" + (skipped > 0 ? " - " + skipped + " skipped" : "");
    }

    if (progressBar) {
      progressBar.style.width = (total > 0 ? Math.round((completed / total) * 100) : 0) + "%";
    }
  }

  function updateRowSavedState(exerciseIndex, setIndex) {
    var row = getSetRow(exerciseIndex, setIndex);
    var label = row ? row.querySelector(".saved-label") : null;

    if (!row) {
      return;
    }

    if (row.classList && row.classList.add) {
      row.classList.add("saved");
      if (row.classList.remove) {
        row.classList.remove("skipped");
      }
    }

    if (label) {
      label.textContent = "Logged";
    }
  }

  function persistSetInput(exerciseIndex, setIndex) {
    var session = getActiveSession();
    var exercise = session && session.exercises ? session.exercises[exerciseIndex] : null;

    if (!session || !session.exercises || isExerciseLocked(exercise)) {
      return;
    }

    updateSetFromRow(session, exerciseIndex, setIndex, false);
    window.TrainingStorage.saveActiveSession(session);
  }

  function saveSet(exerciseIndex, setIndex, shouldAdvance) {
    var session = getActiveSession();
    var status = document.querySelector("#workout-save-status");
    var exercise = session.exercises[exerciseIndex];

    if (!exercise || isExerciseLocked(exercise)) {
      return;
    }

    updateSetFromRow(session, exerciseIndex, setIndex, true);

    window.TrainingStorage.saveActiveSession(session);
    updateRowSavedState(exerciseIndex, setIndex);
    updateProgressDisplay(exerciseIndex);

    if (status) {
      status.textContent = "Set logged.";
    }

    if (shouldAdvance !== false) {
      advanceAfterSave(exerciseIndex, setIndex);
    }
  }

  function addSet(exerciseIndex) {
    var session = getActiveSession();
    var exercise = session.exercises[exerciseIndex];

    if (!exercise || isExerciseLocked(exercise)) {
      return;
    }

    exercise.plannedSets += 1;
    ensureLoggedSets(exercise);
    exercise.loggedSets[exercise.loggedSets.length - 1].updatedAt = new Date().toISOString();
    window.TrainingStorage.saveActiveSession(session);
    renderWorkoutLogger();
    focusSet(exerciseIndex, exercise.loggedSets.length - 1);
  }

  function removeSet(exerciseIndex, setIndex) {
    var session = getActiveSession();
    var exercise = session && session.exercises ? session.exercises[exerciseIndex] : null;
    var set;

    if (!exercise || isExerciseLocked(exercise)) {
      return;
    }

    ensureLoggedSets(exercise);

    if (exercise.loggedSets.length <= 1) {
      alert("Keep at least one set, or skip the exercise.");
      return;
    }

    set = exercise.loggedSets[setIndex];

    if ((hasLoggedValue(set) || isSetCompleted(set) || set.skipped) && !confirm("Remove this set and its logged data?")) {
      return;
    }

    exercise.loggedSets.splice(setIndex, 1);
    exercise.plannedSets = Math.max(1, exercise.loggedSets.length);
    window.TrainingStorage.saveActiveSession(session);
    renderWorkoutLogger();
    focusExerciseCard(exerciseIndex);
  }

  function skipSet(exerciseIndex, setIndex) {
    var session = getActiveSession();
    var exercise = session && session.exercises ? session.exercises[exerciseIndex] : null;

    if (!exercise || isExerciseLocked(exercise)) {
      return;
    }

    ensureLoggedSets(exercise);
    exercise.loggedSets[setIndex] = Object.assign({}, exercise.loggedSets[setIndex], {
      completed: false,
      skipped: true,
      skippedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    window.TrainingStorage.saveActiveSession(session);
    renderWorkoutLogger();
    advanceAfterSave(exerciseIndex, setIndex);
  }

  function unskipSet(exerciseIndex, setIndex) {
    var session = getActiveSession();
    var exercise = session && session.exercises ? session.exercises[exerciseIndex] : null;

    if (!exercise || isExerciseLocked(exercise)) {
      return;
    }

    ensureLoggedSets(exercise);
    exercise.loggedSets[setIndex] = Object.assign({}, exercise.loggedSets[setIndex], {
      skipped: false,
      skippedAt: null,
      updatedAt: new Date().toISOString()
    });
    window.TrainingStorage.saveActiveSession(session);
    renderWorkoutLogger();
    focusSet(exerciseIndex, setIndex);
  }

  function findNextUnsavedSet(startExerciseIndex, startSetIndex) {
    var session = getActiveSession();
    var exerciseIndex;
    var setIndex;

    if (!session || !Array.isArray(session.exercises)) {
      return null;
    }

    for (exerciseIndex = startExerciseIndex; exerciseIndex < session.exercises.length; exerciseIndex += 1) {
      ensureLoggedSets(session.exercises[exerciseIndex]);
      setIndex = exerciseIndex === startExerciseIndex ? startSetIndex + 1 : 0;

      for (; setIndex < session.exercises[exerciseIndex].loggedSets.length; setIndex += 1) {
        if (!isSetCompleted(session.exercises[exerciseIndex].loggedSets[setIndex]) && !session.exercises[exerciseIndex].loggedSets[setIndex].skipped) {
          return {
            exerciseIndex: exerciseIndex,
            setIndex: setIndex
          };
        }
      }
    }

    return null;
  }

  function findNextUnsavedSetInExercise(exerciseIndex, startSetIndex) {
    var session = getActiveSession();
    var exercise = session && session.exercises ? session.exercises[exerciseIndex] : null;
    var setIndex;

    if (!exercise) {
      return null;
    }

    ensureLoggedSets(exercise);

    for (setIndex = startSetIndex + 1; setIndex < exercise.loggedSets.length; setIndex += 1) {
      if (!isSetCompleted(exercise.loggedSets[setIndex]) && !exercise.loggedSets[setIndex].skipped) {
        return {
          exerciseIndex: exerciseIndex,
          setIndex: setIndex
        };
      }
    }

    return null;
  }

  function focusSet(exerciseIndex, setIndex, alignToTop) {
    var row = getSetRow(exerciseIndex, setIndex);
    var input;

    if (!row) {
      return;
    }

    input = row.querySelector('[data-field="weightKg"]') || row.querySelector('[data-field="reps"]') || row.querySelector("input");

    if (row.scrollIntoView) {
      row.scrollIntoView({ behavior: "smooth", block: alignToTop ? "start" : "center" });
    }

    if (input && input.focus) {
      setTimeout(function () {
        input.focus({ preventScroll: true });
      }, 120);
    }
  }

  function focusExerciseCard(exerciseIndex) {
    var card = document.querySelector('[data-exercise-card="' + exerciseIndex + '"]');

    if (card && card.scrollIntoView) {
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function focusExerciseActions(exerciseIndex) {
    var actions = document.querySelector('[data-exercise-actions="' + exerciseIndex + '"]');
    var button = actions ? actions.querySelector("button") : null;

    if (actions && actions.scrollIntoView) {
      actions.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    if (button && button.focus) {
      setTimeout(function () {
        button.focus({ preventScroll: true });
      }, 120);
    }
  }

  function focusFinishButton() {
    var finishButton = document.querySelector("#finish-workout-button");

    if (!finishButton) {
      return;
    }

    if (finishButton.scrollIntoView) {
      finishButton.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    if (finishButton.focus) {
      finishButton.focus({ preventScroll: true });
    }
  }

  function advanceAfterSave(exerciseIndex, setIndex) {
    var nextSet = findNextUnsavedSetInExercise(exerciseIndex, setIndex);

    if (nextSet) {
      focusSet(nextSet.exerciseIndex, nextSet.setIndex);
      return;
    }

    focusExerciseActions(exerciseIndex);
  }

  function completeExercise(exerciseIndex) {
    var session = getActiveSession();
    var exercise = session && session.exercises ? session.exercises[exerciseIndex] : null;
    var nextExerciseIndex = exerciseIndex + 1;

    if (!exercise) {
      return;
    }

    ensureLoggedSets(exercise);
    exercise.loggedSets.forEach(function (set, setIndex) {
      updateSetFromRow(session, exerciseIndex, setIndex, false);
    });
    exercise.exerciseCompleted = true;
    exercise.exerciseCompletedAt = new Date().toISOString();
    window.TrainingStorage.saveActiveSession(session);
    renderWorkoutLogger();

    if (session.exercises[nextExerciseIndex]) {
      focusExerciseCard(nextExerciseIndex);
    } else {
      focusFinishButton();
    }
  }

  function unlockExercise(exerciseIndex) {
    var session = getActiveSession();
    var exercise = session && session.exercises ? session.exercises[exerciseIndex] : null;

    if (!exercise) {
      return;
    }

    exercise.exerciseCompleted = false;
    exercise.exerciseCompletedAt = null;
    window.TrainingStorage.saveActiveSession(session);
    renderWorkoutLogger();
    focusExerciseCard(exerciseIndex);
  }

  function closeSkipExerciseModal() {
    var modal = document.querySelector("#skip-exercise-modal");

    if (modal) {
      modal.hidden = true;
      if (modal.setAttribute) {
        modal.setAttribute("hidden", "");
      }
      if (modal.classList) {
        modal.classList.remove("modal-open");
      }
      modal.style.display = "";
      modal.dataset.exerciseIndex = "";
    }
  }

  function openSkipExerciseModal(exerciseIndex) {
    var session = getActiveSession();
    var exercise = session && session.exercises ? session.exercises[exerciseIndex] : null;
    var modal = document.querySelector("#skip-exercise-modal");
    var current = document.querySelector("#skip-exercise-current");
    var reason = document.querySelector("#skip-exercise-reason");
    var notes = document.querySelector("#skip-exercise-notes");

    if (!exercise || isExerciseLocked(exercise) || !modal) {
      return;
    }

    modal.dataset.exerciseIndex = String(exerciseIndex);
    modal.hidden = false;
    if (modal.removeAttribute) {
      modal.removeAttribute("hidden");
    }
    if (modal.classList) {
      modal.classList.add("modal-open");
    }
    modal.style.display = "grid";

    if (current) {
      current.textContent = "Skip: " + exercise.name;
    }

    if (reason) {
      reason.value = "Not feeling right";
    }

    if (notes) {
      notes.value = "";
    }
  }

  function saveSkipExercise() {
    var session = getActiveSession();
    var modal = document.querySelector("#skip-exercise-modal");
    var reason = document.querySelector("#skip-exercise-reason");
    var notes = document.querySelector("#skip-exercise-notes");
    var exerciseIndex = modal ? Number(modal.dataset.exerciseIndex) : NaN;
    var exercise = session && session.exercises ? session.exercises[exerciseIndex] : null;

    if (!exercise) {
      return;
    }

    ensureLoggedSets(exercise);
    exercise.exerciseSkipped = true;
    exercise.exerciseSkippedAt = new Date().toISOString();
    exercise.exerciseSkipReason = reason ? reason.value : "";
    exercise.exerciseSkipNotes = notes ? notes.value : "";
    exercise.exerciseCompleted = false;
    exercise.exerciseCompletedAt = null;
    exercise.loggedSets = exercise.loggedSets.map(function (set) {
      return Object.assign({}, set, {
        completed: false,
        skipped: true,
        skippedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    window.TrainingStorage.saveActiveSession(session);
    closeSkipExerciseModal();
    renderWorkoutLogger();
    focusExerciseCard(exerciseIndex);
  }

  function unskipExercise(exerciseIndex) {
    var session = getActiveSession();
    var exercise = session && session.exercises ? session.exercises[exerciseIndex] : null;

    if (!exercise) {
      return;
    }

    exercise.exerciseSkipped = false;
    exercise.exerciseSkippedAt = null;
    exercise.exerciseSkipReason = "";
    exercise.exerciseSkipNotes = "";
    ensureLoggedSets(exercise);
    exercise.loggedSets = exercise.loggedSets.map(function (set) {
      return Object.assign({}, set, {
        skipped: false,
        skippedAt: null,
        updatedAt: new Date().toISOString()
      });
    });
    window.TrainingStorage.saveActiveSession(session);
    renderWorkoutLogger();
    focusExerciseCard(exerciseIndex);
  }

  function closeChangeExerciseModal() {
    var modal = document.querySelector("#change-exercise-modal");

    if (modal) {
      modal.hidden = true;
      if (modal.setAttribute) {
        modal.setAttribute("hidden", "");
      }
      if (modal.classList) {
        modal.classList.remove("modal-open");
      }
      modal.style.display = "";
      modal.dataset.exerciseIndex = "";
    }
  }

  function renderReplacementDetails(exercise) {
    var details = document.querySelector("#change-exercise-details");
    var state = window.TrainingStorage.getAppState();
    var riskReasons = exercise ? getExerciseRiskReasons(exercise, state) : [];

    if (!details) {
      return;
    }

    if (!exercise) {
      details.textContent = "No same-muscle replacements are currently available.";
      return;
    }

    details.textContent = exercise.equipment + " - " + exercise.repRange + " - status: " + exercise.status +
      " - shoulder: " + formatFriendliness(exercise.shoulderFriendly) +
      " - lower back: " + formatFriendliness(exercise.lowerBackFriendly) +
      (riskReasons.length ? " - warning: " + riskReasons.join(", ") : "");
  }

  function updateReplacementDetails() {
    var modal = document.querySelector("#change-exercise-modal");
    var select = document.querySelector("#change-exercise-select");
    var session = getActiveSession();
    var exerciseIndex = modal ? Number(modal.dataset.exerciseIndex) : NaN;
    var currentExercise = session && session.exercises ? session.exercises[exerciseIndex] : null;
    var selected;

    if (!select || !currentExercise) {
      return;
    }

    selected = getReplacementOptions(currentExercise).find(function (exercise) {
      return exercise.id === select.value;
    });
    renderReplacementDetails(selected);
  }

  function openChangeExerciseModal(exerciseIndex) {
    var session = getActiveSession();
    var exercise = session && session.exercises ? session.exercises[exerciseIndex] : null;
    var modal = document.querySelector("#change-exercise-modal");
    var current = document.querySelector("#change-exercise-current");
    var select = document.querySelector("#change-exercise-select");
    var reason = document.querySelector("#change-exercise-reason");
    var notes = document.querySelector("#change-exercise-notes");
    var options;

    if (!exercise || isExerciseLocked(exercise) || !modal || !select) {
      return;
    }

    var status = document.querySelector("#workout-save-status");
    if (status) {
      status.textContent = "Change tapped.";
    }

    options = getReplacementOptions(exercise);
    modal.dataset.exerciseIndex = String(exerciseIndex);
    modal.hidden = false;
    if (modal.removeAttribute) {
      modal.removeAttribute("hidden");
    }
    if (modal.classList) {
      modal.classList.add("modal-open");
    }
    modal.style.display = "grid";

    if (current) {
      current.textContent = "Current: " + exercise.name + " - " + getMuscleLabel(exercise.primaryMuscle);
    }

    select.innerHTML = options.length
      ? options.map(function (option) {
        var riskReasons = getExerciseRiskReasons(option, window.TrainingStorage.getAppState());
        var riskLabel = riskReasons.length ? " - warning" : "";

        return '<option value="' + escapeHtml(option.id) + '">' + escapeHtml(option.name) + ' - ' + escapeHtml(option.status) + riskLabel + '</option>';
      }).join("")
      : '<option value="">No replacement available</option>';
    select.disabled = options.length === 0;

    if (reason) {
      reason.value = "equipment unavailable";
    }

    if (notes) {
      notes.value = "";
    }

    renderReplacementDetails(options[0]);
    select.focus();
  }

  function saveExerciseChange() {
    var session = getActiveSession();
    var modal = document.querySelector("#change-exercise-modal");
    var select = document.querySelector("#change-exercise-select");
    var reason = document.querySelector("#change-exercise-reason");
    var notes = document.querySelector("#change-exercise-notes");
    var status = document.querySelector("#workout-save-status");
    var exerciseIndex = modal ? Number(modal.dataset.exerciseIndex) : NaN;
    var exercise = session && session.exercises ? session.exercises[exerciseIndex] : null;
    var state = window.TrainingStorage.getAppState();
    var replacement = select ? getLibraryExerciseById(state, select.value) : null;
    var keepLoggedSets = false;
    var riskReasons;
    var originalExerciseId;
    var originalExerciseName;

    if (!exercise || !replacement || isExerciseLocked(exercise)) {
      return;
    }

    riskReasons = getExerciseRiskReasons(replacement, state);

    if (riskReasons.length && !confirm("This exercise is flagged for the current injury settings: " + riskReasons.join(", ") + ". Use it anyway?")) {
      return;
    }

    if (hasAnyLoggedSetData(exercise)) {
      keepLoggedSets = confirm("This exercise already has logged sets. Press OK to keep them for the new exercise. Press Cancel to clear them.");

      if (!keepLoggedSets) {
        exercise.loggedSets = [];
      }
    }

    originalExerciseId = exercise.substitution ? exercise.substitution.originalExerciseId : exercise.exerciseId;
    originalExerciseName = exercise.substitution ? exercise.substitution.originalExerciseName : exercise.name;

    exercise.exerciseId = replacement.id;
    exercise.name = replacement.name;
    exercise.repRange = replacement.repRange;
    exercise.status = replacement.status;
    exercise.notes = replacement.notes;
    exercise.exerciseCompleted = false;
    exercise.exerciseCompletedAt = null;
    exercise.substitution = {
      originalExerciseId: originalExerciseId,
      originalExerciseName: originalExerciseName,
      newExerciseId: replacement.id,
      newExerciseName: replacement.name,
      reason: reason ? reason.value : "",
      notes: notes ? notes.value : "",
      swappedAt: new Date().toISOString()
    };

    ensureLoggedSets(exercise);
    window.TrainingStorage.saveActiveSession(session);
    closeChangeExerciseModal();
    renderWorkoutLogger();
    focusExerciseCard(exerciseIndex);

    if (status) {
      status.textContent = "Exercise changed to " + replacement.name + ".";
    }
  }

  function optionMarkup(options, selected) {
    return options.map(function (option) {
      var selectedAttribute = option === selected ? " selected" : "";

      return '<option value="' + escapeHtml(option) + '"' + selectedAttribute + ">" + escapeHtml(option) + "</option>";
    }).join("");
  }

  function renderFeedbackForm() {
    var session = getActiveSession();
    var status = document.querySelector("#workout-save-status");
    var feedbackSection = document.querySelector("#post-workout-feedback");
    var musclesContainer = document.querySelector("#feedback-muscles");
    var overallContainer = document.querySelector("#feedback-overall");
    var submitButton = document.querySelector("#submit-feedback-button");
    var feedback = window.TrainingFeedback.buildDefaultFeedback(session);

    if (!feedbackSection || !musclesContainer || !overallContainer) {
      return;
    }

    session.feedback = session.feedback || feedback;
    window.TrainingStorage.saveActiveSession(session);

    musclesContainer.innerHTML = session.muscles.map(function (muscle) {
      var item = session.feedback.muscles[muscle] || feedback.muscles[muscle];

      return (
        '<article class="feedback-card" data-feedback-muscle="' + escapeHtml(muscle) + '">' +
          '<h3>' + escapeHtml(getMuscleLabel(muscle)) + '</h3>' +
          '<div class="form-grid">' +
            '<label>Pump<select data-feedback-field="pump">' + optionMarkup(["poor", "okay", "good", "excellent"], item.pump) + '</select></label>' +
            '<label>Soreness<select data-feedback-field="soreness">' + optionMarkup(["none", "mild", "moderate", "severe"], item.soreness) + '</select></label>' +
            '<label>Performance<select data-feedback-field="performance">' + optionMarkup(["down", "same", "up"], item.performance) + '</select></label>' +
            '<label>Joint discomfort<select data-feedback-field="jointDiscomfort">' + optionMarkup(["none", "mild", "bad"], item.jointDiscomfort) + '</select></label>' +
          '</div>' +
          '<label>Notes<textarea data-feedback-field="notes" rows="3">' + escapeHtml(item.notes || "") + '</textarea></label>' +
        '</article>'
      );
    }).join("");

    overallContainer.innerHTML = (
      '<article class="feedback-card">' +
        '<h3>Overall</h3>' +
        '<div class="form-grid">' +
          '<label>Overall fatigue<select id="feedback-fatigue">' + optionMarkup(["low", "moderate", "high"], session.feedback.overall.fatigue) + '</select></label>' +
          '<label>Sleep/recovery<select id="feedback-sleep-recovery">' + optionMarkup(["poor", "okay", "good"], session.feedback.overall.sleepRecovery) + '</select></label>' +
        '</div>' +
        '<label>Session notes<textarea id="feedback-session-notes" rows="3">' + escapeHtml(session.feedback.overall.notes || "") + '</textarea></label>' +
      '</article>'
    );

    feedbackSection.hidden = false;

    if (status) {
      status.textContent = "Add feedback, then submit to complete the workout.";
    }

    if (submitButton) {
      submitButton.onclick = submitFeedback;
    }
  }

  function collectFeedback() {
    var session = getActiveSession();
    var feedback = window.TrainingFeedback.buildDefaultFeedback(session);
    var muscleCards = document.querySelectorAll("[data-feedback-muscle]");
    var fatigue = document.querySelector("#feedback-fatigue");
    var sleepRecovery = document.querySelector("#feedback-sleep-recovery");
    var notes = document.querySelector("#feedback-session-notes");

    muscleCards.forEach(function (card) {
      var muscle = card.dataset.feedbackMuscle;

      feedback.muscles[muscle] = {
        pump: card.querySelector('[data-feedback-field="pump"]').value,
        soreness: card.querySelector('[data-feedback-field="soreness"]').value,
        performance: card.querySelector('[data-feedback-field="performance"]').value,
        jointDiscomfort: card.querySelector('[data-feedback-field="jointDiscomfort"]').value,
        notes: card.querySelector('[data-feedback-field="notes"]').value
      };
    });

    feedback.overall = {
      fatigue: fatigue ? fatigue.value : "moderate",
      sleepRecovery: sleepRecovery ? sleepRecovery.value : "okay",
      notes: notes ? notes.value : ""
    };

    feedback.volumeSignals = window.TrainingFeedback.calculateVolumeSignals(feedback);

    return feedback;
  }

  function submitFeedback() {
    var session = getActiveSession();
    var status = document.querySelector("#feedback-save-status");

    session.status = "completed";
    session.completedAt = new Date().toISOString();
    session.feedback = collectFeedback();

    window.TrainingStorage.addCompletedWorkout(session);
    window.TrainingStorage.addVolumeRecommendation(
      window.TrainingFeedback.generateVolumeRecommendations(session, window.TrainingStorage.getAppState())
    );
    window.TrainingStorage.clearActiveSession();

    if (status) {
      status.innerHTML = 'Workout completed. Volume recommendations are ready. <a href="history.html">View history</a>.';
    }
  }

  function handleWorkoutClick(event) {
    var target = event.target;
    var workoutRoot = getClosest(target, "#workout-exercises");
    var saveSetButton = getClosest(target, "[data-save-set]");
    var addSetButton = getClosest(target, "[data-add-set]");
    var removeSetButton = getClosest(target, "[data-remove-set]");
    var skipSetButton = getClosest(target, "[data-skip-set]");
    var unskipSetButton = getClosest(target, "[data-unskip-set]");
    var skipExerciseButton = getClosest(target, "[data-skip-exercise]");
    var unskipExerciseButton = getClosest(target, "[data-unskip-exercise]");
    var completeExerciseButton = getClosest(target, "[data-complete-exercise]");
    var unlockExerciseButton = getClosest(target, "[data-unlock-exercise]");
    var changeExerciseButton = getClosest(target, "[data-change-exercise]");
    var parts;

    if (!workoutRoot) {
      return;
    }

    if (saveSetButton) {
      parts = saveSetButton.dataset.saveSet.split(":");
      saveSet(Number(parts[0]), Number(parts[1]));
    }

    if (addSetButton) {
      addSet(Number(addSetButton.dataset.addSet));
    }

    if (removeSetButton) {
      parts = removeSetButton.dataset.removeSet.split(":");
      removeSet(Number(parts[0]), Number(parts[1]));
    }

    if (skipSetButton) {
      parts = skipSetButton.dataset.skipSet.split(":");
      skipSet(Number(parts[0]), Number(parts[1]));
    }

    if (unskipSetButton) {
      parts = unskipSetButton.dataset.unskipSet.split(":");
      unskipSet(Number(parts[0]), Number(parts[1]));
    }

    if (completeExerciseButton) {
      completeExercise(Number(completeExerciseButton.dataset.completeExercise));
    }

    if (skipExerciseButton) {
      openSkipExerciseModal(Number(skipExerciseButton.dataset.skipExercise));
    }

    if (unskipExerciseButton) {
      unskipExercise(Number(unskipExerciseButton.dataset.unskipExercise));
    }

    if (unlockExerciseButton) {
      unlockExercise(Number(unlockExerciseButton.dataset.unlockExercise));
    }

    if (changeExerciseButton) {
      openChangeExerciseModal(Number(changeExerciseButton.dataset.changeExercise));
    }
  }

  function getWorkoutActionKey(target) {
    var selectors = [
      "saveSet",
      "addSet",
      "removeSet",
      "skipSet",
      "unskipSet",
      "skipExercise",
      "unskipExercise",
      "completeExercise",
      "unlockExercise",
      "changeExercise"
    ];
    var index;
    var button;

    for (index = 0; index < selectors.length; index += 1) {
      button = getClosest(target, "[data-" + selectors[index].replace(/[A-Z]/g, function (letter) {
        return "-" + letter.toLowerCase();
      }) + "]");

      if (button) {
        return selectors[index] + ":" + button.dataset[selectors[index]];
      }
    }

    return "";
  }

  function handleWorkoutActionEvent(event) {
    var now = Date.now();
    var actionKey = getWorkoutActionKey(event.target);

    if (actionKey && actionKey === lastWorkoutActionKey && now - lastWorkoutActionAt < 350) {
      return;
    }

    lastWorkoutActionAt = now;
    lastWorkoutActionKey = actionKey;
    handleWorkoutClick(event);
  }

  function handleWorkoutInput(event) {
    var row = event.target.closest ? event.target.closest("[data-exercise-index][data-set-index]") : null;

    if (!row || !event.target.dataset.field) {
      return;
    }

    persistSetInput(Number(row.dataset.exerciseIndex), Number(row.dataset.setIndex));
  }

  function handleWorkoutKeydown(event) {
    var row;

    if (event.key !== "Enter" || !event.target.dataset.field) {
      return;
    }

    row = event.target.closest("[data-exercise-index][data-set-index]");

    if (!row) {
      return;
    }

    event.preventDefault();
    saveSet(Number(row.dataset.exerciseIndex), Number(row.dataset.setIndex));
  }

  function saveCurrentSessionSafety() {
    var session = window.TrainingStorage.getActiveSession();

    if (session) {
      window.TrainingStorage.saveActiveSession(session);
    }
  }

  function initWorkoutPage() {
    var container = document.querySelector("#workout-exercises");
    var finishButton = document.querySelector("#finish-workout-button");
    var saveChangeButton = document.querySelector("#save-exercise-change-button");
    var cancelChangeButton = document.querySelector("#cancel-exercise-change-button");
    var changeSelect = document.querySelector("#change-exercise-select");
    var saveSkipButton = document.querySelector("#save-skip-exercise-button");
    var cancelSkipButton = document.querySelector("#cancel-skip-exercise-button");

    renderWorkoutLogger();

    if (container) {
      container.addEventListener("input", handleWorkoutInput);
      container.addEventListener("change", handleWorkoutInput);
      container.addEventListener("keydown", handleWorkoutKeydown);
    }

    if (!workoutClickBound) {
      document.addEventListener("click", handleWorkoutActionEvent);
      document.addEventListener("touchend", handleWorkoutActionEvent);
      document.addEventListener("pointerup", handleWorkoutActionEvent);
      workoutClickBound = true;
    }

    if (finishButton) {
      finishButton.addEventListener("click", renderFeedbackForm);
    }

    if (saveChangeButton) {
      saveChangeButton.addEventListener("click", saveExerciseChange);
    }

    if (cancelChangeButton) {
      cancelChangeButton.addEventListener("click", closeChangeExerciseModal);
    }

    if (changeSelect) {
      changeSelect.addEventListener("change", updateReplacementDetails);
    }

    if (saveSkipButton) {
      saveSkipButton.addEventListener("click", saveSkipExercise);
    }

    if (cancelSkipButton) {
      cancelSkipButton.addEventListener("click", closeSkipExerciseModal);
    }

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        saveCurrentSessionSafety();
      }
    });
    window.addEventListener("beforeunload", saveCurrentSessionSafety);
  }

  window.TrainingWorkout = {
    initWorkoutPage: initWorkoutPage,
    renderWorkoutLogger: renderWorkoutLogger,
    saveSet: saveSet,
    addSet: addSet,
    removeSet: removeSet,
    skipSet: skipSet,
    unskipSet: unskipSet,
    completeExercise: completeExercise,
    unlockExercise: unlockExercise,
    openChangeExerciseModal: openChangeExerciseModal,
    closeChangeExerciseModal: closeChangeExerciseModal,
    saveExerciseChange: saveExerciseChange,
    openSkipExerciseModal: openSkipExerciseModal,
    closeSkipExerciseModal: closeSkipExerciseModal,
    saveSkipExercise: saveSkipExercise,
    unskipExercise: unskipExercise,
    finishWorkout: renderFeedbackForm,
    renderFeedbackForm: renderFeedbackForm,
    collectFeedback: collectFeedback,
    submitFeedback: submitFeedback
  };
})();
