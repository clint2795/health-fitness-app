(function () {
  var APP_SCHEMA_VERSION = 8;
  var prefix = "trainingPlanner:";
  var appStateKey = "appState";
  var activeSessionKey = "activeSession";
  var todayDraftKey = "todayDraft";
  var workoutHistoryKey = "workoutHistory";
  var volumeRecommendationsKey = "volumeRecommendations";
  var lastRepairKey = "lastStateRepair";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
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

  function mergeById(defaultItems, savedItems) {
    var savedById = {};

    (savedItems || []).forEach(function (item) {
      if (item && item.id) {
        savedById[item.id] = item;
      }
    });

    return (defaultItems || []).map(function (item) {
      return Object.assign({}, item, savedById[item.id] || {});
    });
  }

  function getDefaultState() {
    var data = window.TrainingData || {};

    return {
      schemaVersion: APP_SCHEMA_VERSION,
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
      activeSession: null,
      todayDraft: null,
      workoutHistory: clone(data.completedWorkoutHistory || []),
      settings: {
        activeGoalPreset: data.activeGoalPreset || "",
        selectedSessionTemplate: data.selectedSessionTemplate || ""
      },
      recoveryResponses: [],
      functionalSessions: [],
      nonHypertrophyTraining: clone(data.nonHypertrophyTraining || {}),
      recoveryResponseFields: clone(data.recoveryResponseFields || {}),
      activeGoalPreset: data.activeGoalPreset || "",
      selectedSessionTemplate: data.selectedSessionTemplate || "",
      volumeRecommendations: []
    };
  }

  function getValidSessionTemplateId(defaultState, savedState) {
    var savedSettings = savedState.settings || {};
    var savedId = savedState.selectedSessionTemplate || savedSettings.selectedSessionTemplate;
    var defaultId = defaultState.settings.selectedSessionTemplate || defaultState.selectedSessionTemplate;
    var templates = defaultState.sessionTemplates || [];

    if (savedId && templates.some(function (template) { return template.id === savedId; })) {
      return savedId;
    }

    return defaultId;
  }

  function getTemplateById(state, templateId) {
    return (state.sessionTemplates || []).find(function (template) {
      return template.id === templateId;
    }) || null;
  }

  function getTemplateSessionNumber(state, templateId) {
    var index = (state.sessionTemplates || []).findIndex(function (template) {
      return template.id === templateId;
    });

    return index === -1 ? null : index + 1;
  }

  function normalizeText(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function sameMuscleSet(a, b) {
    var aMuscles = (a || []).slice().sort().join("|");
    var bMuscles = (b || []).slice().sort().join("|");

    return Boolean(aMuscles && bMuscles && aMuscles === bMuscles);
  }

  function normalizeSessionMetadata(session, state) {
    var template;

    if (!session) {
      return null;
    }

    session = clone(session);

    if (!session.templateId && session.sessionNumber) {
      template = (state.sessionTemplates || [])[Number(session.sessionNumber) - 1];
      if (template) {
        session.templateId = template.id;
      }
    }

    if (!session.templateId && session.title) {
      template = (state.sessionTemplates || []).find(function (item) {
        return normalizeText(item.name) === normalizeText(session.title);
      });
      if (template) {
        session.templateId = template.id;
      }
    }

    if (session.templateId && !session.sessionNumber) {
      session.sessionNumber = getTemplateSessionNumber(state, session.templateId);
    }

    if (!session.title && session.name) {
      session.title = session.name;
    }

    if (!Array.isArray(session.exercises)) {
      session.exercises = [];
    }

    if (!Array.isArray(session.prep)) {
      session.prep = [];
    }

    if (!Array.isArray(session.muscles)) {
      session.muscles = [];
    }

    session.exercises = session.exercises.map(function (exercise) {
      exercise = Object.assign({}, exercise);
      exercise.plannedSets = Math.max(1, Number(exercise.plannedSets) || 1);
      exercise.loggedSets = Array.isArray(exercise.loggedSets) ? exercise.loggedSets : [];
      return exercise;
    });

    return session;
  }

  function normalizeWorkoutHistory(history, state) {
    var byId = {};
    var normalized = [];

    (history || []).forEach(function (session) {
      var normalizedSession = normalizeSessionMetadata(session, state);
      var key;

      if (!normalizedSession) {
        return;
      }

      normalizedSession.status = normalizedSession.status || "completed";
      key = normalizedSession.id || [
        normalizedSession.date || "",
        normalizedSession.templateId || "",
        normalizedSession.title || "",
        normalizedSession.completedAt || ""
      ].join("|");

      if (byId[key]) {
        return;
      }

      byId[key] = true;
      normalized.push(normalizedSession);
    });

    return normalized;
  }

  function mergeSeedWorkoutHistory(history, seedHistory, state) {
    var merged = normalizeWorkoutHistory(history, state);
    var existingIds = {};

    merged.forEach(function (session) {
      if (session.id) {
        existingIds[session.id] = true;
      }
    });

    (seedHistory || []).forEach(function (seedSession) {
      if (seedSession.id && !existingIds[seedSession.id]) {
        merged.push(normalizeSessionMetadata(seedSession, state));
        existingIds[seedSession.id] = true;
      }
    });

    return normalizeWorkoutHistory(merged, state);
  }

  function getCompletedTemplateIdsFromHistory(history) {
    return (history || []).filter(function (session) {
      return session && session.status === "completed" && session.templateId;
    }).map(function (session) {
      return session.templateId;
    }).filter(function (id, index, list) {
      return list.indexOf(id) === index;
    });
  }

  function normalizePlannedWeek(plannedWeek, state) {
    var templates = state.sessionTemplates || [];
    var savedSessions = (plannedWeek && plannedWeek.sessions) || [];
    var completedIds = (plannedWeek && plannedWeek.completedSessionTemplateIds) || [];
    var historyCompletedIds = getCompletedTemplateIdsFromHistory(state.workoutHistory);
    var currentIndex = Number(plannedWeek && plannedWeek.currentWeekSessionIndex) || 1;
    var hasCurrent = false;
    var sessions;
    var firstOpen;

    completedIds = completedIds.concat(historyCompletedIds).filter(function (id, index, list) {
      return id && list.indexOf(id) === index;
    });

    sessions = templates.map(function (template, index) {
      var saved = savedSessions.find(function (session) {
        return session.templateId === template.id || Number(session.sessionNumber) === index + 1;
      }) || {};
      var status = saved.status || (template.status === "optional" ? "optional" : "planned");

      if (completedIds.indexOf(template.id) !== -1) {
        status = "completed";
      } else if (Number(saved.sessionNumber || index + 1) === currentIndex && status !== "optional") {
        status = "current";
      }

      return {
        sessionNumber: index + 1,
        templateId: template.id,
        name: saved.name || template.name,
        status: status,
        plannedDate: saved.plannedDate || null,
        completedAt: saved.completedAt || null,
        skippedAt: saved.skippedAt || null
      };
    });

    sessions.forEach(function (session) {
      if (session.status === "current") {
        if (hasCurrent) {
          session.status = "planned";
        }
        hasCurrent = true;
      }
    });

    if (!hasCurrent) {
      firstOpen = sessions.find(function (session) {
        return session.status !== "completed" && session.status !== "skipped" && session.status !== "optional";
      });
      if (firstOpen) {
        firstOpen.status = "current";
      }
    }

    firstOpen = sessions.find(function (session) {
      return session.status === "current";
    });

    if (firstOpen && !firstOpen.plannedDate) {
      firstOpen.plannedDate = getTodayDate();
    }

    return {
      weekStartDate: (plannedWeek && plannedWeek.weekStartDate) || getWeekStartDate(),
      currentWeekNumber: Number(plannedWeek && plannedWeek.currentWeekNumber) || 1,
      currentWeekSessionIndex: firstOpen ? firstOpen.sessionNumber : currentIndex,
      completedSessionTemplateIds: sessions.filter(function (session) {
        return session.status === "completed";
      }).map(function (session) {
        return session.templateId;
      }),
      sessions: sessions
    };
  }

  function sessionMatchesCompletedSession(session, completedSession, state) {
    var sessionTemplate = session && session.templateId ? getTemplateById(state, session.templateId) : null;
    var completedTemplate = completedSession && completedSession.templateId ? getTemplateById(state, completedSession.templateId) : null;
    var sessionTitle = normalizeText(session && (session.title || session.name));
    var completedTitle = normalizeText(completedSession && (completedSession.title || completedSession.name));

    if (!session || !completedSession) {
      return false;
    }

    if (session.templateId && completedSession.templateId && session.templateId === completedSession.templateId) {
      return true;
    }

    if (session.sessionNumber && completedSession.sessionNumber && Number(session.sessionNumber) === Number(completedSession.sessionNumber)) {
      return true;
    }

    if (sessionTitle && completedTitle && sessionTitle === completedTitle) {
      return true;
    }

    if (session.date && completedSession.date && session.date === completedSession.date && sameMuscleSet(session.muscles, completedSession.muscles)) {
      return true;
    }

    return Boolean(sessionTemplate && completedTemplate && normalizeText(sessionTemplate.focus) === normalizeText(completedTemplate.focus));
  }

  function clearDraftsForCompletedSessions(state) {
    var completed = (state.workoutHistory || []).filter(function (session) {
      return session && session.status === "completed";
    });

    if (state.activeSession && state.activeSession.status !== "completed" && completed.some(function (session) {
      return sessionMatchesCompletedSession(state.activeSession, session, state);
    })) {
      state.activeSession = null;
    }

    if (state.todayDraft) {
      var draftSession = state.todayDraft.session || state.todayDraft;
      if (completed.some(function (session) {
        return sessionMatchesCompletedSession(draftSession, session, state);
      })) {
        state.todayDraft = null;
      }
    }

    return state;
  }

  function normalizeTodayDraft(draft, state) {
    var session;

    if (!draft) {
      return null;
    }

    session = normalizeSessionMetadata(draft.session || draft, state);

    if (!session) {
      return null;
    }

    return {
      date: draft.date || session.date || getTodayDate(),
      sessionNumber: draft.sessionNumber || session.sessionNumber || null,
      templateId: draft.templateId || session.templateId || "",
      generatedAt: draft.generatedAt || new Date().toISOString(),
      session: session
    };
  }

  function migrateLegacyState(defaultState, savedState) {
    var state = Object.assign({}, defaultState, savedState || {});
    var settings = Object.assign({}, defaultState.settings, savedState && savedState.settings || {});

    state.schemaVersion = Number(state.schemaVersion) || 0;
    settings.activeGoalPreset = state.activeGoalPreset || settings.activeGoalPreset || defaultState.activeGoalPreset || "";
    settings.selectedSessionTemplate = getValidSessionTemplateId(defaultState, Object.assign({}, state, { settings: settings }));
    state.settings = settings;
    state.activeGoalPreset = settings.activeGoalPreset;
    state.selectedSessionTemplate = settings.selectedSessionTemplate;
    state.exercisePreferences = Object.assign({}, defaultState.exercisePreferences, state.exercisePreferences || {});
    state.recoveryResponses = Array.isArray(state.recoveryResponses) ? state.recoveryResponses : [];
    state.functionalSessions = Array.isArray(state.functionalSessions) ? state.functionalSessions : [];
    state.volumeRecommendations = Array.isArray(state.volumeRecommendations) ? state.volumeRecommendations : [];
    return state;
  }

  function normalizeState(rawState) {
    var defaultState = getDefaultState();
    var state = migrateLegacyState(defaultState, rawState || {});

    state.userProfile = Object.assign({}, defaultState.userProfile, state.userProfile || {});
    state.mesocycleSettings = Object.assign({}, defaultState.mesocycleSettings, state.mesocycleSettings || {});
    state.rirTargets = state.rirTargets || defaultState.rirTargets;
    state.musclePriorities = mergeById(defaultState.musclePriorities, state.musclePriorities);
    state.injurySettings = Object.assign({}, defaultState.injurySettings, state.injurySettings || {});
    state.exerciseLibrary = defaultState.exerciseLibrary;
    state.goalPresets = defaultState.goalPresets;
    state.sessionTemplates = defaultState.sessionTemplates;
    state.completedWorkoutHistory = defaultState.completedWorkoutHistory;
    state.nonHypertrophyTraining = Object.assign({}, defaultState.nonHypertrophyTraining, state.nonHypertrophyTraining || {});
    state.recoveryResponseFields = Object.assign({}, defaultState.recoveryResponseFields, state.recoveryResponseFields || {});
    state.workoutHistory = mergeSeedWorkoutHistory(state.workoutHistory, defaultState.completedWorkoutHistory, state);
    state.activeSession = normalizeSessionMetadata(state.activeSession, state);
    state.todayDraft = normalizeTodayDraft(state.todayDraft, state);
    state.plannedWeek = normalizePlannedWeek(state.plannedWeek || defaultState.plannedWeek, state);
    state = clearDraftsForCompletedSessions(state);
    state.plannedWeek = normalizePlannedWeek(state.plannedWeek, state);
    state.schemaVersion = APP_SCHEMA_VERSION;
    return state;
  }

  function readLegacySplitState() {
    var savedAppState = getItem(appStateKey, null) || {};

    savedAppState.activeSession = getItem(activeSessionKey, savedAppState.activeSession || null);
    savedAppState.todayDraft = getItem(todayDraftKey, savedAppState.todayDraft || null);
    savedAppState.workoutHistory = getItem(workoutHistoryKey, savedAppState.workoutHistory || savedAppState.completedWorkoutHistory || []);
    savedAppState.volumeRecommendations = getItem(volumeRecommendationsKey, savedAppState.volumeRecommendations || []);
    return savedAppState;
  }

  function persistState(state) {
    setItem(appStateKey, state);
    setItem(activeSessionKey, state.activeSession);
    setItem(todayDraftKey, state.todayDraft);
    setItem(workoutHistoryKey, state.workoutHistory);
    setItem(volumeRecommendationsKey, state.volumeRecommendations || []);
    return state;
  }

  function loadState() {
    var state = normalizeState(readLegacySplitState());

    persistState(state);
    return state;
  }

  function getAppState() {
    return loadState();
  }

  function saveAppState(state) {
    return persistState(normalizeState(Object.assign({}, loadState(), state || {})));
  }

  function resetAppState() {
    removeItem(appStateKey);
    removeItem(activeSessionKey);
    removeItem(todayDraftKey);
    removeItem(workoutHistoryKey);
    return loadState();
  }

  function getActiveSession() {
    return loadState().activeSession;
  }

  function saveActiveSession(session) {
    var state = loadState();

    state.activeSession = normalizeSessionMetadata(session, state);
    return persistState(normalizeState(state)).activeSession;
  }

  function clearActiveSession() {
    var state = loadState();

    state.activeSession = null;
    persistState(state);
  }

  function getTodayDraft() {
    return loadState().todayDraft;
  }

  function saveTodayDraft(draft) {
    var state = loadState();

    state.todayDraft = normalizeTodayDraft(draft, state);
    return persistState(normalizeState(state)).todayDraft;
  }

  function clearTodayDraft() {
    var state = loadState();

    state.todayDraft = null;
    persistState(state);
  }

  function getWorkoutHistory() {
    return loadState().workoutHistory;
  }

  function saveWorkoutHistory(history) {
    var state = loadState();

    state.workoutHistory = normalizeWorkoutHistory(history || [], state);
    return persistState(normalizeState(state)).workoutHistory;
  }

  function addCompletedWorkout(session) {
    var state = loadState();
    var completed = normalizeSessionMetadata(session, state);

    if (!completed) {
      return state.workoutHistory;
    }

    completed.status = "completed";
    state.workoutHistory = normalizeWorkoutHistory((state.workoutHistory || []).concat([completed]), state);
    return persistState(normalizeState(state)).workoutHistory;
  }

  function markPlannedSessionComplete(templateId) {
    var state = loadState();
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

    sessions.forEach(function (session) {
      if (session.status === "current" && session.templateId !== templateId) {
        session.status = session.status === "optional" ? "optional" : "planned";
      }
    });

    next = sessions.find(function (session) {
      return session.sessionNumber > target.sessionNumber && session.status !== "completed" && session.status !== "skipped" && session.status !== "optional";
    }) || sessions.find(function (session) {
      return session.status === "optional";
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
    state.settings.selectedSessionTemplate = next ? next.templateId : state.settings.selectedSessionTemplate;
    state.selectedSessionTemplate = state.settings.selectedSessionTemplate;
    return persistState(normalizeState(state));
  }

  function clearWorkoutHistory() {
    var state = loadState();

    state.workoutHistory = [];
    persistState(normalizeState(state));
  }

  function getPendingVolumeRecommendations() {
    return loadState().volumeRecommendations || [];
  }

  function savePendingVolumeRecommendations(recommendations) {
    var state = loadState();

    state.volumeRecommendations = recommendations || [];
    return persistState(state).volumeRecommendations;
  }

  function addVolumeRecommendation(recommendation) {
    var recommendations = getPendingVolumeRecommendations();

    recommendations.push(recommendation);
    return savePendingVolumeRecommendations(recommendations);
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

    return savePendingVolumeRecommendations(recommendations);
  }

  function runStorageFixtureSelfTest() {
    var defaultState = getDefaultState();
    var seedSession2 = (defaultState.completedWorkoutHistory || [])[0];
    var staleActiveSession = seedSession2 ? Object.assign({}, seedSession2, {
      id: "stale-active-session-2",
      status: "planned",
      templateId: "",
      sessionNumber: null
    }) : null;
    var fresh = normalizeState({});
    var withCompletedSession2 = normalizeState({
      workoutHistory: seedSession2 ? [seedSession2] : []
    });
    var withStaleActive = normalizeState({
      activeSession: staleActiveSession,
      workoutHistory: seedSession2 ? [seedSession2] : []
    });
    var withStaleDraft = normalizeState({
      todayDraft: staleActiveSession ? { date: staleActiveSession.date, session: staleActiveSession } : null,
      workoutHistory: seedSession2 ? [seedSession2] : []
    });

    function currentSessionNumber(state) {
      var current = (state.plannedWeek.sessions || []).find(function (session) {
        return session.status === "current";
      });

      return current ? current.sessionNumber : null;
    }

    return {
      schemaVersion: APP_SCHEMA_VERSION,
      freshStateLoads: fresh.schemaVersion === APP_SCHEMA_VERSION && Array.isArray(fresh.workoutHistory),
      session2CompletedAdvancesToSession3: currentSessionNumber(withCompletedSession2) === 3,
      staleSession2ActiveCleared: withStaleActive.activeSession === null,
      staleTodayDraftCleared: withStaleDraft.todayDraft === null,
      workoutHistoryDoesNotDuplicateSeed: withCompletedSession2.workoutHistory.filter(function (session) {
        return session && session.id === seedSession2.id;
      }).length === 1,
      session3Current: currentSessionNumber(withCompletedSession2) === 3
    };
  }

  window.TrainingStorage = {
    APP_SCHEMA_VERSION: APP_SCHEMA_VERSION,
    loadState: loadState,
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
    updateVolumeRecommendationStatus: updateVolumeRecommendationStatus,
    runStorageFixtureSelfTest: runStorageFixtureSelfTest
  };
})();
