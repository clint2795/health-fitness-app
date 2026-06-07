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

  function ensureLoggedSets(exercise) {
    if (!Array.isArray(exercise.loggedSets)) {
      exercise.loggedSets = [];
    }

    for (var index = exercise.loggedSets.length; index < exercise.plannedSets; index += 1) {
      exercise.loggedSets.push({
        weight: "",
        reps: "",
        actualRir: ""
      });
    }
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
      return (
        '<div class="workout-set-row" data-exercise-index="' + exerciseIndex + '" data-set-index="' + setIndex + '">' +
          '<label>Weight<input type="number" inputmode="decimal" data-field="weight" value="' + escapeHtml(set.weight) + '" placeholder="0"></label>' +
          '<label>Reps<input type="number" inputmode="numeric" data-field="reps" value="' + escapeHtml(set.reps) + '" placeholder="0"></label>' +
          '<label>Actual RIR<input type="number" inputmode="numeric" data-field="actualRir" value="' + escapeHtml(set.actualRir) + '" placeholder="' + escapeHtml(exercise.targetRir || "") + '"></label>' +
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
            '<span class="badge">' + escapeHtml(exercise.plannedSets) + ' sets</span>' +
          '</div>' +
          '<p class="subtle">' + escapeHtml(exercise.notes) + '</p>' +
          createSetInputs(index, exercise) +
          '<button class="button add-set-button" type="button" data-add-set="' + index + '">Add Set</button>' +
        '</article>'
      );
    }).join("");

    window.TrainingStorage.saveActiveSession(session);
  }

  function saveSet(exerciseIndex, setIndex) {
    var session = getActiveSession();
    var row = document.querySelector('[data-exercise-index="' + exerciseIndex + '"][data-set-index="' + setIndex + '"]');
    var status = document.querySelector("#workout-save-status");
    var exercise = session.exercises[exerciseIndex];

    if (!row || !exercise) {
      return;
    }

    ensureLoggedSets(exercise);
    exercise.loggedSets[setIndex] = {
      weight: row.querySelector('[data-field="weight"]').value,
      reps: row.querySelector('[data-field="reps"]').value,
      actualRir: row.querySelector('[data-field="actualRir"]').value,
      savedAt: new Date().toISOString()
    };

    window.TrainingStorage.saveActiveSession(session);

    if (status) {
      status.textContent = "Set saved.";
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
    window.TrainingStorage.saveActiveSession(session);
    renderWorkoutLogger();
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
    var saveSetTarget = event.target.dataset.saveSet;
    var addSetTarget = event.target.dataset.addSet;

    if (saveSetTarget) {
      var parts = saveSetTarget.split(":");
      saveSet(Number(parts[0]), Number(parts[1]));
    }

    if (addSetTarget) {
      addSet(Number(addSetTarget));
    }
  }

  function initWorkoutPage() {
    var container = document.querySelector("#workout-exercises");
    var finishButton = document.querySelector("#finish-workout-button");

    renderWorkoutLogger();

    if (container) {
      container.addEventListener("click", handleWorkoutClick);
    }

    if (finishButton) {
      finishButton.addEventListener("click", renderFeedbackForm);
    }
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
