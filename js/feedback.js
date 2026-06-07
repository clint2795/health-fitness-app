(function () {
  function buildDefaultFeedback(session) {
    var feedback = {
      muscles: {},
      overall: {
        fatigue: "moderate",
        sleepRecovery: "okay",
        notes: ""
      }
    };

    (session.muscles || []).forEach(function (muscle) {
      feedback.muscles[muscle] = {
        pump: "good",
        soreness: "mild",
        performance: "same",
        jointDiscomfort: "none",
        notes: ""
      };
    });

    return feedback;
  }

  function getVolumeSignal(muscleFeedback, overallFeedback) {
    var fatigue = overallFeedback ? overallFeedback.fatigue : "moderate";

    if (
      muscleFeedback.soreness === "severe" ||
      muscleFeedback.performance === "down" ||
      muscleFeedback.jointDiscomfort === "bad" ||
      fatigue === "high"
    ) {
      return "reduce";
    }

    if (
      (muscleFeedback.pump === "good" || muscleFeedback.pump === "excellent") &&
      (muscleFeedback.soreness === "none" || muscleFeedback.soreness === "mild") &&
      (muscleFeedback.performance === "same" || muscleFeedback.performance === "up") &&
      muscleFeedback.jointDiscomfort === "none" &&
      fatigue !== "high"
    ) {
      return "add";
    }

    if (
      (muscleFeedback.pump === "okay" || muscleFeedback.pump === "good") &&
      (muscleFeedback.soreness === "mild" || muscleFeedback.soreness === "moderate") &&
      muscleFeedback.performance === "same" &&
      (muscleFeedback.jointDiscomfort === "none" || muscleFeedback.jointDiscomfort === "mild") &&
      fatigue === "moderate"
    ) {
      return "hold";
    }

    return "hold";
  }

  function calculateVolumeSignals(feedback) {
    var signals = {};

    Object.keys((feedback && feedback.muscles) || {}).forEach(function (muscle) {
      signals[muscle] = getVolumeSignal(feedback.muscles[muscle], feedback.overall);
    });

    return signals;
  }

  function summarizeSessionFeedback(feedback) {
    var signals = calculateVolumeSignals(feedback);
    var signalCounts = { add: 0, hold: 0, reduce: 0 };

    Object.keys(signals).forEach(function (muscle) {
      signalCounts[signals[muscle]] += 1;
    });

    return {
      fatigue: feedback && feedback.overall ? feedback.overall.fatigue : "not logged",
      sleepRecovery: feedback && feedback.overall ? feedback.overall.sleepRecovery : "not logged",
      signals: signals,
      signalCounts: signalCounts
    };
  }

  function suggestVolumeAdjustment(feedback) {
    return calculateVolumeSignals(feedback);
  }

  function findMuscleState(state, muscle) {
    var aliases = {
      chest: "upperChest"
    };
    var id = aliases[muscle] || muscle;

    return (state.musclePriorities || []).find(function (item) {
      return item.id === id;
    });
  }

  function getMinimumSets(muscle) {
    if (muscle === "legs") return 4;
    if (muscle === "rearDelts") return 4;
    return 6;
  }

  function getVolumeRecommendationReason(muscleFeedback, overallFeedback, currentSets, maxSets) {
    if (muscleFeedback.jointDiscomfort === "bad") {
      return "Reduce volume because joint discomfort was bad.";
    }

    if (muscleFeedback.soreness === "severe") {
      return "Reduce volume because soreness was severe.";
    }

    if (muscleFeedback.performance === "down") {
      return "Reduce volume because performance was down.";
    }

    if (overallFeedback.fatigue === "high") {
      return "Reduce or hold volume because overall fatigue was high.";
    }

    if (currentSets >= maxSets - 1) {
      return "Hold volume because weekly sets are already near the current maximum.";
    }

    if (
      (muscleFeedback.pump === "good" || muscleFeedback.pump === "excellent") &&
      (muscleFeedback.soreness === "none" || muscleFeedback.soreness === "mild") &&
      (muscleFeedback.performance === "same" || muscleFeedback.performance === "up") &&
      muscleFeedback.jointDiscomfort === "none"
    ) {
      return "Good pump, manageable soreness, stable/up performance, no joint discomfort.";
    }

    return "Hold volume due to mixed feedback or manageable caution.";
  }

  function getSuggestedChange(muscle, signal, muscleFeedback, overallFeedback, currentSets, maxSets) {
    var minimumSets = getMinimumSets(muscle);

    if (
      signal === "reduce" ||
      muscleFeedback.jointDiscomfort === "bad" ||
      muscleFeedback.soreness === "severe" ||
      muscleFeedback.performance === "down" ||
      overallFeedback.fatigue === "high"
    ) {
      if (currentSets <= minimumSets) return 0;
      return muscleFeedback.jointDiscomfort === "bad" || muscleFeedback.soreness === "severe" ? -2 : -1;
    }

    if (
      signal === "add" &&
      muscleFeedback.jointDiscomfort === "none" &&
      (muscleFeedback.soreness === "none" || muscleFeedback.soreness === "mild") &&
      (muscleFeedback.performance === "same" || muscleFeedback.performance === "up") &&
      overallFeedback.fatigue !== "high" &&
      currentSets < maxSets
    ) {
      if (muscle === "legs") return 0;
      if ((muscle === "upperChest" || muscle === "chest") && muscleFeedback.jointDiscomfort !== "none") return 0;
      return 1;
    }

    return 0;
  }

  function generateVolumeRecommendations(session, state) {
    var feedback = session.feedback || buildDefaultFeedback(session);
    var signals = calculateVolumeSignals(feedback);
    var recommendation = {
      id: "rec-" + session.id + "-" + Date.now(),
      sessionId: session.id,
      createdAt: new Date().toISOString(),
      status: "pending",
      muscles: {}
    };
    var totalAdds = 0;

    Object.keys(feedback.muscles || {}).forEach(function (muscle) {
      var muscleState;
      var currentSets;
      var maxSets;
      var muscleFeedback;
      var signal;
      var suggestedChange;
      var minimumSets;

      if (muscle === "shoulderPrep") {
        return;
      }

      muscleState = findMuscleState(state, muscle);

      if (!muscleState) {
        return;
      }

      currentSets = Number(muscleState.startingSets);
      maxSets = Number(muscleState.maxSets);
      muscleFeedback = feedback.muscles[muscle];
      signal = signals[muscle] || "hold";
      suggestedChange = getSuggestedChange(muscle, signal, muscleFeedback, feedback.overall, currentSets, maxSets);
      minimumSets = getMinimumSets(muscle);

      if (suggestedChange > 0 && totalAdds >= 2) {
        suggestedChange = 0;
        signal = "hold";
      }

      if (suggestedChange > 0) {
        totalAdds += suggestedChange;
      }

      recommendation.muscles[muscle] = {
        signal: signal,
        currentWeeklySets: currentSets,
        maxWeeklySets: maxSets,
        suggestedChange: suggestedChange,
        suggestedWeeklySets: Math.min(maxSets, Math.max(minimumSets, currentSets + suggestedChange)),
        reason: getVolumeRecommendationReason(muscleFeedback, feedback.overall, currentSets, maxSets)
      };
    });

    return recommendation;
  }

  function summarizeRecommendation(recommendation) {
    var counts = { add: 0, hold: 0, reduce: 0 };

    Object.keys((recommendation && recommendation.muscles) || {}).forEach(function (muscle) {
      var signal = recommendation.muscles[muscle].signal;

      counts[signal] = (counts[signal] || 0) + 1;
    });

    return counts;
  }

  window.TrainingFeedback = {
    buildDefaultFeedback: buildDefaultFeedback,
    summarizeSessionFeedback: summarizeSessionFeedback,
    suggestVolumeAdjustment: suggestVolumeAdjustment,
    calculateVolumeSignals: calculateVolumeSignals,
    generateVolumeRecommendations: generateVolumeRecommendations,
    getVolumeRecommendationReason: getVolumeRecommendationReason,
    summarizeRecommendation: summarizeRecommendation
  };
})();
