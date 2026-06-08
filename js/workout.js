(function () {
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
    return Boolean(exercise && exercise.exerciseCompleted);
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
    ensureLoggedSets(exercise);

    return exercise.loggedSets.filter(isSetCompleted).length;
  }

  function getProgressMarkup(exercise) {
    var completed = getCompletedSetCount(exercise);
    var total = exercise.loggedSets.length;
    var skipped = exercise.loggedSets.filter(function (set) {
      return set.skipped;
    }).length;
    var percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    var text = completed + " / " + total + " sets saved";

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

  function createSetInputs(exerciseIndex, exercise) {
    ensureLoggedSets(exercise);

    return exercise.loggedSets.map(function (set, setIndex) {
      var locked = isExerciseLocked(exercise);
      var savedClass = isSetCompleted(set) ? " saved" : "";
      var skippedClass = set.skipped ? " skipped" : "";
      var savedLabel = set.skipped ? "Skipped" : (isSetCompleted(set) ? "Saved" : "Unsaved");
      var disabledAttribute = locked ? " disabled" : "";
      var skipButton = set.skipped
        ? '<button class="button skip-set-button" type="button" data-unskip-set="' + exerciseIndex + ':' + setIndex + '"' + disabledAttribute + '>Undo Skip</button>'
        : '<button class="button skip-set-button" type="button" data-skip-set="' + exerciseIndex + ':' + setIndex + '"' + disabledAttribute + '>Skip Set</button>';

      return (
        '<div class="workout-set-row' + savedClass + skippedClass + '" data-exercise-index="' + exerciseIndex + '" data-set-index="' + setIndex + '">' +
          '<div class="set-row-header"><strong>Set ' + (setIndex + 1) + ' of ' + exercise.loggedSets.length + '</strong><span class="saved-label">' + savedLabel + '</span></div>' +
          '<label>Weight<input type="number" inputmode="decimal" data-field="weightKg" value="' + escapeHtml(getSetValue(set, "weightKg")) + '" placeholder="0"' + disabledAttribute + '></label>' +
          '<label>Reps<input type="number" inputmode="numeric" data-field="reps" value="' + escapeHtml(getSetValue(set, "reps")) + '" placeholder="0"' + disabledAttribute + '></label>' +
          '<label>Actual RIR<input type="number" inputmode="numeric" data-field="actualRir" value="' + escapeHtml(getSetValue(set, "actualRir")) + '" placeholder="' + escapeHtml(exercise.targetRir || "") + '"' + disabledAttribute + '></label>' +
          '<div class="set-button-row">' +
            '<button class="button save-set-button" type="button" data-save-set="' + exerciseIndex + ':' + setIndex + '"' + disabledAttribute + '>Save Set</button>' +
            skipButton +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  function getExerciseActionsMarkup(exerciseIndex, exercise) {
    if (isExerciseLocked(exercise)) {
      return (
        '<div class="exercise-actions completed" data-exercise-actions="' + exerciseIndex + '">' +
          '<p class="exercise-complete-label">Exercise complete</p>' +
          '<button class="button" type="button" data-unlock-exercise="' + exerciseIndex + '">Edit / Unlock</button>' +
        '</div>'
      );
    }

    return (
      '<div class="exercise-actions" data-exercise-actions="' + exerciseIndex + '">' +
        '<button class="button add-set-button" type="button" data-add-set="' + exerciseIndex + '">Add Set</button>' +
        '<button class="button button-primary complete-exercise-button" type="button" data-complete-exercise="' + exerciseIndex + '">Complete This Exercise</button>' +
      '</div>'
    );
  }

  function renderWorkoutLogger() {
    var session = getActiveSession();
    var container = document.querySelector("#workout-exercises");
    var title = document.querySelector("#workout-session-title");
    var week = document.querySelector("#workout-session-week");
    var meta = document.querySelector("#workout-session-meta");

    if (!session || !container) {
      return;
    }

    if (title) title.textContent = session.title;
    if (week) week.textContent = "Week " + session.mesocycleWeek;
    if (meta) {
      meta.textContent = session.date + " - " + session.targetRir + " - " + session.muscles.map(getMuscleLabel).join(", ");
    }

    renderPrep(session);

    container.innerHTML = session.exercises.map(function (exercise, index) {
      var lockedClass = isExerciseLocked(exercise) ? " completed-exercise" : "";

      return (
        '<article class="card workout-exercise-card' + lockedClass + '" data-exercise-card="' + index + '">' +
          '<div class="card-header">' +
            '<div>' +
              '<h2>' + escapeHtml(exercise.name) + '</h2>' +
              '<p class="subtle">' + escapeHtml(getMuscleLabel(exercise.primaryMuscle)) + ' - ' + escapeHtml(exercise.repRange) + ' - ' + escapeHtml(exercise.targetRir) + '</p>' +
            '</div>' +
            '<span class="badge">' + getCompletedSetCount(exercise) + ' / ' + escapeHtml(exercise.loggedSets.length) + ' saved</span>' +
          '</div>' +
          getProgressMarkup(exercise) +
          '<p class="subtle">' + escapeHtml(exercise.notes) + '</p>' +
          createSetInputs(index, exercise) +
          getExerciseActionsMarkup(index, exercise) +
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
      badge.textContent = completed + " / " + total + " saved";
    }

    if (progressText) {
      var skipped = exercise.loggedSets.filter(function (set) {
        return set.skipped;
      }).length;
      progressText.textContent = completed + " / " + total + " sets saved" + (skipped > 0 ? " - " + skipped + " skipped" : "");
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
      label.textContent = "Saved";
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
      status.textContent = "Set saved.";
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
    var saveSetTarget = event.target.dataset ? event.target.dataset.saveSet : null;
    var addSetTarget = event.target.dataset ? event.target.dataset.addSet : null;
    var skipSetTarget = event.target.dataset ? event.target.dataset.skipSet : null;
    var unskipSetTarget = event.target.dataset ? event.target.dataset.unskipSet : null;
    var completeExerciseTarget = event.target.dataset ? event.target.dataset.completeExercise : null;
    var unlockExerciseTarget = event.target.dataset ? event.target.dataset.unlockExercise : null;
    var parts;

    if (saveSetTarget) {
      parts = saveSetTarget.split(":");
      saveSet(Number(parts[0]), Number(parts[1]));
    }

    if (addSetTarget) {
      addSet(Number(addSetTarget));
    }

    if (skipSetTarget) {
      parts = skipSetTarget.split(":");
      skipSet(Number(parts[0]), Number(parts[1]));
    }

    if (unskipSetTarget) {
      parts = unskipSetTarget.split(":");
      unskipSet(Number(parts[0]), Number(parts[1]));
    }

    if (completeExerciseTarget) {
      completeExercise(Number(completeExerciseTarget));
    }

    if (unlockExerciseTarget) {
      unlockExercise(Number(unlockExerciseTarget));
    }
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

    renderWorkoutLogger();

    if (container) {
      container.addEventListener("click", handleWorkoutClick);
      container.addEventListener("input", handleWorkoutInput);
      container.addEventListener("change", handleWorkoutInput);
      container.addEventListener("keydown", handleWorkoutKeydown);
    }

    if (finishButton) {
      finishButton.addEventListener("click", renderFeedbackForm);
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
    skipSet: skipSet,
    unskipSet: unskipSet,
    completeExercise: completeExercise,
    unlockExercise: unlockExercise,
    finishWorkout: renderFeedbackForm,
    renderFeedbackForm: renderFeedbackForm,
    collectFeedback: collectFeedback,
    submitFeedback: submitFeedback
  };
})();
