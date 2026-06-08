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
    return Boolean(set && (set.completed || set.saved));
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
        completed: Boolean(set.completed || set.saved),
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
    var percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
      '<div class="set-progress" data-progress-for="' + escapeHtml(exercise.exerciseId) + '">' +
        '<div class="set-progress-text">' + completed + ' / ' + total + ' sets saved</div>' +
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
      var savedClass = isSetCompleted(set) ? " saved" : "";
      var savedLabel = isSetCompleted(set) ? "Saved" : "Unsaved";

      return (
        '<div class="workout-set-row' + savedClass + '" data-exercise-index="' + exerciseIndex + '" data-set-index="' + setIndex + '">' +
          '<div class="set-row-header"><strong>Set ' + (setIndex + 1) + ' of ' + exercise.loggedSets.length + '</strong><span class="saved-label">' + savedLabel + '</span></div>' +
          '<label>Weight<input type="number" inputmode="decimal" data-field="weightKg" value="' + escapeHtml(getSetValue(set, "weightKg")) + '" placeholder="0"></label>' +
          '<label>Reps<input type="number" inputmode="numeric" data-field="reps" value="' + escapeHtml(getSetValue(set, "reps")) + '" placeholder="0"></label>' +
          '<label>Actual RIR<input type="number" inputmode="numeric" data-field="actualRir" value="' + escapeHtml(getSetValue(set, "actualRir")) + '" placeholder="' + escapeHtml(exercise.targetRir || "") + '"></label>' +
          '<button class="button save-set-button" type="button" data-save-set="' + exerciseIndex + ':' + setIndex + '">Save Set</button>' +
        '</div>'
      );
    }).join("");
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
      return (
        '<article class="card workout-exercise-card" data-exercise-card="' + index + '">' +
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
          '<button class="button add-set-button" type="button" data-add-set="' + index + '">Add Set</button>' +
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
      progressText.textContent = completed + " / " + total + " sets saved";
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
    }

    if (label) {
      label.textContent = "Saved";
    }
  }

  function persistSetInput(exerciseIndex, setIndex) {
    var session = getActiveSession();

    if (!session || !session.exercises) {
      return;
    }

    updateSetFromRow(session, exerciseIndex, setIndex, false);
    window.TrainingStorage.saveActiveSession(session);
  }

  function saveSet(exerciseIndex, setIndex, shouldAdvance) {
    var session = getActiveSession();
    var status = document.querySelector("#workout-save-status");
    var exercise = session.exercises[exerciseIndex];

    if (!exercise) {
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
      advanceToNextSet(exerciseIndex, setIndex);
    }
  }

  function addSet(exerciseIndex) {
    var session = getActiveSession();
    var exercise = session.exercises[exerciseIndex];

    if (!exercise) {
      return;
    }

    exercise.plannedSets += 1;
    ensureLoggedSets(exercise);
    exercise.loggedSets[exercise.loggedSets.length - 1].updatedAt = new Date().toISOString();
    window.TrainingStorage.saveActiveSession(session);
    renderWorkoutLogger();
    focusSet(exerciseIndex, exercise.loggedSets.length - 1);
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
        if (!isSetCompleted(session.exercises[exerciseIndex].loggedSets[setIndex])) {
          return {
            exerciseIndex: exerciseIndex,
            setIndex: setIndex
          };
        }
      }
    }

    return null;
  }

  function focusSet(exerciseIndex, setIndex) {
    var row = getSetRow(exerciseIndex, setIndex);
    var input;

    if (!row) {
      return;
    }

    input = row.querySelector('[data-field="weightKg"]') || row.querySelector('[data-field="reps"]') || row.querySelector("input");

    if (row.scrollIntoView) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    if (input && input.focus) {
      input.focus({ preventScroll: true });
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

  function advanceToNextSet(exerciseIndex, setIndex) {
    var nextSet = findNextUnsavedSet(exerciseIndex, setIndex);

    if (nextSet) {
      focusSet(nextSet.exerciseIndex, nextSet.setIndex);
      return;
    }

    focusFinishButton();
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

    if (saveSetTarget) {
      var parts = saveSetTarget.split(":");
      saveSet(Number(parts[0]), Number(parts[1]));
    }

    if (addSetTarget) {
      addSet(Number(addSetTarget));
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
    finishWorkout: renderFeedbackForm,
    renderFeedbackForm: renderFeedbackForm,
    collectFeedback: collectFeedback,
    submitFeedback: submitFeedback
  };
})();
