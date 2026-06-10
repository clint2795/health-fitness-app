(function () {
  var workoutClickBound = false;
  var lastWorkoutActionAt = 0;
  var lastWorkoutActionKey = "";
  var changeExerciseModalState = {
    exerciseIndex: null,
    selectedExerciseId: "",
    category: "All",
    search: ""
  };
  var changeExerciseModalActionAt = 0;
  var changeExerciseModalActionKey = "";
  var changeExerciseModalInputBound = false;
  var changeExerciseCategories = [
    "All",
    "Shoulders",
    "Side Delts",
    "Rear Delts",
    "Front Delts",
    "Shoulder Health",
    "Chest",
    "Back Width",
    "Back Thickness",
    "Biceps",
    "Triceps",
    "Quads",
    "Hamstrings",
    "Glutes",
    "Calves",
    "Core",
    "Mobility"
  ];

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

  function isSetResolved(set) {
    return Boolean(set && (isSetCompleted(set) || set.skipped));
  }

  function getResolvedSetCount(exercise) {
    ensureLoggedSets(exercise);

    return exercise.loggedSets.filter(isSetResolved).length;
  }

  function getUnresolvedSetCount(exercise) {
    ensureLoggedSets(exercise);

    return exercise.loggedSets.length - getResolvedSetCount(exercise);
  }

  function isExerciseReadyToComplete(exercise) {
    return Boolean(exercise && getUnresolvedSetCount(exercise) === 0);
  }

  function getSkippedSetCount(exercise) {
    ensureLoggedSets(exercise);

    return exercise.loggedSets.filter(function (set) {
      return set.skipped;
    }).length;
  }

  function getLoggedSetLabel(exercise) {
    var logged = getCompletedSetCount(exercise);
    var total = exercise.loggedSets.length;
    var skipped = getSkippedSetCount(exercise);
    var resolved = getResolvedSetCount(exercise);
    var label = logged + " / " + total + " logged";

    if (skipped > 0) {
      label += " - " + resolved + " resolved";
    }

    return label;
  }

  function getResolvedSetLabel(exercise) {
    return getResolvedSetCount(exercise) + " / " + exercise.loggedSets.length + " resolved";
  }

  function getActiveSetIndex(exercise) {
    ensureLoggedSets(exercise);

    return exercise.loggedSets.findIndex(function (set) {
      return !isSetResolved(set);
    });
  }

  function getProgressMarkup(exercise) {
    var completed = getCompletedSetCount(exercise);
    var resolved = getResolvedSetCount(exercise);
    var total = exercise.loggedSets.length;
    var skipped = getSkippedSetCount(exercise);
    var percent = total > 0 ? Math.round((resolved / total) * 100) : 0;
    var text = resolved + " / " + total + " sets resolved";

    if (completed > 0) {
      text += " - " + completed + " logged";
    }
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

  function getSessionMetaMarkup(session) {
    return (
      '<span class="workout-meta-item">' + escapeHtml(session.date || "Today") + '</span>' +
      '<span class="workout-meta-item">' + escapeHtml(session.targetRir || "RIR target") + '</span>' +
      '<span class="workout-meta-item">' + escapeHtml((session.muscles || []).map(getMuscleLabel).join(", ")) + '</span>'
    );
  }

  function getWorkoutProgressSummary(session, currentExerciseIndex) {
    var exercises = session.exercises || [];
    var completedExercises = exercises.filter(function (exercise) {
      return isExerciseLocked(exercise);
    }).length;
    var completedSets = 0;
    var totalSets = 0;
    var currentSetIndex = -1;

    exercises.forEach(function (exercise, index) {
      ensureLoggedSets(exercise);
      completedSets += getResolvedSetCount(exercise);
      totalSets += exercise.loggedSets.length;

      if (index === currentExerciseIndex) {
        currentSetIndex = getActiveSetIndex(exercise);
      }
    });

    return (
      '<div class="workout-progress-summary" aria-label="Workout progress">' +
        '<div><span>Exercises</span><strong>' + completedExercises + ' / ' + exercises.length + '</strong></div>' +
        '<div><span>Sets</span><strong>' + completedSets + ' / ' + totalSets + '</strong></div>' +
        '<div><span>Current set</span><strong>' + (currentSetIndex >= 0 ? String(currentSetIndex + 1) : "Done") + '</strong></div>' +
      '</div>'
    );
  }

  function getExerciseMetaMarkup(exercise) {
    return (
      '<div class="exercise-target-grid">' +
        '<div><span>Target</span><strong>' + escapeHtml(getMuscleLabel(exercise.primaryMuscle)) + '</strong></div>' +
        '<div><span>Rep range</span><strong>' + escapeHtml(exercise.repRange) + '</strong></div>' +
        '<div><span>RIR</span><strong>' + escapeHtml(exercise.targetRir || "target") + '</strong></div>' +
      '</div>'
    );
  }

  function getNextExercisePreviewMarkup(session, currentExerciseIndex) {
    var nextExercise = (session.exercises || []).slice(currentExerciseIndex + 1).find(function (exercise) {
      return !isExerciseLocked(exercise);
    });

    if (!nextExercise) {
      return "";
    }

    return (
      '<div class="next-exercise-preview">' +
        '<span>Next exercise</span>' +
        '<strong>' + escapeHtml(nextExercise.name) + '</strong>' +
        '<em>' + escapeHtml(getMuscleLabel(nextExercise.primaryMuscle)) + ' / ' + escapeHtml(nextExercise.repRange) + '</em>' +
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

  function compactToken(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function exerciseHasToken(exercise, token) {
    var source = [
      exercise.id,
      exercise.name,
      exercise.primaryMuscle,
      (exercise.secondaryMuscles || []).join(" "),
      exercise.equipment,
      exercise.notes
    ].join(" ");

    return compactToken(source).indexOf(token) !== -1;
  }

  function getExerciseCategoryLabel(exercise) {
    var primary = compactToken(exercise.primaryMuscle);
    var name = compactToken(exercise.name);
    var secondary = compactToken((exercise.secondaryMuscles || []).join(" "));

    if (primary === "sidedelts" || primary === "sidedelt" || exerciseHasToken(exercise, "lateralraise") || name.indexOf("uprightrow") !== -1) {
      return "Side Delts";
    }

    if (primary === "reardelts" || primary === "reardelt" || name.indexOf("reardelt") !== -1 || name.indexOf("pecdeck") !== -1 || name.indexOf("facepull") !== -1) {
      return "Rear Delts";
    }

    if (primary === "frontdelts" || secondary.indexOf("frontdelts") !== -1) {
      return "Front Delts";
    }

    if (primary === "shoulderprep" || exercise.status === "prep" || name.indexOf("hang") !== -1) {
      return "Shoulder Health";
    }

    if (primary === "upperchest" || primary === "chest") {
      return "Chest";
    }

    if (primary === "backwidth" || name.indexOf("pulldown") !== -1 || name.indexOf("pullover") !== -1 || name.indexOf("latprayer") !== -1) {
      return "Back Width";
    }

    if (primary === "backthickness" || name.indexOf("row") !== -1) {
      return "Back Thickness";
    }

    if (primary === "biceps") {
      return "Biceps";
    }

    if (primary === "triceps") {
      return "Triceps";
    }

    if (primary === "legs") {
      if (name.indexOf("hamstring") !== -1 || name.indexOf("deadlift") !== -1 || name.indexOf("rdl") !== -1) {
        return "Hamstrings";
      }

      if (name.indexOf("calf") !== -1) {
        return "Calves";
      }

      if (name.indexOf("glute") !== -1 || secondary.indexOf("glutes") !== -1) {
        return "Glutes";
      }

      return "Quads";
    }

    if (primary === "abswaist" || primary === "core" || name.indexOf("crunch") !== -1 || name.indexOf("bug") !== -1 || name.indexOf("pallof") !== -1) {
      return "Core";
    }

    if (primary.indexOf("mobility") !== -1 || primary.indexOf("warmup") !== -1 || name.indexOf("mobility") !== -1 || name.indexOf("stretch") !== -1) {
      return "Mobility";
    }

    if (primary.indexOf("delt") !== -1 || secondary.indexOf("delt") !== -1) {
      return "Shoulders";
    }

    return "All";
  }

  function getExerciseSearchText(exercise) {
    return [
      exercise.name,
      exercise.primaryMuscle,
      getExerciseCategoryLabel(exercise),
      exercise.equipment,
      exercise.status,
      (exercise.secondaryMuscles || []).join(" ")
    ].join(" ").toLowerCase();
  }

  function isShoulderCategory(category) {
    return category === "Side Delts" ||
      category === "Rear Delts" ||
      category === "Front Delts" ||
      category === "Shoulder Health" ||
      category === "Shoulders";
  }

  function exerciseMatchesChangeCategory(exerciseCategory, selectedCategory) {
    if (selectedCategory === "All") {
      return true;
    }

    if (selectedCategory === "Shoulders") {
      return isShoulderCategory(exerciseCategory);
    }

    return exerciseCategory === selectedCategory;
  }

  function getChangeExerciseOptions(currentExercise) {
    var state = window.TrainingStorage.getAppState();
    var search = changeExerciseModalState.search.trim().toLowerCase();
    var category = changeExerciseModalState.category;

    return (state.exerciseLibrary || []).filter(function (exercise) {
      if (!exercise || exercise.id === currentExercise.exerciseId) {
        return false;
      }

      if (!exerciseMatchesChangeCategory(getExerciseCategoryLabel(exercise), category)) {
        return false;
      }

      return !search || getExerciseSearchText(exercise).indexOf(search) !== -1;
    }).sort(function (a, b) {
      var aRisk = getExerciseRiskReasons(a, state).length;
      var bRisk = getExerciseRiskReasons(b, state).length;

      return aRisk - bRisk || statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name);
    });
  }

  function getChangeExerciseCategoryCounts(currentExercise) {
    var state = window.TrainingStorage.getAppState();
    var counts = {};

    changeExerciseCategories.forEach(function (category) {
      counts[category] = 0;
    });

    (state.exerciseLibrary || []).forEach(function (exercise) {
      var category;

      if (!exercise || exercise.id === currentExercise.exerciseId) {
        return;
      }

      category = getExerciseCategoryLabel(exercise);
      counts.All += 1;

      if (isShoulderCategory(category) && category !== "Shoulders") {
        counts.Shoulders += 1;
      }

      if (counts[category] !== undefined) {
        counts[category] += 1;
      }
    });

    return counts;
  }

  function getChangeCategoryTabsMarkup(currentExercise) {
    var counts = getChangeExerciseCategoryCounts(currentExercise);

    return changeExerciseCategories.map(function (category) {
      var active = changeExerciseModalState.category === category ? " is-active" : "";
      var disabled = counts[category] ? "" : " disabled";

      return (
        '<button class="change-library-tab' + active + '" type="button" data-change-category="' + escapeHtml(category) + '"' + disabled + '>' +
          '<span>' + escapeHtml(category) + '</span>' +
          '<em>' + counts[category] + '</em>' +
        '</button>'
      );
    }).join("");
  }

  function getChangeExerciseOptionMarkup(exercise) {
    var state = window.TrainingStorage.getAppState();
    var riskReasons = getExerciseRiskReasons(exercise, state);
    var selected = changeExerciseModalState.selectedExerciseId === exercise.id ? " is-selected" : "";
    var statusClass = " status-" + escapeHtml(exercise.status || "neutral");
    var riskMarkup = riskReasons.length
      ? '<span class="change-option-risk">Caution: ' + escapeHtml(riskReasons.join(", ")) + '</span>'
      : "";

    return (
      '<button class="change-library-option' + selected + '" type="button" data-select-change-exercise="' + escapeHtml(exercise.id) + '">' +
        '<span class="change-option-main">' +
          '<strong>' + escapeHtml(exercise.name) + '</strong>' +
          '<em>' + escapeHtml(getExerciseCategoryLabel(exercise)) + ' / ' + escapeHtml(getMuscleLabel(exercise.primaryMuscle)) + '</em>' +
        '</span>' +
        '<span class="change-option-meta">' +
          '<span>' + escapeHtml(exercise.equipment || "Equipment not set") + '</span>' +
          '<span class="change-option-status' + statusClass + '">' + escapeHtml(exercise.status || "neutral") + '</span>' +
        '</span>' +
        riskMarkup +
      '</button>'
    );
  }

  function hasAnyLoggedSetData(exercise) {
    ensureLoggedSets(exercise);

    return exercise.loggedSets.some(function (set) {
      return hasLoggedValue(set) || isSetCompleted(set) || set.skipped;
    });
  }

  function getSubstitutionMarkup(exercise) {
    if (
      !exercise.substitution ||
      compactToken(exercise.name) === compactToken(exercise.substitution.originalExerciseName) ||
      (exercise.exerciseId && exercise.exerciseId === exercise.substitution.originalExerciseId)
    ) {
      return "";
    }

    return (
      '<details class="swap-info">' +
        '<summary>Swapped from ' + escapeHtml(exercise.substitution.originalExerciseName) + '</summary>' +
        '<p>Performed: ' + escapeHtml(exercise.substitution.newExerciseName || exercise.name) + '</p>' +
        '<p>Reason: ' + escapeHtml(exercise.substitution.reason || "not recorded") + '</p>' +
      '</details>'
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
    var weight = getSetValue(set, "weightKg") || "-";
    var reps = getSetValue(set, "reps") || "-";
    var rir = getSetValue(set, "actualRir");
    var summary = weight + " kg x " + reps;

    return rir ? summary + " @ " + rir + " RIR" : summary + " - RIR not logged";
  }

  function getCompactSetActions(exerciseIndex, setIndex, set, locked) {
    if (locked) {
      return "";
    }

    if (set.skipped) {
      return (
        '<div class="compact-set-actions">' +
          '<button class="button set-secondary-button compact-set-button" type="button" data-unskip-set="' + exerciseIndex + ':' + setIndex + '">Undo</button>' +
          '<button class="button set-secondary-button compact-set-button" type="button" data-remove-set="' + exerciseIndex + ':' + setIndex + '">Remove</button>' +
        '</div>'
      );
    }

    if (isSetCompleted(set)) {
      return (
        '<div class="compact-set-actions">' +
          '<button class="button set-secondary-button compact-set-button" type="button" data-remove-set="' + exerciseIndex + ':' + setIndex + '">Remove</button>' +
        '</div>'
      );
    }

    return "";
  }

  function getSetTrackMarkup(exerciseIndex, exercise) {
    ensureLoggedSets(exercise);
    var activeSetIndex = getActiveSetIndex(exercise);
    var locked = isExerciseLocked(exercise);

    return exercise.loggedSets.map(function (set, setIndex) {
      var savedClass = isSetCompleted(set) ? " saved" : "";
      var skippedClass = set.skipped ? " skipped" : "";
      var activeClass = !locked && setIndex === activeSetIndex ? " active-set" : "";
      var futureClass = !locked && !savedClass && !skippedClass && setIndex !== activeSetIndex ? " future-set" : "";
      var savedLabel = set.skipped ? "Skipped" : (isSetCompleted(set) ? "Logged" : "Not logged");
      var detail = set.skipped
        ? "Set " + (setIndex + 1) + " skipped"
        : (isSetCompleted(set) ? getSetSummaryText(set) : "Set " + (setIndex + 1) + (setIndex === activeSetIndex && !locked ? " active" : " waiting"));

      return (
        '<div class="set-track-row' + savedClass + skippedClass + activeClass + futureClass + '" data-exercise-index="' + exerciseIndex + '" data-set-index="' + setIndex + '">' +
          '<div class="set-row-header"><strong>Set ' + (setIndex + 1) + ' of ' + exercise.loggedSets.length + '</strong><span class="saved-label">' + savedLabel + '</span></div>' +
          '<p class="set-track-detail">' + escapeHtml(detail) + '</p>' +
          getCompactSetActions(exerciseIndex, setIndex, set, locked) +
        '</div>'
      );
    }).join("");
  }

  function getActiveSetPanelMarkup(exerciseIndex, exercise) {
    var activeSetIndex;
    var set;

    if (isExerciseLocked(exercise)) {
      return "";
    }

    ensureLoggedSets(exercise);
    activeSetIndex = getActiveSetIndex(exercise);

    if (activeSetIndex < 0) {
      return (
        '<div class="active-set-panel resolved-active-set">' +
          '<div class="active-set-heading"><span>All sets resolved</span><strong>Ready to complete exercise</strong></div>' +
        '</div>'
      );
    }

    set = exercise.loggedSets[activeSetIndex];

    return (
      '<div class="active-set-panel workout-set-row active-set" data-exercise-index="' + exerciseIndex + '" data-set-index="' + activeSetIndex + '">' +
        '<div class="active-set-heading"><span>Active set</span><strong>Set ' + (activeSetIndex + 1) + ' of ' + exercise.loggedSets.length + '</strong></div>' +
        '<div class="active-set-fields">' +
          '<label>Weight<input type="number" inputmode="decimal" data-field="weightKg" value="' + escapeHtml(getSetValue(set, "weightKg")) + '" placeholder="0"></label>' +
          '<label>Reps<input type="number" inputmode="numeric" data-field="reps" value="' + escapeHtml(getSetValue(set, "reps")) + '" placeholder="0"></label>' +
          '<label>Actual RIR<input type="number" inputmode="numeric" data-field="actualRir" value="' + escapeHtml(getSetValue(set, "actualRir")) + '" placeholder="' + escapeHtml(exercise.targetRir || "") + '"></label>' +
        '</div>' +
        '<div class="set-button-row">' +
          '<button class="button button-primary save-set-button" type="button" data-save-set="' + exerciseIndex + ':' + activeSetIndex + '" data-log-set="' + exerciseIndex + ':' + activeSetIndex + '">Log Set</button>' +
          '<div class="set-secondary-actions">' +
            '<button class="button set-secondary-button skip-set-button" type="button" data-skip-set="' + exerciseIndex + ':' + activeSetIndex + '">Skip Set</button>' +
            '<button class="button set-secondary-button remove-set-button" type="button" data-remove-set="' + exerciseIndex + ':' + activeSetIndex + '">Remove</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function getSetDisplayMarkup(exerciseIndex, exercise, isCurrent) {
    return (
      (isCurrent ? getActiveSetPanelMarkup(exerciseIndex, exercise) : '') +
      '<div class="set-track" aria-label="Set progress">' +
        '<div class="set-track-heading"><span>Set progress</span><strong>' + escapeHtml(getResolvedSetLabel(exercise)) + '</strong></div>' +
        getSetTrackMarkup(exerciseIndex, exercise) +
      '</div>'
    );
  }

  function getExerciseActionsMarkup(exerciseIndex, exercise) {
    var readyToComplete = isExerciseReadyToComplete(exercise);

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

    return (
      '<div class="exercise-actions' + (readyToComplete ? " exercise-ready-actions" : " exercise-not-ready-actions") + '" data-exercise-actions="' + exerciseIndex + '">' +
        '<button class="button complete-exercise-button' + (readyToComplete ? " button-primary complete-exercise-ready" : " complete-exercise-not-ready") + '" type="button" data-complete-exercise="' + exerciseIndex + '">Complete Exercise</button>' +
        (readyToComplete ? "" : '<p class="exercise-action-helper">Log or skip all sets first.</p>') +
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

  function getExerciseNoteMarkup(exercise, compact) {
    if (!exercise.notes) {
      return "";
    }

    if (compact || exercise.notes.length <= 90) {
      return '<p class="subtle workout-exercise-note">' + escapeHtml(exercise.notes) + '</p>';
    }

    return (
      '<details class="workout-exercise-note workout-exercise-note-details">' +
        '<summary>Exercise notes</summary>' +
        '<p>' + escapeHtml(exercise.notes) + '</p>' +
      '</details>'
    );
  }

  function getExerciseCardMarkup(session, exercise, index, currentExerciseIndex) {
    var isCurrent = index === currentExerciseIndex;
    var lockedClass = isExerciseLocked(exercise) ? " completed-exercise" : "";
    var skippedClass = isExerciseSkipped(exercise) ? " skipped-exercise" : "";
    var currentClass = isCurrent ? " current-exercise-card workout-current-panel" : " workout-queue-card";
    var currentLabel = isCurrent ? '<p class="current-exercise-label">Working exercise</p>' : "";
    var noteMarkup = getExerciseNoteMarkup(exercise, !isCurrent);

    return (
      '<article class="card workout-exercise-card' + lockedClass + skippedClass + currentClass + '" data-exercise-card="' + index + '">' +
        '<div class="workout-card-header">' +
          '<div class="workout-exercise-title-block">' +
            currentLabel +
            '<h2>' + escapeHtml(exercise.name) + '</h2>' +
            '<p class="subtle">' + escapeHtml(getMuscleLabel(exercise.primaryMuscle)) + ' - ' + escapeHtml(exercise.repRange) + ' - ' + escapeHtml(exercise.targetRir) + '</p>' +
            getSubstitutionMarkup(exercise) +
          '</div>' +
          '<div class="workout-header-actions">' +
            (!isExerciseLocked(exercise) ? '<button class="button change-exercise-top-button" type="button" data-change-exercise="' + index + '">Change</button>' : '') +
            '<span class="badge">' + escapeHtml(getLoggedSetLabel(exercise)) + '</span>' +
          '</div>' +
        '</div>' +
        (isCurrent ? getExerciseMetaMarkup(exercise) : '') +
        noteMarkup +
        getProgressMarkup(exercise) +
        '<div class="workout-set-stack">' + getSetDisplayMarkup(index, exercise, isCurrent) + '</div>' +
        getExerciseActionsMarkup(index, exercise) +
        (isCurrent ? getNextExercisePreviewMarkup(session, currentExerciseIndex) : '') +
      '</article>'
    );
  }

  function getQueueExercisePreviewMarkup(exercise, index, compactCompleted) {
    var status = isExerciseSkipped(exercise)
      ? "Skipped"
      : (isExerciseLocked(exercise) ? "Complete" : "Planned");
    var loggedSets = getCompletedSetCount(exercise);
    var statusDetail = compactCompleted
      ? (loggedSets > 0 ? loggedSets + " sets logged" : (isExerciseSkipped(exercise) ? "Marked skipped" : "No sets logged"))
      : getResolvedSetLabel(exercise);
    var note = !compactCompleted && exercise.notes && exercise.notes.length <= 80
      ? '<p class="subtle workout-exercise-note queue-note">' + escapeHtml(exercise.notes) + '</p>'
      : "";

    ensureLoggedSets(exercise);

    return (
      '<article class="card workout-exercise-card workout-queue-card compact-queue-card' + (isExerciseLocked(exercise) ? " completed-exercise" : "") + (isExerciseSkipped(exercise) ? " skipped-exercise" : "") + '" data-exercise-card="' + index + '">' +
        '<div class="queue-card-main">' +
          '<div>' +
            '<h2>' + escapeHtml(exercise.name) + '</h2>' +
            '<p class="subtle">' + escapeHtml(getMuscleLabel(exercise.primaryMuscle)) + ' - ' + escapeHtml(exercise.repRange) + ' - ' + escapeHtml(exercise.targetRir) + '</p>' +
            getSubstitutionMarkup(exercise) +
            note +
          '</div>' +
          '<div class="queue-card-status">' +
            '<span class="badge">' + escapeHtml(status) + '</span>' +
            '<strong>' + escapeHtml(statusDetail) + '</strong>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function getWorkoutExercisesMarkup(session, currentExerciseIndex) {
    var exercises = session.exercises || [];
    var currentMarkup = currentExerciseIndex >= 0
      ? getExerciseCardMarkup(session, exercises[currentExerciseIndex], currentExerciseIndex, currentExerciseIndex)
      : "";
    var upcomingExercises = exercises.map(function (exercise, index) {
      return { exercise: exercise, index: index };
    }).filter(function (item) {
      return item.index !== currentExerciseIndex && !isExerciseLocked(item.exercise);
    });
    var completedExercises = exercises.map(function (exercise, index) {
      return { exercise: exercise, index: index };
    }).filter(function (item) {
      return item.index !== currentExerciseIndex && isExerciseLocked(item.exercise);
    });
    var queueMarkup = upcomingExercises.map(function (item) {
      return getQueueExercisePreviewMarkup(item.exercise, item.index, false);
    }).join("");
    var completedMarkup = completedExercises.map(function (item) {
      return getQueueExercisePreviewMarkup(item.exercise, item.index, true);
    }).join("");

    if (!queueMarkup) {
      queueMarkup = '<p class="subtle queue-empty-state">No remaining movements.</p>';
    }

    return (
      '<div class="workout-render-shell">' +
        (currentMarkup ? '<section class="workout-working-zone" aria-label="Current exercise">' + currentMarkup + '</section>' : '') +
        '<section class="workout-queue-zone" aria-label="Up next">' +
          '<div class="workout-queue-heading"><span>Up next</span><strong>' + upcomingExercises.length + ' remaining</strong></div>' +
          queueMarkup +
        '</section>' +
        (completedMarkup
          ? '<section class="workout-queue-zone completed-today-zone" aria-label="Completed today">' +
              '<div class="workout-queue-heading completed-today-heading"><span>Completed today</span><strong>' + completedExercises.length + ' resolved</strong></div>' +
              completedMarkup +
            '</section>'
          : '') +
      '</div>'
    );
  }

  function renderWorkoutLogger() {
    var session = getActiveSession();
    var container = document.querySelector("#workout-exercises");
    var title = document.querySelector("#workout-session-title");
    var week = document.querySelector("#workout-session-week");
    var meta = document.querySelector("#workout-session-meta");
    var finishButton = document.querySelector("#finish-workout-button");
    var sessionHero = title && title.closest ? title.closest(".card") : null;

    if (!session || !container) {
      return;
    }

    if (title) title.textContent = session.title;
    if (week) week.textContent = "Week " + session.mesocycleWeek;
    if (sessionHero && sessionHero.classList) {
      sessionHero.classList.add("workout-session-hero");
    }

    if (finishButton && finishButton.classList) {
      finishButton.textContent = areAllExercisesResolved(session) ? "Review & Finish" : "Add Check-In";
      if (areAllExercisesResolved(session)) {
        finishButton.classList.add("button-primary");
      } else {
        finishButton.classList.remove("button-primary");
      }
    }

    renderPrep(session);
    var currentExerciseIndex = getCurrentExerciseIndex(session);

    if (meta) {
      meta.innerHTML = getSessionMetaMarkup(session) + getWorkoutProgressSummary(session, currentExerciseIndex);
    }

    container.innerHTML = getWorkoutExercisesMarkup(session, currentExerciseIndex);

    window.TrainingStorage.saveActiveSession(session);
  }

  function getSetRow(exerciseIndex, setIndex) {
    return document.querySelector('[data-exercise-index="' + exerciseIndex + '"][data-set-index="' + setIndex + '"]');
  }

  function updateSetFromRow(session, exerciseIndex, setIndex, completed) {
    var row = getSetRow(exerciseIndex, setIndex);
    var exercise = session.exercises[exerciseIndex];
    var existingSet;
    var weightInput;
    var repsInput;
    var rirInput;

    if (!row || !exercise) {
      return null;
    }

    ensureLoggedSets(exercise);
    existingSet = exercise.loggedSets[setIndex] || {};
    weightInput = row.querySelector('[data-field="weightKg"]');
    repsInput = row.querySelector('[data-field="reps"]');
    rirInput = row.querySelector('[data-field="actualRir"]');
    exercise.loggedSets[setIndex] = {
      weightKg: weightInput ? weightInput.value : getSetValue(existingSet, "weightKg"),
      reps: repsInput ? repsInput.value : getSetValue(existingSet, "reps"),
      actualRir: rirInput ? rirInput.value : getSetValue(existingSet, "actualRir"),
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
    var resolved;
    var total;

    if (!exercise) {
      return;
    }

    completed = getCompletedSetCount(exercise);
    resolved = getResolvedSetCount(exercise);
    total = exercise.loggedSets.length;

    if (badge) {
      badge.textContent = getLoggedSetLabel(exercise);
    }

    if (progressText) {
      var skipped = exercise.loggedSets.filter(function (set) {
        return set.skipped;
      }).length;
      progressText.textContent = resolved + " / " + total + " sets resolved" + (completed > 0 ? " - " + completed + " logged" : "") + (skipped > 0 ? " - " + skipped + " skipped" : "");
    }

    if (progressBar) {
      progressBar.style.width = (total > 0 ? Math.round((resolved / total) * 100) : 0) + "%";
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
    renderWorkoutLogger();

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
        if (!isSetResolved(session.exercises[exerciseIndex].loggedSets[setIndex])) {
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
      if (!isSetResolved(exercise.loggedSets[setIndex])) {
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
    var unresolvedCount;

    if (!exercise) {
      return;
    }

    ensureLoggedSets(exercise);
    exercise.loggedSets.forEach(function (set, setIndex) {
      updateSetFromRow(session, exerciseIndex, setIndex, false);
    });

    unresolvedCount = getUnresolvedSetCount(exercise);

    if (unresolvedCount > 0 && !confirm("This exercise still has " + unresolvedCount + " unresolved set" + (unresolvedCount === 1 ? "" : "s") + ". Complete it anyway?")) {
      window.TrainingStorage.saveActiveSession(session);
      renderWorkoutLogger();
      focusExerciseCard(exerciseIndex);
      return;
    }

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
    var modal = document.querySelector("#workout-change-exercise-modal");

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

    changeExerciseModalState.exerciseIndex = null;
    changeExerciseModalState.selectedExerciseId = "";
    changeExerciseModalState.category = "All";
    changeExerciseModalState.search = "";
  }

  function ensureChangeExerciseModal() {
    var modal = document.querySelector("#workout-change-exercise-modal");

    if (modal) {
      return modal;
    }

    modal = document.createElement("div");
    modal.id = "workout-change-exercise-modal";
    modal.className = "change-library-modal";
    modal.hidden = true;
    modal.innerHTML = (
      '<div class="change-library-dialog" role="dialog" aria-modal="true" aria-labelledby="change-library-title">' +
        '<div class="change-library-header">' +
          '<div>' +
            '<p class="change-library-kicker">Change exercise</p>' +
            '<h2 id="change-library-title">Exercise Library</h2>' +
            '<p class="subtle" id="change-library-current"></p>' +
          '</div>' +
          '<button class="button change-library-close" type="button" data-cancel-exercise-change="1" aria-label="Close change exercise">Cancel</button>' +
        '</div>' +
        '<label class="change-library-search-label">Search library' +
          '<input id="change-library-search" type="search" autocomplete="off" placeholder="Search by movement, target, equipment">' +
        '</label>' +
        '<div class="change-library-tabs" id="change-library-tabs" aria-label="Body part filters"></div>' +
        '<div class="change-library-options" id="change-library-options" aria-label="Exercise options"></div>' +
        '<div class="change-library-footer">' +
          '<button class="button button-primary" type="button" data-apply-exercise-change="1">Apply</button>' +
          '<button class="button" type="button" data-cancel-exercise-change="1">Cancel</button>' +
        '</div>' +
      '</div>'
    );
    document.body.appendChild(modal);

    bindChangeExerciseModalEvents(modal);

    return modal;
  }

  function openChangeExerciseModal(exerciseIndex) {
    var session = getActiveSession();
    var exercise = session && session.exercises ? session.exercises[exerciseIndex] : null;
    var modal;
    var defaultCategory;
    var options;

    if (!exercise || isExerciseLocked(exercise)) {
      return;
    }

    modal = ensureChangeExerciseModal();
    defaultCategory = getExerciseCategoryLabel(exercise);
    modal.dataset.exerciseIndex = String(exerciseIndex);
    changeExerciseModalState.exerciseIndex = Number(exerciseIndex);
    changeExerciseModalState.category = changeExerciseCategories.indexOf(defaultCategory) >= 0 ? defaultCategory : "All";
    changeExerciseModalState.search = "";
    options = getChangeExerciseOptions(exercise);
    changeExerciseModalState.selectedExerciseId = options.length ? options[0].id : "";

    modal.hidden = false;
    if (modal.removeAttribute) {
      modal.removeAttribute("hidden");
    }
    if (modal.classList) {
      modal.classList.add("modal-open");
    }
    modal.style.display = "grid";
    renderChangeExerciseModalContents();

    setTimeout(function () {
      var search = document.querySelector("#change-library-search");

      if (search) {
        search.focus();
      }
    }, 0);
  }

  function renderChangeExerciseModalContents() {
    var session = getActiveSession();
    var modal = ensureChangeExerciseModal();
    var current = document.querySelector("#change-library-current");
    var search = document.querySelector("#change-library-search");
    var tabs = document.querySelector("#change-library-tabs");
    var optionsContainer = document.querySelector("#change-library-options");
    var exerciseIndex = changeExerciseModalState.exerciseIndex;
    var exercise = session && session.exercises ? session.exercises[exerciseIndex] : null;
    var options;

    if (!exercise || !modal || !optionsContainer) {
      return;
    }

    options = getChangeExerciseOptions(exercise);

    if (
      changeExerciseModalState.selectedExerciseId &&
      !options.some(function (option) {
        return option.id === changeExerciseModalState.selectedExerciseId;
      })
    ) {
      changeExerciseModalState.selectedExerciseId = "";
    }

    if (!changeExerciseModalState.selectedExerciseId && options.length) {
      changeExerciseModalState.selectedExerciseId = options[0].id;
    }

    if (current) {
      current.textContent = "Current: " + exercise.name + " / " + getMuscleLabel(exercise.primaryMuscle);
    }

    if (search && document.activeElement !== search) {
      search.value = changeExerciseModalState.search;
    }

    if (tabs) {
      tabs.innerHTML = getChangeCategoryTabsMarkup(exercise);
    }

    optionsContainer.innerHTML = options.length
      ? options.map(getChangeExerciseOptionMarkup).join("")
      : '<p class="subtle change-library-empty">No library movements match this filter.</p>';
  }

  function handleChangeExerciseSearch(event) {
    if (!event.target || event.target.id !== "change-library-search") {
      return;
    }

    changeExerciseModalState.search = event.target.value || "";
    renderChangeExerciseModalContents();
  }

  function runChangeExerciseModalAction(action, value) {
    var session = getActiveSession();
    var exercise = session && session.exercises ? session.exercises[changeExerciseModalState.exerciseIndex] : null;
    var options;

    if (action === "cancelExerciseChange") {
      closeChangeExerciseModal();
      return;
    }

    if (!exercise) {
      return;
    }

    if (action === "changeCategory") {
      changeExerciseModalState.category = value || "All";
      changeExerciseModalState.selectedExerciseId = "";
      options = getChangeExerciseOptions(exercise);
      changeExerciseModalState.selectedExerciseId = options.length ? options[0].id : "";
      renderChangeExerciseModalContents();
      return;
    }

    if (action === "selectChangeExercise") {
      changeExerciseModalState.selectedExerciseId = value;
      renderChangeExerciseModalContents();
      return;
    }

    if (action === "applyExerciseChange") {
      applyLibraryExerciseChange();
    }
  }

  function handleChangeExerciseModalEvent(event) {
    var target = event.target;
    var button = getClosest(target, "[data-cancel-exercise-change], [data-apply-exercise-change], [data-change-category], [data-select-change-exercise]");
    var action;
    var value;
    var key;
    var now;

    if (!button) {
      return;
    }

    if (button.dataset.cancelExerciseChange !== undefined) {
      action = "cancelExerciseChange";
      value = button.dataset.cancelExerciseChange;
    } else if (button.dataset.applyExerciseChange !== undefined) {
      action = "applyExerciseChange";
      value = button.dataset.applyExerciseChange;
    } else if (button.dataset.changeCategory !== undefined) {
      action = "changeCategory";
      value = button.dataset.changeCategory;
    } else {
      action = "selectChangeExercise";
      value = button.dataset.selectChangeExercise;
    }

    key = action + ":" + value;
    now = Date.now();

    if (key === changeExerciseModalActionKey && now - changeExerciseModalActionAt < 350) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    changeExerciseModalActionKey = key;
    changeExerciseModalActionAt = now;
    event.preventDefault();
    event.stopPropagation();
    runChangeExerciseModalAction(action, value);
  }

  function bindChangeExerciseModalEvents(modal) {
    if (!modal || modal.dataset.bound === "true") {
      return;
    }

    if (window.PointerEvent) {
      modal.addEventListener("pointerup", handleChangeExerciseModalEvent);
    } else {
      modal.addEventListener("touchend", handleChangeExerciseModalEvent);
      modal.addEventListener("click", handleChangeExerciseModalEvent);
    }

    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        event.preventDefault();
        closeChangeExerciseModal();
      }
    });

    modal.dataset.bound = "true";

    if (!changeExerciseModalInputBound) {
      document.addEventListener("input", handleChangeExerciseSearch);
      changeExerciseModalInputBound = true;
    }
  }

  function applyLibraryExerciseChange() {
    var session = getActiveSession();
    var exerciseIndex = changeExerciseModalState.exerciseIndex;
    var exercise = session && session.exercises ? session.exercises[exerciseIndex] : null;
    var state = window.TrainingStorage.getAppState();
    var replacement = changeExerciseModalState.selectedExerciseId
      ? getLibraryExerciseById(state, changeExerciseModalState.selectedExerciseId)
      : null;
    var status = document.querySelector("#workout-save-status");
    var originalExerciseId;
    var originalExerciseName;
    var originalPrimaryMuscle;

    if (!exercise || !replacement || isExerciseLocked(exercise)) {
      return;
    }

    originalExerciseId = exercise.substitution ? exercise.substitution.originalExerciseId : exercise.exerciseId;
    originalExerciseName = exercise.substitution ? exercise.substitution.originalExerciseName : exercise.name;
    originalPrimaryMuscle = exercise.substitution && exercise.substitution.originalPrimaryMuscle
      ? exercise.substitution.originalPrimaryMuscle
      : exercise.primaryMuscle;

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
      originalPrimaryMuscle: originalPrimaryMuscle,
      newExerciseId: replacement.id,
      newExerciseName: replacement.name,
      newPrimaryMuscle: replacement.primaryMuscle,
      reason: "Changed during workout",
      notes: "",
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

  function saveExerciseChange() {
    applyLibraryExerciseChange();
  }

  function optionMarkup(options, selected) {
    return options.map(function (option) {
      var selectedAttribute = option === selected ? " selected" : "";

      return '<option value="' + escapeHtml(option) + '"' + selectedAttribute + ">" + escapeHtml(option) + "</option>";
    }).join("");
  }

  function getPerformanceFeelValue(item) {
    if (item.performanceFeel) {
      return item.performanceFeel;
    }

    if (item.performance === "up") {
      return "better than expected";
    }

    if (item.performance === "down") {
      return "worse than expected";
    }

    if (item.performance === "same") {
      return "as expected";
    }

    return "hard to judge";
  }

  function mapPerformanceFeelToSignal(value) {
    if (value === "better than expected") {
      return "up";
    }

    if (value === "worse than expected") {
      return "down";
    }

    return "same";
  }

  function renderFeedbackForm() {
    var session = getActiveSession();
    var status = document.querySelector("#workout-save-status");
    var feedbackSection = document.querySelector("#post-workout-feedback");
    var feedbackTitle = feedbackSection ? feedbackSection.querySelector("h2") : null;
    var musclesContainer = document.querySelector("#feedback-muscles");
    var overallContainer = document.querySelector("#feedback-overall");
    var submitButton = document.querySelector("#submit-feedback-button");
    var feedback = window.TrainingFeedback.buildDefaultFeedback(session);

    if (!feedbackSection || !musclesContainer || !overallContainer) {
      return;
    }

    session.feedback = session.feedback || feedback;
    window.TrainingStorage.saveActiveSession(session);

    if (feedbackTitle) {
      feedbackTitle.textContent = "Post-Workout Check-In";
    }

    musclesContainer.innerHTML = session.muscles.map(function (muscle) {
      var item = session.feedback.muscles[muscle] || feedback.muscles[muscle];

      return (
        '<article class="feedback-card" data-feedback-muscle="' + escapeHtml(muscle) + '">' +
          '<h3>' + escapeHtml(getMuscleLabel(muscle)) + '</h3>' +
          '<div class="form-grid workout-checkin-grid">' +
            '<label>Pump<select data-feedback-field="pump">' + optionMarkup(["poor", "okay", "good", "excellent"], item.pump) + '</select></label>' +
            '<label>Soreness<select data-feedback-field="soreness">' + optionMarkup(["none", "mild", "moderate", "severe"], item.soreness) + '</select></label>' +
            '<label>Performance feel<select data-feedback-field="performanceFeel">' + optionMarkup(["better than expected", "as expected", "worse than expected", "hard to judge"], getPerformanceFeelValue(item)) + '</select></label>' +
            '<label>Joint discomfort<select data-feedback-field="jointDiscomfort">' + optionMarkup(["none", "mild", "bad"], item.jointDiscomfort) + '</select></label>' +
          '</div>' +
          '<label>Notes<textarea data-feedback-field="notes" rows="3">' + escapeHtml(item.notes || "") + '</textarea></label>' +
        '</article>'
      );
    }).join("");

    overallContainer.innerHTML = (
      '<article class="feedback-card feedback-card-compact">' +
        '<h3>Overall</h3>' +
        '<label>Overall fatigue<select id="feedback-fatigue">' + optionMarkup(["low", "moderate", "high"], session.feedback.overall.fatigue) + '</select></label>' +
        '<label>Session notes<textarea id="feedback-session-notes" rows="3">' + escapeHtml(session.feedback.overall.notes || "") + '</textarea></label>' +
      '</article>'
    );

    feedbackSection.hidden = false;

    if (status) {
      status.textContent = "Review the check-in, then Save Workout to complete and write history.";
    }

    if (submitButton) {
      submitButton.textContent = "Save Workout";
      submitButton.onclick = submitFeedback;
      if (submitButton.focus) {
        submitButton.focus({ preventScroll: true });
      }
    }
  }

  function collectFeedback() {
    var session = getActiveSession();
    var feedback = window.TrainingFeedback.buildDefaultFeedback(session);
    var muscleCards = document.querySelectorAll("[data-feedback-muscle]");
    var fatigue = document.querySelector("#feedback-fatigue");
    var notes = document.querySelector("#feedback-session-notes");

    muscleCards.forEach(function (card) {
      var muscle = card.dataset.feedbackMuscle;
      var performanceFeel = card.querySelector('[data-feedback-field="performanceFeel"]').value;

      feedback.muscles[muscle] = {
        pump: card.querySelector('[data-feedback-field="pump"]').value,
        soreness: card.querySelector('[data-feedback-field="soreness"]').value,
        performance: mapPerformanceFeelToSignal(performanceFeel),
        performanceFeel: performanceFeel,
        jointDiscomfort: card.querySelector('[data-feedback-field="jointDiscomfort"]').value,
        notes: card.querySelector('[data-feedback-field="notes"]').value
      };
    });

    feedback.overall = {
      fatigue: fatigue ? fatigue.value : "moderate",
      sleepRecovery: "not logged post-workout",
      notes: notes ? notes.value : ""
    };

    feedback.volumeSignals = window.TrainingFeedback.calculateVolumeSignals(feedback);

    return feedback;
  }

  function submitFeedback() {
    var session = getActiveSession();
    var status = document.querySelector("#feedback-save-status");
    var workoutStatus = document.querySelector("#workout-save-status");
    var submitButton = document.querySelector("#submit-feedback-button");

    if (!session) {
      if (status) {
        status.textContent = "No active workout to save.";
      }
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Saving...";
    }

    session.status = "completed";
    session.completedAt = new Date().toISOString();
    session.feedback = collectFeedback();

    window.TrainingStorage.addCompletedWorkout(session);
    window.TrainingStorage.addVolumeRecommendation(
      window.TrainingFeedback.generateVolumeRecommendations(session, window.TrainingStorage.getAppState())
    );
    window.TrainingStorage.markPlannedSessionComplete(session.templateId);
    window.TrainingStorage.clearActiveSession();
    window.TrainingStorage.clearTodayDraft();

    if (status) {
      status.innerHTML = 'Workout saved. <a href="history.html">View history</a>.';
    }

    if (workoutStatus) {
      workoutStatus.textContent = "Workout saved.";
    }

    if (submitButton) {
      submitButton.textContent = "Workout Saved";
    }
  }

  function getWorkoutAction(target) {
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
        return {
          name: selectors[index],
          value: button.dataset[selectors[index]],
          key: selectors[index] + ":" + button.dataset[selectors[index]]
        };
      }
    }

    return null;
  }

  function runWorkoutAction(action) {
    var parts;

    if (!action) {
      return;
    }

    if (action.name === "saveSet") {
      parts = action.value.split(":");
      saveSet(Number(parts[0]), Number(parts[1]));
      return;
    }

    if (action.name === "addSet") {
      addSet(Number(action.value));
      return;
    }

    if (action.name === "removeSet") {
      parts = action.value.split(":");
      removeSet(Number(parts[0]), Number(parts[1]));
      return;
    }

    if (action.name === "skipSet") {
      parts = action.value.split(":");
      skipSet(Number(parts[0]), Number(parts[1]));
      return;
    }

    if (action.name === "unskipSet") {
      parts = action.value.split(":");
      unskipSet(Number(parts[0]), Number(parts[1]));
      return;
    }

    if (action.name === "completeExercise") {
      completeExercise(Number(action.value));
      return;
    }

    if (action.name === "skipExercise") {
      openSkipExerciseModal(Number(action.value));
      return;
    }

    if (action.name === "unskipExercise") {
      unskipExercise(Number(action.value));
      return;
    }

    if (action.name === "unlockExercise") {
      unlockExercise(Number(action.value));
      return;
    }

    if (action.name === "changeExercise") {
      openChangeExerciseModal(Number(action.value));
    }
  }

  function handleWorkoutActionEvent(event) {
    var now = Date.now();
    var action = getWorkoutAction(event.target);

    if (!action) {
      return;
    }

    if (action.key === lastWorkoutActionKey && now - lastWorkoutActionAt < 350) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    lastWorkoutActionAt = now;
    lastWorkoutActionKey = action.key;
    event.preventDefault();
    event.stopPropagation();
    runWorkoutAction(action);
  }

  function bindWorkoutActionEvents(container) {
    if (window.PointerEvent) {
      container.addEventListener("pointerup", handleWorkoutActionEvent);
      return;
    }

    container.addEventListener("touchend", handleWorkoutActionEvent);
    container.addEventListener("click", handleWorkoutActionEvent);
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
    var saveSkipButton = document.querySelector("#save-skip-exercise-button");
    var cancelSkipButton = document.querySelector("#cancel-skip-exercise-button");

    renderWorkoutLogger();

    if (container) {
      container.addEventListener("input", handleWorkoutInput);
      container.addEventListener("change", handleWorkoutInput);
      container.addEventListener("keydown", handleWorkoutKeydown);
    }

    if (container && !workoutClickBound) {
      bindWorkoutActionEvents(container);
      workoutClickBound = true;
    }

    if (finishButton) {
      finishButton.textContent = "Review & Finish";
      finishButton.addEventListener("click", renderFeedbackForm);
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
