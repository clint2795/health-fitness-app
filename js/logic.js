(function () {
  var sessionTemplates = [
    {
      title: "Side Delts + Upper Chest + Triceps",
      muscles: ["sideDelts", "upperChest", "triceps"]
    },
    {
      title: "Back Width + Biceps + Rear Delts",
      muscles: ["backWidth", "biceps", "rearDelts"]
    },
    {
      title: "Legs Maintenance + Side Delts",
      muscles: ["legs", "sideDelts"]
    },
    {
      title: "Upper Chest + Arms",
      muscles: ["upperChest", "biceps", "triceps"]
    },
    {
      title: "Back Width + Side Delts + Biceps",
      muscles: ["backWidth", "sideDelts", "biceps"]
    }
  ];

  var muscleAliases = {
    sideDelts: ["sideDelts", "Side delts"],
    upperChest: ["upperChest", "Upper chest"],
    chest: ["chest", "Chest"],
    biceps: ["biceps", "Biceps"],
    triceps: ["triceps", "Triceps"],
    backWidth: ["backWidth", "Back width"],
    rearDelts: ["rearDelts", "Rear delts"],
    legs: ["legs", "Legs"],
    shoulderPrep: ["shoulderPrep", "Shoulder Prep / Warm-Up"]
  };

  var muscleLabels = {
    sideDelts: "Side delts",
    upperChest: "Upper chest",
    chest: "Chest",
    biceps: "Biceps",
    triceps: "Triceps",
    backWidth: "Back width",
    rearDelts: "Rear delts",
    legs: "Legs",
    shoulderPrep: "Shoulder Prep / Warm-Up"
  };

  var planRules = {
    sideDelts: { cap: 8, count: 2, minimum: 2 },
    upperChest: { cap: 8, count: 2, minimum: 2 },
    chest: { cap: 8, count: 1, minimum: 2 },
    biceps: { cap: 6, count: 1, minimum: 2 },
    triceps: { cap: 6, count: 1, minimum: 2 },
    backWidth: { cap: 8, count: 2, minimum: 3 },
    rearDelts: { cap: 5, count: 1, minimum: 2 },
    legs: { cap: 8, count: 3, minimum: 4 }
  };

  var exerciseNotes = {
    sideDelts: "Shoulder-friendly delt work.",
    upperChest: "Chest pressing with shoulder comfort as the limiter.",
    chest: "Chest pressing option currently tolerated better than incline work.",
    biceps: "Controlled arm work without body swing.",
    triceps: "Joint-friendly triceps work.",
    backWidth: "Lat-focused work with low lower-back demand.",
    rearDelts: "Rear delt support work.",
    legs: "Machine-based lower-body work to limit lower-back cost."
  };

  function getState() {
    return window.TrainingStorage ? window.TrainingStorage.getAppState() : window.TrainingData;
  }

  function getTodayDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function getRirTarget(state) {
    var week = Number(state.mesocycleSettings.currentWeek);
    var target = state.rirTargets.find(function (item) {
      return Number(item.week) === week;
    });

    return target ? target.target : "Not set";
  }

  function getTemplateIndex() {
    var history = window.TrainingStorage ? window.TrainingStorage.getItem("workoutHistory", []) : [];

    if (history.length > 0) {
      return history.length % sessionTemplates.length;
    }

    return new Date().getDay() % sessionTemplates.length;
  }

  function getRecentCutoff(hours) {
    return new Date(Date.now() - hours * 60 * 60 * 1000);
  }

  function normalizeMuscle(muscle) {
    var keys = Object.keys(muscleAliases);
    var matched = keys.find(function (key) {
      return muscleAliases[key].indexOf(muscle) !== -1;
    });

    return matched || muscle;
  }

  function getMuscleLabel(muscle) {
    return muscleLabels[normalizeMuscle(muscle)] || muscle;
  }

  function isExerciseForMuscle(exercise, muscle) {
    return normalizeMuscle(exercise.primaryMuscle) === muscle;
  }

  function statusRank(status) {
    if (status === "preferred") return 1;
    if (status === "conditional") return 2;
    if (status === "neutral") return 3;
    if (status === "prep") return 4;
    return 5;
  }

  function passesInjuryRules(exercise, state) {
    if (exercise.status === "avoid") {
      return false;
    }

    if (state.injurySettings.shoulderFriendlyMode && exercise.shoulderFriendly === false) {
      return false;
    }

    if (state.injurySettings.lowerBackProtection && exercise.lowerBackFriendly === false) {
      return false;
    }

    if (state.injurySettings.avoidRiskyOverheadPressing && exercise.id === "high-incline-barbell-press") {
      return false;
    }

    if (exercise.id === "upright-row") {
      return false;
    }

    if (state.injurySettings.lowerBackProtection && (exercise.id === "barbell-row" || exercise.id === "romanian-deadlift")) {
      return false;
    }

    return true;
  }

  function compareExercises(a, b) {
    return statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name);
  }

  function getCandidateExercises(state, muscle) {
    var candidates = state.exerciseLibrary
      .filter(function (exercise) {
        return isExerciseForMuscle(exercise, muscle) && exercise.status !== "prep";
      })
      .filter(function (exercise) {
        return passesInjuryRules(exercise, state);
      })
      .sort(compareExercises);

    if (muscle === "upperChest") {
      var flatPress = state.exerciseLibrary.find(function (exercise) {
        return exercise.id === "flat-dumbbell-press" && passesInjuryRules(exercise, state);
      });

      if (flatPress && candidates.every(function (exercise) { return exercise.id !== flatPress.id; })) {
        candidates.push(flatPress);
      }
    }

    if (muscle === "sideDelts" && state.injurySettings.shoulderFriendlyMode) {
      var safeFirst = candidates.filter(function (exercise) {
        return exercise.id !== "smith-machine-upright-row";
      });
      var conditionalSmith = candidates.filter(function (exercise) {
        return exercise.id === "smith-machine-upright-row";
      });

      candidates = safeFirst.concat(conditionalSmith);
    }

    return candidates;
  }

  function createPlannedExercise(exercise, muscle, sets, targetRir) {
    var notes = exerciseNotes[muscle] || exercise.notes;

    if (exercise.id === "smith-machine-upright-row") {
      notes = "Conditional variety only. Keep it light/moderate, controlled, and pain-free.";
    }

    if (exercise.id === "flat-dumbbell-press") {
      notes = "Currently more comfortable than incline pressing. Avoid excessive bottom stretch.";
    }

    return {
      exerciseId: exercise.id,
      name: exercise.name,
      primaryMuscle: muscle,
      plannedSets: sets,
      repRange: exercise.repRange,
      targetRir: targetRir,
      status: exercise.status,
      notes: notes,
      loggedSets: []
    };
  }

  function distributeSets(totalSets, count) {
    var sets = [];
    var base = Math.floor(totalSets / count);
    var remainder = totalSets % count;
    var index;

    for (index = 0; index < count; index += 1) {
      sets.push(base + (index < remainder ? 1 : 0));
    }

    return sets.filter(function (setCount) {
      return setCount > 0;
    });
  }

  function selectExercisesForMuscle(state, muscle, targetRir, plannedSets) {
    var rule = planRules[muscle] || { cap: 6, count: 1, minimum: 2 };
    var candidates = getCandidateExercises(state, muscle);
    var exerciseCount = Math.max(1, Math.min(rule.count, candidates.length, Math.ceil(plannedSets / 4)));
    var selected = candidates.slice(0, exerciseCount);
    var setDistribution = distributeSets(plannedSets, selected.length);

    return selected.map(function (exercise, index) {
      return createPlannedExercise(exercise, muscle, setDistribution[index], targetRir);
    });
  }

  function shouldIncludePrep(template) {
    return template.muscles.some(function (muscle) {
      return ["sideDelts", "upperChest", "chest", "backWidth", "biceps", "triceps", "rearDelts"].indexOf(muscle) !== -1;
    });
  }

  function createPrepWork(state, template) {
    var deadHang = state.exerciseLibrary.find(function (exercise) {
      return exercise.id === "dead-hang";
    });

    if (!deadHang || !shouldIncludePrep(template)) {
      return [];
    }

    return [
      {
        exerciseId: deadHang.id,
        name: deadHang.name,
        primaryMuscle: "shoulderPrep",
        plannedSets: 2,
        repRange: deadHang.repRange,
        targetRir: null,
        status: deadHang.status,
        notes: "Shoulder prep. Do not force painful range. Not counted as working sets.",
        loggedSets: []
      }
    ];
  }

  function capSessionVolume(exercises) {
    var totalSets = exercises.reduce(function (total, exercise) {
      return total + exercise.plannedSets;
    }, 0);

    while (totalSets > 20 && exercises.length > 0) {
      var last = exercises[exercises.length - 1];

      if (last.plannedSets > 2) {
        last.plannedSets -= 1;
        totalSets -= 1;
      } else {
        exercises.pop();
        totalSets -= last.plannedSets;
      }
    }

    return exercises;
  }

  function getCompletedDate(session) {
    return new Date(session.completedAt || session.date);
  }

  function countExerciseSets(exercise) {
    if (Array.isArray(exercise.loggedSets)) {
      var logged = exercise.loggedSets.filter(function (set) {
        return set && (set.weightKg || set.weight || set.reps || set.actualRir);
      }).length;

      if (logged > 0) {
        return logged;
      }
    }

    return Number(exercise.plannedSets) || 0;
  }

  function calculateWeeklyVolume(history, weekStartDate) {
    var cutoff = weekStartDate ? new Date(weekStartDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return (history || []).reduce(function (totals, session) {
      if (session.status !== "completed" || getCompletedDate(session) < cutoff) {
        return totals;
      }

      (session.exercises || []).forEach(function (exercise) {
        var muscle = normalizeMuscle(exercise.primaryMuscle);

        if (muscle === "shoulderPrep") {
          return;
        }

        totals[muscle] = (totals[muscle] || 0) + countExerciseSets(exercise);
      });

      return totals;
    }, {});
  }

  function calculateRemainingWeeklySets(state, weeklyVolume) {
    return (state.musclePriorities || []).reduce(function (remaining, muscle) {
      var id = normalizeMuscle(muscle.id);
      var target = Number(muscle.startingSets) || 0;
      var completed = Number(weeklyVolume[id]) || 0;

      remaining[id] = {
        target: target,
        completed: completed,
        remaining: Math.max(0, target - completed),
        priority: muscle.priority,
        goal: muscle.goal,
        maxWeeklySets: Number(muscle.maxSets) || target
      };

      return remaining;
    }, {});
  }

  function getRecentlyTrainedMuscles(history, hours) {
    var cutoff = getRecentCutoff(hours);

    return (history || []).reduce(function (trained, session) {
      if (session.status !== "completed" || getCompletedDate(session) < cutoff) {
        return trained;
      }

      (session.exercises || []).forEach(function (exercise) {
        var muscle = normalizeMuscle(exercise.primaryMuscle);

        if (muscle !== "shoulderPrep") {
          trained[muscle] = true;
        }
      });

      return trained;
    }, {});
  }

  function priorityScore(priority) {
    if (priority === "very high") return 10;
    if (priority === "high") return 7;
    if (priority === "medium") return 3;
    return 1;
  }

  function scoreMuscle(muscle, remainingInfo, recentlyTrained) {
    var info = remainingInfo[muscle];
    var score;

    if (!info) {
      return -100;
    }

    score = priorityScore(info.priority) + info.remaining * 3;

    if (info.goal === "grow") {
      score += 2;
    }

    if (info.goal && info.goal.indexOf("maintain") !== -1) {
      score -= 3;
    }

    if (info.remaining === 0) {
      score -= 12;
    }

    if (recentlyTrained[muscle]) {
      score -= ["sideDelts", "biceps", "triceps"].indexOf(muscle) !== -1 ? 3 : 8;
    }

    if (muscle === "sideDelts") {
      score += 3;
    }

    if (muscle === "legs" && info.remaining < 4) {
      score -= 4;
    }

    return score;
  }

  function findBestTemplate(scoredMuscles) {
    var bestTemplate = sessionTemplates[0];
    var bestScore = -Infinity;

    sessionTemplates.forEach(function (template) {
      var score = template.muscles.reduce(function (total, muscle) {
        var scored = scoredMuscles.find(function (item) {
          return item.muscle === muscle;
        });

        return total + (scored ? scored.score : -10);
      }, 0);

      if (score > bestScore) {
        bestScore = score;
        bestTemplate = template;
      }
    });

    return bestTemplate;
  }

  function selectMusclesForToday(remainingInfo, history) {
    var recentlyTrained = getRecentlyTrainedMuscles(history, 24);
    var scored = Object.keys(remainingInfo).map(function (muscle) {
      return {
        muscle: muscle,
        score: scoreMuscle(muscle, remainingInfo, recentlyTrained)
      };
    }).sort(function (a, b) {
      return b.score - a.score;
    });
    var selected = scored.filter(function (item) {
      return item.score > 0 && remainingInfo[item.muscle].remaining > 0;
    }).slice(0, 4).map(function (item) {
      return item.muscle;
    });
    var bestTemplate;

    if (selected.length < 2) {
      bestTemplate = findBestTemplate(scored);
      selected = bestTemplate.muscles.filter(function (muscle) {
        return remainingInfo[muscle] && remainingInfo[muscle].remaining > 0;
      });
    }

    if (selected.indexOf("backWidth") !== -1 && selected.indexOf("biceps") === -1 && remainingInfo.biceps && remainingInfo.biceps.remaining > 0) {
      selected.push("biceps");
    }

    if ((selected.indexOf("upperChest") !== -1 || selected.indexOf("chest") !== -1) && selected.indexOf("triceps") === -1 && remainingInfo.triceps && remainingInfo.triceps.remaining > 0) {
      selected.push("triceps");
    }

    if (selected.indexOf("legs") !== -1 && selected.length > 3) {
      selected = selected.filter(function (muscle) {
        return muscle !== "rearDelts";
      });
    }

    return selected.slice(0, 4);
  }

  function getPlannedSetsForMuscle(muscle, remaining) {
    var rule = planRules[muscle] || { cap: 6, minimum: 2 };

    if (remaining <= 0) {
      return 0;
    }

    return Math.max(rule.minimum, Math.min(rule.cap, remaining));
  }

  function balancePlannedVolume(planned) {
    var total = planned.reduce(function (sum, item) {
      return sum + item.sets;
    }, 0);

    while (total > 20 && planned.length > 0) {
      var candidate = planned.slice().sort(function (a, b) {
        return b.sets - a.sets;
      })[0];

      if (candidate.sets <= 2) {
        break;
      }

      candidate.sets -= 1;
      total -= 1;
    }

    return planned;
  }

  function getSessionTitle(muscles) {
    var label = muscles.map(getMuscleLabel).join(" + ");

    return label || sessionTemplates[getTemplateIndex()].title;
  }

  function getWhyText(muscles, remainingInfo, state) {
    var lead = muscles.slice(0, 2).map(getMuscleLabel).join(" and ");
    var notes = [];

    if (lead) {
      notes.push(lead + " have the strongest remaining priority work this week.");
    }

    if (muscles.indexOf("triceps") !== -1 && (muscles.indexOf("upperChest") !== -1 || muscles.indexOf("chest") !== -1)) {
      notes.push("Triceps pair well with pressing.");
    }

    if (muscles.indexOf("biceps") !== -1 && muscles.indexOf("backWidth") !== -1) {
      notes.push("Biceps pair well with back width work.");
    }

    if (state.injurySettings.lowerBackProtection) {
      notes.push("Lower-back protection is active.");
    }

    return notes.join(" ");
  }

  function generateTodaySession(state) {
    state = state || getState();

    var history = window.TrainingStorage ? window.TrainingStorage.getWorkoutHistory() : [];
    var weeklyVolume = calculateWeeklyVolume(history);
    var remainingInfo = calculateRemainingWeeklySets(state, weeklyVolume);
    var selectedMuscles = selectMusclesForToday(remainingInfo, history);
    var targetRir = getRirTarget(state);
    var exercises = [];
    var planned = selectedMuscles.map(function (muscle) {
      return {
        muscle: muscle,
        sets: getPlannedSetsForMuscle(muscle, remainingInfo[muscle].remaining)
      };
    }).filter(function (item) {
      return item.sets > 0;
    });

    planned = balancePlannedVolume(planned);

    planned.forEach(function (item) {
      exercises = exercises.concat(selectExercisesForMuscle(state, item.muscle, targetRir, item.sets));
    });

    exercises = capSessionVolume(exercises);

    return {
      id: "session-" + getTodayDate() + "-" + selectedMuscles.join("-"),
      date: getTodayDate(),
      title: getSessionTitle(planned.map(function (item) { return item.muscle; })),
      mesocycleWeek: Number(state.mesocycleSettings.currentWeek),
      targetRir: targetRir,
      muscles: planned.map(function (item) { return item.muscle; }),
      status: "planned",
      prep: createPrepWork(state, { muscles: planned.map(function (item) { return item.muscle; }) }),
      exercises: exercises,
      weeklyVolume: weeklyVolume,
      remainingWeeklySets: remainingInfo,
      why: getWhyText(planned.map(function (item) { return item.muscle; }), remainingInfo, state)
    };
  }

  function getTodaySession() {
    var session = generateTodaySession(getState());

    return {
      title: session.title,
      weekLabel: "Week " + session.mesocycleWeek,
      targetRir: session.targetRir,
      focus: session.muscles.map(getMuscleLabel).join(", "),
      exercises: session.exercises,
      session: session
    };
  }

  function getRecoveryWarnings() {
    var state = getState();
    var warnings = [];

    if (state.injurySettings.shoulderFriendlyMode) {
      warnings.push("Shoulder-friendly mode active.");
    }

    if (state.injurySettings.lowerBackProtection) {
      warnings.push("Lower-back protection active.");
    }

    return warnings.length ? warnings : ["No recovery warnings logged yet."];
  }

  function getWeeklySetPlaceholders() {
    var state = getState();

    return state.musclePriorities.map(function (muscle) {
      return {
        muscle: muscle.name,
        sets: muscle.startingSets
      };
    });
  }

  window.TrainingLogic = {
    generateTodaySession: generateTodaySession,
    getTodaySession: getTodaySession,
    getRecoveryWarnings: getRecoveryWarnings,
    getWeeklySetPlaceholders: getWeeklySetPlaceholders,
    getMuscleLabel: getMuscleLabel,
    calculateWeeklyVolume: calculateWeeklyVolume,
    calculateRemainingWeeklySets: calculateRemainingWeeklySets
  };
})();
