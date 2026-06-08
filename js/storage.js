(function () {
  var prefix = "trainingPlanner:";
  var appStateKey = "appState";
  var activeSessionKey = "activeSession";
  var volumeRecommendationsKey = "volumeRecommendations";

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
      activeGoalPreset: savedState.activeGoalPreset || defaultState.activeGoalPreset,
      selectedSessionTemplate: savedState.selectedSessionTemplate || defaultState.selectedSessionTemplate
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

  function getAppState() {
    return mergeAppState(getDefaultState(), getItem(appStateKey, null));
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

  function getWorkoutHistory() {
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
    getWorkoutHistory: getWorkoutHistory,
    saveWorkoutHistory: saveWorkoutHistory,
    addCompletedWorkout: addCompletedWorkout,
    clearWorkoutHistory: clearWorkoutHistory,
    getPendingVolumeRecommendations: getPendingVolumeRecommendations,
    savePendingVolumeRecommendations: savePendingVolumeRecommendations,
    addVolumeRecommendation: addVolumeRecommendation,
    updateVolumeRecommendationStatus: updateVolumeRecommendationStatus
  };
})();
