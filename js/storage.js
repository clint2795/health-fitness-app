(function () {
  var prefix = "trainingPlanner:";
  var appStateKey = "appState";
  var activeSessionKey = "activeSession";
  var todayDraftKey = "todayDraft";
  var volumeRecommendationsKey = "volumeRecommendations";
  var lastRepairKey = "lastStateRepair";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getDefaultState() {
    var data = window.TrainingData || {};

    return {
      userProfile: clone(data.userProfile || {}),
      mesocycleSettings: clone(data.mesocycleSettings || {}),
      rirTargets: clone(data.rirTargets || []),
      musclePriorities: clone(data.musclePriorities || []),
      injurySettings: clone(data.injurySettings || {}),
      exerciseLibrary: clone(data.exerciseLibrary || []),
      exercisePreferences: clone(data.exercisePreferences || {}),
      goalPresets: clone(data.goalPresets || []),
      sessionTemplates: clone(data.sessionTemplates || []),
      completedWorkoutHistory: clone(data.completedWorkoutHistory || []),
      plannedWeek: clone(data.plannedWeek || {}),
      nonHypertrophyTraining: clone(data.nonHypertrophyTraining || {}),
      recoveryResponseFields: clone(data.recoveryResponseFields || {}),
      activeGoalPreset: data.activeGoalPreset || "",
      selectedSessionTemplate: data.selectedSessionTemplate || ""
    };
  }

  function mergeById(defaultItems, savedItems) {
    var savedById = {};

    (savedItems || []).forEach(function (item) {
      savedById[item.id] = item;
    });

    return (defaultItems || []).map(function (item) {
      return Object.assign({}, item, savedById[item.id] || {});
    });
  }

  function getValidSessionTemplateId(defaultState, savedState) {
    var savedId = savedState.selectedSessionTemplate;
    var defaultId = defaultState.selectedSessionTemplate;
    var templates = defaultState.sessionTemplates || [];

    if (savedId && templates.some(function (template) { return template.id === savedId; })) {
      return savedId;
    }

    return defaultId;
  }

  function getTodayDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function getWeekStartDate() {
    var date = new Date();
    var day = date.getDay();
    var diff = day === 0 ? -6 : 1 - day;

    date.setDate(date.getDate() + diff);
    return date.toISOString().slice(0, 10);
  }

  function buildDefaultPlannedSessions(defaultState, savedPlanned) {
    var completedIds = savedPlanned.completedSessionTemplateIds || [];
    var currentIndex = Number(savedPlanned.currentWeekSessionIndex || 1);

    return (defaultState.sessionTemplates || []).map(function (template, index) {
      var sessionNumber = index + 1;
      var status = template.status === "optional" ? "optional" : "planned";

      if (completedIds.indexOf(template.id) !== -1) {
        status = "completed";
      } else if (sessionNumber === currentIndex) {
        status = "current";
      }

      return {
        sessionNumber: sessionNumber,
        templateId: template.id,
        name: template.name,
        status: status,
        plannedDate: null,
        completedAt: null,
        skippedAt: null
      };
    });
  }

  function getSeedCompletedTemplateIds(defaultState) {
    return (defaultState.completedWorkoutHistory || []).map(function (session) {
      return session.templateId;
    }).filter(Boolean);
  }

  function getCompletedSession2(history) {
    return (history || []).find(function (session) {
      return session &&
        session.status === "completed" &&
        session.date === "2026-06-09" &&
        (session.templateId === "session-2-back-width-biceps-rear-delts" || Number(session.sessionNumber) === 2);
    }) || null;
  }

  function isPlannedSession2Completed(plannedWeek) {
    var sessions = (plannedWeek || {}).sessions || [];
    var session2 = sessions.find(function (session) {
      return session.templateId === "session-2-back-width-biceps-rear-delts" || Number(session.sessionNumber) === 2;
    });

    return Boolean(session2 && session2.status === "completed");
  }

  function normalizeText(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function hasSameMuscleFocus(a, b) {
    var aMuscles = (a && a.muscles) || [];
    var bMuscles = (b && b.muscles) || [];

    if (!aMuscles.length || !bMuscles.length) {
      return false;
    }

    return ["backWidth", "biceps", "rearDelts"].every(function (muscle) {
      return aMuscles.indexOf(muscle) !== -1 && bMuscles.indexOf(muscle) !== -1;
    });
  }

  function sessionLooksLikeSession2(session, completedSession2) {
    var title = normalizeText(session && (session.title || session.name));
    var focus = normalizeText(session && session.focus);
    var completedTitle = normalizeText(completedSession2 && completedSession2.title);

    if (!session || !completedSession2) {
      return false;
    }

    if (session.templateId === "session-2-back-width-biceps-rear-delts" || Number(session.sessionNumber) === 2) {
      return true;
    }

    if (completedTitle && title && title === completedTitle) {
      return true;
    }

    if (title.indexOf("session 2") !== -1 && title.indexOf("back width") !== -1) {
      return true;
    }

    if (focus.indexOf("back width") !== -1 && focus.indexOf("biceps") !== -1 && focus.indexOf("rear delts") !== -1) {
      return true;
    }

    return session.date === completedSession2.date && hasSameMuscleFocus(session, completedSession2);
  }

  function getDraftSession(draft) {
    return draft && draft.session ? draft.session : draft;
  }

  function advancePlannedWeekPastSession2(state) {
    var plannedWeek = state.plannedWeek || {};
    var sessions = plannedWeek.sessions || [];
    var session3 = sessions.find(function (session) {
      return session.templateId === "session-3-legs-maintenance-side-delts" || Number(session.sessionNumber) === 3;
    });

    sessions.forEach(function (session) {
      if (session.templateId === "session-2-back-width-biceps-rear-delts" || Number(session.sessionNumber) === 2) {
        session.status = "completed";
        session.completedAt = session.completedAt || "2026-06-09T12:00:00.000Z";
      } else if (session.status === "current") {
        session.status = session.status === "optional" ? "optional" : "planned";
      }
    });

    if (session3 && session3.status !== "completed" && session3.status !== "skipped") {
      session3.status = "current";
      session3.plannedDate = session3.plannedDate || getTodayDate();
      plannedWeek.currentWeekSessionIndex = session3.sessionNumber;
      state.selectedSessionTemplate = session3.templateId;
    }

    plannedWeek.completedSessionTemplateIds = sessions.filter(function (session) {
      return session.status === "completed";
    }).map(function (session) {
      return session.templateId;
    }).filter(function (id, index, list) {
      return id && list.indexOf(id) === index;
    });
    plannedWeek.sessions = sessions;
    state.plannedWeek = plannedWeek;

    return state;
  }

  function mergePlannedWeek(defaultState, savedState) {
    var defaultPlanned = defaultState.plannedWeek || {};
    var savedPlanned = savedState.plannedWeek || {};
    var templateIds = (defaultState.sessionTemplates || []).map(function (template) { return template.id; });
    var sourceSessions = Array.isArray(savedPlanned.sessions) && savedPlanned.sessions.length
      ? savedPlanned.sessions
      : buildDefaultPlannedSessions(defaultState, Object.keys(savedPlanned).length ? savedPlanned : defaultPlanned);
    var sessions = (defaultState.sessionTemplates || []).map(function (template, index) {
      var savedSession = sourceSessions.find(function (session) {
        return session.templateId === template.id;
      }) || {};
      var fallbackStatus = template.status === "optional" ? "optional" : "planned";

      return {
        sessionNumber: index + 1,
        templateId: template.id,
        name: savedSession.name || template.name,
        status: savedSession.status || fallbackStatus,
        plannedDate: savedSession.plannedDate || null,
        completedAt: savedSession.completedAt || null,
        skippedAt: savedSession.skippedAt || null
      };
    });
    var current = sessions.find(function (session) {
      return session.status === "current";
    });
    var seedCompletedTemplateIds = getSeedCompletedTemplateIds(defaultState);
    var currentIndex;
    var completed;

    sessions.forEach(function (session) {
      if (seedCompletedTemplateIds.indexOf(session.templateId) !== -1) {
        session.status = "completed";
        session.completedAt = session.completedAt || (defaultState.completedWorkoutHistory.find(function (historySession) {
          return historySession.templateId === session.templateId;
        }) || {}).completedAt || null;
      }
    });

    current = sessions.find(function (session) {
      return session.status === "current";
    });

    if (!current) {
      current = sessions.find(function (session) {
        return session.status !== "completed" && session.status !== "skipped" && session.status !== "optional";
      });
      if (current) {
        current.status = "current";
      }
    }

    currentIndex = current ? current.sessionNumber : Number(savedPlanned.currentWeekSessionIndex || defaultPlanned.currentWeekSessionIndex || 1);
    if (current && !current.plannedDate) {
      current.plannedDate = getTodayDate();
    }
    completed = sessions.filter(function (session) {
      return session.status === "completed";
    }).map(function (session) {
      return session.templateId;
    });

    return {
      weekStartDate: savedPlanned.weekStartDate || defaultPlanned.weekStartDate || getWeekStartDate(),
      currentWeekNumber: Number(savedPlanned.currentWeekNumber || defaultPlanned.currentWeekNumber || 1),
      currentWeekSessionIndex: currentIndex,
      completedSessionTemplateIds: completed.filter(function (id, index, list) {
        return templateIds.indexOf(id) !== -1 && list.indexOf(id) === index;
      }),
      sessions: sessions
    };
  }

  function mergeAppState(defaultState, savedState) {
    savedState = savedState || {};

    return {
      userProfile: Object.assign({}, defaultState.userProfile, savedState.userProfile || {}),
      mesocycleSettings: Object.assign({}, defaultState.mesocycleSettings, savedState.mesocycleSettings || {}),
      rirTargets: savedState.rirTargets || defaultState.rirTargets,
      musclePriorities: mergeById(defaultState.musclePriorities, savedState.musclePriorities),
      injurySettings: Object.assign({}, defaultState.injurySettings, savedState.injurySettings || {}),
      exerciseLibrary: defaultState.exerciseLibrary,
      exercisePreferences: Object.assign({}, defaultState.exercisePreferences, savedState.exercisePreferences || {}),
      goalPresets: defaultState.goalPresets,
      sessionTemplates: defaultState.sessionTemplates,
      plannedWeek: mergePlannedWeek(defaultState, savedState),
      nonHypertrophyTraining: Object.assign({}, defaultState.nonHypertrophyTraining, savedState.nonHypertrophyTraining || {}),
      recoveryResponseFields: Object.assign({}, defaultState.recoveryResponseFields, savedState.recoveryResponseFields || {}),
      activeGoalPreset: savedState.activeGoalPreset || defaultState.activeGoalPreset,
      selectedSessionTemplate: getValidSessionTemplateId(defaultState, savedState)
    };
  }

  function getItem(key, fallback) {
    var rawValue = localStorage.getItem(prefix + key);

    if (!rawValue) {
      return fallback;
    }

    try {
      return JSON.parse(rawValue);
    } catch (error) {
      console.warn("Could not read stored value for", key, error);
      return fallback;
    }
  }

  function setItem(key, value) {
    localStorage.setItem(prefix + key, JSON.stringify(value));
  }

  function removeItem(key) {
    localStorage.removeItem(prefix + key);
  }

  function getSeedWorkoutHistory() {
    var data = window.TrainingData || {};

    return clone(data.completedWorkoutHistory || []);
  }

  function ensureSeedWorkoutHistory() {
    var seedHistory = getSeedWorkoutHistory();
    var history = getItem("workoutHistory", []);
    var changed = false;

    seedHistory.forEach(function (seedSession) {
      var exists = (history || []).some(function (session) {
        return session.id === seedSession.id;
      });

      if (!exists) {
        history.push(seedSession);
        changed = true;
      }
    });

    if (changed) {
      setItem("workoutHistory", history);
    }

    return history || [];
  }

  function clearCompletedSessionDrafts(defaultState) {
    var completedTemplateIds = getSeedCompletedTemplateIds(defaultState);
    var activeSession = getItem(activeSessionKey, null);
    var todayDraft = getItem(todayDraftKey, null);

    if (activeSession && completedTemplateIds.indexOf(activeSession.templateId) !== -1) {
      removeItem(activeSessionKey);
    }

    if (todayDraft && completedTemplateIds.indexOf(todayDraft.templateId || (todayDraft.session || {}).templateId) !== -1) {
      removeItem(todayDraftKey);
    }
  }

  function repairCompletedSession2State(defaultState) {
    var savedState = getItem(appStateKey, null) || {};
    var mergedState = mergeAppState(defaultState, savedState);
    var history = ensureSeedWorkoutHistory();
    var completedSession2 = getCompletedSession2(history);
    var activeSession = getItem(activeSessionKey, null);
    var todayDraft = getItem(todayDraftKey, null);
    var repair = {
      repairedAt: new Date().toISOString(),
      reason: "Session 2 was already completed in planned week and workout history.",
      clearedActiveSession: false,
      clearedTodayDraft: false,
      advancedPlannedWeekToSession3: false
    };
    var changed = false;

    if (!completedSession2 || !isPlannedSession2Completed(mergedState.plannedWeek)) {
      return;
    }

    if (activeSession && activeSession.status !== "completed" && sessionLooksLikeSession2(activeSession, completedSession2)) {
      removeItem(activeSessionKey);
      repair.clearedActiveSession = true;
      changed = true;
    }

    if (todayDraft && sessionLooksLikeSession2(getDraftSession(todayDraft), completedSession2)) {
      removeItem(todayDraftKey);
      repair.clearedTodayDraft = true;
      changed = true;
    }

    if ((mergedState.plannedWeek || {}).currentWeekSessionIndex !== 3 || mergedState.selectedSessionTemplate === "session-2-back-width-biceps-rear-delts") {
      mergedState = advancePlannedWeekPastSession2(mergedState);
      saveAppState(mergedState);
      repair.advancedPlannedWeekToSession3 = true;
      changed = true;
    }

    if (changed) {
      setItem(lastRepairKey, repair);
    }
  }

  function runDefaultDataMigrations(defaultState) {
    ensureSeedWorkoutHistory();
    repairCompletedSession2State(defaultState);
    clearCompletedSessionDrafts(defaultState);
  }

  function getAppState() {
    var defaultState = getDefaultState();

    runDefaultDataMigrations(defaultState);
    return mergeAppState(defaultState, getItem(appStateKey, null));
  }

  function saveAppState(state) {
    setItem(appStateKey, state);
    return state;
  }

  function resetAppState() {
    removeItem(appStateKey);
    return getDefaultState();
  }

  function getActiveSession() {
    return getItem(activeSessionKey, null);
  }

  function saveActiveSession(session) {
    setItem(activeSessionKey, session);
    return session;
  }

  function clearActiveSession() {
    removeItem(activeSessionKey);
  }

  function getTodayDraft() {
    return getItem(todayDraftKey, null);
  }

  function saveTodayDraft(draft) {
    setItem(todayDraftKey, draft);
    return draft;
  }

  function clearTodayDraft() {
    removeItem(todayDraftKey);
  }

  function getWorkoutHistory() {
    ensureSeedWorkoutHistory();
    return getItem("workoutHistory", []);
  }

  function saveWorkoutHistory(history) {
    setItem("workoutHistory", history || []);
    return history || [];
  }

  function addCompletedWorkout(session) {
    var history = getWorkoutHistory();

    history.push(session);
    saveWorkoutHistory(history);

    return history;
  }

  function markPlannedSessionComplete(templateId) {
    var state = getAppState();
    var plannedWeek = state.plannedWeek || {};
    var sessions = plannedWeek.sessions || [];
    var target = sessions.find(function (session) {
      return session.templateId === templateId;
    });
    var next;

    if (!target) {
      return state;
    }

    target.status = "completed";
    target.completedAt = new Date().toISOString();

    next = sessions.find(function (session) {
      return session.sessionNumber > target.sessionNumber && session.status !== "completed" && session.status !== "skipped" && session.status !== "optional";
    }) || sessions.find(function (session) {
      return session.status === "optional";
    });

    sessions.forEach(function (session) {
      if (session.status === "current") {
        session.status = session.templateId === templateId ? "completed" : "planned";
      }
    });

    if (next && next.status !== "completed") {
      next.status = "current";
      next.plannedDate = next.plannedDate || getTodayDate();
    }

    state.plannedWeek = Object.assign({}, plannedWeek, {
      currentWeekSessionIndex: next ? next.sessionNumber : target.sessionNumber,
      completedSessionTemplateIds: sessions.filter(function (session) {
        return session.status === "completed";
      }).map(function (session) {
        return session.templateId;
      }),
      sessions: sessions
    });

    state.selectedSessionTemplate = next ? next.templateId : state.selectedSessionTemplate;
    saveAppState(state);

    return state;
  }

  function clearWorkoutHistory() {
    removeItem("workoutHistory");
  }

  function getPendingVolumeRecommendations() {
    return getItem(volumeRecommendationsKey, []);
  }

  function savePendingVolumeRecommendations(recommendations) {
    setItem(volumeRecommendationsKey, recommendations || []);
    return recommendations || [];
  }

  function addVolumeRecommendation(recommendation) {
    var recommendations = getPendingVolumeRecommendations();

    recommendations.push(recommendation);
    savePendingVolumeRecommendations(recommendations);

    return recommendations;
  }

  function updateVolumeRecommendationStatus(id, status) {
    var recommendations = getPendingVolumeRecommendations().map(function (recommendation) {
      if (recommendation.id === id) {
        return Object.assign({}, recommendation, {
          status: status,
          resolvedAt: new Date().toISOString()
        });
      }

      return recommendation;
    });

    savePendingVolumeRecommendations(recommendations);

    return recommendations;
  }

  window.TrainingStorage = {
    getItem: getItem,
    setItem: setItem,
    removeItem: removeItem,
    getAppState: getAppState,
    saveAppState: saveAppState,
    resetAppState: resetAppState,
    getDefaultState: getDefaultState,
    getActiveSession: getActiveSession,
    saveActiveSession: saveActiveSession,
    clearActiveSession: clearActiveSession,
    getTodayDraft: getTodayDraft,
    saveTodayDraft: saveTodayDraft,
    clearTodayDraft: clearTodayDraft,
    getWorkoutHistory: getWorkoutHistory,
    saveWorkoutHistory: saveWorkoutHistory,
    addCompletedWorkout: addCompletedWorkout,
    markPlannedSessionComplete: markPlannedSessionComplete,
    clearWorkoutHistory: clearWorkoutHistory,
    getPendingVolumeRecommendations: getPendingVolumeRecommendations,
    savePendingVolumeRecommendations: savePendingVolumeRecommendations,
    addVolumeRecommendation: addVolumeRecommendation,
    updateVolumeRecommendationStatus: updateVolumeRecommendationStatus
  };
})();
