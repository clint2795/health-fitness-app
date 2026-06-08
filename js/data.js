(function () {
  var musclePriorities = [
    {
      id: "sideDelts",
      name: "Side delts",
      priority: "very high",
      goal: "grow",
      frequency: "3-5x/week",
      startingSets: 12,
      maxSets: 22
    },
    {
      id: "upperChest",
      name: "Upper chest",
      priority: "high",
      goal: "grow",
      frequency: "2-3x/week",
      startingSets: 10,
      maxSets: 18
    },
    {
      id: "biceps",
      name: "Biceps",
      priority: "high",
      goal: "grow",
      frequency: "2-4x/week",
      startingSets: 8,
      maxSets: 16
    },
    {
      id: "triceps",
      name: "Triceps",
      priority: "high",
      goal: "grow",
      frequency: "2-4x/week",
      startingSets: 8,
      maxSets: 16
    },
    {
      id: "backWidth",
      name: "Back width",
      priority: "high",
      goal: "grow",
      frequency: "2-3x/week",
      startingSets: 10,
      maxSets: 18
    },
    {
      id: "rearDelts",
      name: "Rear delts",
      priority: "medium",
      goal: "support",
      frequency: "2-3x/week",
      startingSets: 6,
      maxSets: 14
    },
    {
      id: "legs",
      name: "Legs",
      priority: "medium",
      goal: "maintain / moderate growth",
      frequency: "1-2x/week",
      startingSets: 8,
      maxSets: 12
    }
  ];

  var exerciseLibrary = [
    {
      id: "dead-hang",
      name: "Dead hang",
      primaryMuscle: "shoulderPrep",
      secondaryMuscles: ["lats", "grip"],
      equipment: "Pull-up bar",
      repRange: "20–45 sec",
      shoulderFriendly: "caution",
      lowerBackFriendly: true,
      status: "prep",
      notes: "Used at the start of sessions as shoulder prep. Helps shoulders feel settled. Do not force painful range. Not counted as hypertrophy working sets."
    },
    {
      id: "cable-lateral-raise",
      name: "Cable lateral raise",
      primaryMuscle: "Side delts",
      secondaryMuscles: [],
      equipment: "Cable",
      repRange: "12-25",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Stable resistance and easy to keep pressing out of the movement."
    },
    {
      id: "dumbbell-lateral-raise",
      name: "Dumbbell lateral raise",
      primaryMuscle: "Side delts",
      secondaryMuscles: [],
      equipment: "Dumbbells",
      repRange: "12-25",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Use controlled reps and stop short of positions that irritate the shoulder."
    },
    {
      id: "machine-lateral-raise",
      name: "Machine lateral raise",
      primaryMuscle: "Side delts",
      secondaryMuscles: [],
      equipment: "Machine",
      repRange: "10-20",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Good default when the machine path feels natural."
    },
    {
      id: "lean-away-cable-lateral-raise",
      name: "Lean-away cable lateral raise",
      primaryMuscle: "Side delts",
      secondaryMuscles: [],
      equipment: "Cable",
      repRange: "12-25",
      shoulderFriendly: "caution",
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Useful variation, but keep the shoulder centered and avoid aggressive stretch."
    },
    {
      id: "upright-row",
      name: "Upright row",
      primaryMuscle: "Side delts",
      secondaryMuscles: ["Traps", "Biceps"],
      equipment: "Barbell or cable",
      repRange: "10-15",
      shoulderFriendly: false,
      lowerBackFriendly: "caution",
      status: "avoid",
      notes: "Avoid for now because it may aggravate shoulder irritation."
    },
    {
      id: "smith-machine-upright-row",
      name: "Smith machine upright row",
      primaryMuscle: "sideDelts",
      secondaryMuscles: ["traps"],
      equipment: "Smith machine",
      repRange: "12–20",
      shoulderFriendly: "caution",
      lowerBackFriendly: true,
      status: "conditional",
      notes: "Tolerated when kept light/moderate and controlled. Do not chase heavy load. Keep range comfortable. Avoid if shoulder pinching, gliding, or irritation appears. Do not prioritise over cable or machine lateral raise."
    },
    {
      id: "incline-machine-press",
      name: "Incline machine press",
      primaryMuscle: "Upper chest",
      secondaryMuscles: ["Triceps", "Front delts"],
      equipment: "Machine",
      repRange: "8–15",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Stable pressing option for upper chest priority work."
    },
    {
      id: "low-incline-dumbbell-press",
      name: "Low incline dumbbell press",
      primaryMuscle: "Upper chest",
      secondaryMuscles: ["Triceps", "Front delts"],
      equipment: "Dumbbells",
      repRange: "8-15",
      shoulderFriendly: "caution",
      lowerBackFriendly: true,
      status: "neutral",
      notes: "Keep incline modest and stop if shoulder glide shows up."
    },
    {
      id: "incline-smith-machine-press",
      name: "Incline Smith machine press",
      primaryMuscle: "Upper chest",
      secondaryMuscles: ["Triceps", "Front delts"],
      equipment: "Smith machine",
      repRange: "8-12",
      shoulderFriendly: "caution",
      lowerBackFriendly: true,
      status: "neutral",
      notes: "Use only if the fixed path feels comfortable."
    },
    {
      id: "incline-cable-press",
      name: "Incline cable press",
      primaryMuscle: "Upper chest",
      secondaryMuscles: ["Triceps", "Front delts"],
      equipment: "Cable",
      repRange: "10-20",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Joint-friendly option with adjustable line of pull."
    },
    {
      id: "high-incline-barbell-press",
      name: "High incline barbell press",
      primaryMuscle: "Upper chest",
      secondaryMuscles: ["Front delts", "Triceps"],
      equipment: "Barbell",
      repRange: "6-10",
      shoulderFriendly: "caution",
      lowerBackFriendly: true,
      status: "avoid",
      notes: "Avoid if shoulder irritation is present."
    },
    {
      id: "flat-dumbbell-press",
      name: "Flat dumbbell press",
      primaryMuscle: "chest",
      secondaryMuscles: ["triceps", "frontDelts"],
      equipment: "Dumbbells + bench",
      repRange: "8-15",
      shoulderFriendly: "caution",
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Currently more comfortable than incline pressing. Use controlled reps, avoid excessive bottom stretch, and stop if shoulder gliding or irritation appears. Treat as chest pressing, not direct upper-chest bias."
    },
    {
      id: "cable-curl",
      name: "Cable curl",
      primaryMuscle: "Biceps",
      secondaryMuscles: ["Forearms"],
      equipment: "Cable",
      repRange: "10-20",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Easy to load without shoulder extension."
    },
    {
      id: "machine-preacher-curl",
      name: "Machine preacher curl",
      primaryMuscle: "Biceps",
      secondaryMuscles: ["Forearms"],
      equipment: "Machine",
      repRange: "10-20",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Stable arm path and low body momentum."
    },
    {
      id: "dumbbell-curl",
      name: "Dumbbell curl",
      primaryMuscle: "Biceps",
      secondaryMuscles: ["Forearms"],
      equipment: "Dumbbells",
      repRange: "8-15",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "neutral",
      notes: "Keep torso still and shoulder position comfortable."
    },
    {
      id: "incline-dumbbell-curl",
      name: "Incline dumbbell curl",
      primaryMuscle: "Biceps",
      secondaryMuscles: ["Forearms"],
      equipment: "Dumbbells",
      repRange: "10-15",
      shoulderFriendly: "caution",
      lowerBackFriendly: true,
      status: "neutral",
      notes: "Use caution because the shoulder extension stretch can irritate some shoulders."
    },
    {
      id: "hammer-curl",
      name: "Hammer curl",
      primaryMuscle: "Biceps",
      secondaryMuscles: ["Brachialis", "Forearms"],
      equipment: "Dumbbells or cable",
      repRange: "10-20",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Good arm size support with neutral grip."
    },
    {
      id: "rope-pushdown",
      name: "Rope pushdown",
      primaryMuscle: "Triceps",
      secondaryMuscles: [],
      equipment: "Cable",
      repRange: "10-20",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Simple triceps default with low joint cost."
    },
    {
      id: "cable-overhead-extension",
      name: "Cable overhead extension",
      primaryMuscle: "Triceps",
      secondaryMuscles: [],
      equipment: "Cable",
      repRange: "10-20",
      shoulderFriendly: "caution",
      lowerBackFriendly: true,
      status: "neutral",
      notes: "Useful long-head work, but watch shoulder position."
    },
    {
      id: "machine-dip",
      name: "Machine dip",
      primaryMuscle: "Triceps",
      secondaryMuscles: ["Chest", "Front delts"],
      equipment: "Machine",
      repRange: "8-15",
      shoulderFriendly: "caution",
      lowerBackFriendly: true,
      status: "neutral",
      notes: "Keep range shoulder-friendly and avoid deep shoulder extension."
    },
    {
      id: "cross-body-cable-extension",
      name: "Cross-body cable extension",
      primaryMuscle: "Triceps",
      secondaryMuscles: [],
      equipment: "Cable",
      repRange: "12-25",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Good joint-friendly option for higher reps."
    },
    {
      id: "skull-crusher",
      name: "Skull crusher",
      primaryMuscle: "Triceps",
      secondaryMuscles: [],
      equipment: "EZ bar or dumbbells",
      repRange: "8-15",
      shoulderFriendly: "caution",
      lowerBackFriendly: true,
      status: "avoid",
      notes: "Use caution or avoid if elbows are irritated."
    },
    {
      id: "neutral-grip-pulldown",
      name: "Neutral-grip pulldown",
      primaryMuscle: "Back width",
      secondaryMuscles: ["Biceps", "Rear delts"],
      equipment: "Cable",
      repRange: "8-15",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Strong default for back width without lower-back loading."
    },
    {
      id: "single-arm-cable-pulldown",
      name: "Single-arm cable pulldown",
      primaryMuscle: "Back width",
      secondaryMuscles: ["Biceps"],
      equipment: "Cable",
      repRange: "10-20",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Allows individual shoulder path and lat focus."
    },
    {
      id: "underhand-grip-pulldown",
      name: "Underhand grip pulldown",
      primaryMuscle: "Back width",
      secondaryMuscles: ["Biceps"],
      equipment: "Cable pulldown",
      repRange: "8-15",
      shoulderFriendly: "caution",
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Used during live gym testing as a substitute for neutral-grip pulldown. Back-width movement with more biceps involvement."
    },
    {
      id: "assisted-pull-up",
      name: "Assisted pull-up",
      primaryMuscle: "Back width",
      secondaryMuscles: ["Biceps"],
      equipment: "Assisted pull-up machine",
      repRange: "6-12",
      shoulderFriendly: "caution",
      lowerBackFriendly: true,
      status: "neutral",
      notes: "Use only if shoulder tracks well through the bottom."
    },
    {
      id: "machine-pullover",
      name: "Machine pullover",
      primaryMuscle: "Back width",
      secondaryMuscles: ["Triceps"],
      equipment: "Machine",
      repRange: "10-20",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Great lower-back-friendly lat isolation when the machine fits."
    },
    {
      id: "cable-lat-prayer",
      name: "Cable lat prayer",
      primaryMuscle: "Back width",
      secondaryMuscles: ["Triceps"],
      equipment: "Cable stack",
      repRange: "10-20",
      shoulderFriendly: "caution",
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Used during live gym testing as a substitute when machine pullover was not available."
    },
    {
      id: "wide-grip-pulldown",
      name: "Wide-grip pulldown",
      primaryMuscle: "Back width",
      secondaryMuscles: ["Biceps"],
      equipment: "Cable",
      repRange: "8-15",
      shoulderFriendly: "caution",
      lowerBackFriendly: true,
      status: "neutral",
      notes: "Caution if wide grip causes shoulder irritation."
    },
    {
      id: "chest-supported-row",
      name: "Chest-supported row",
      primaryMuscle: "Back thickness",
      secondaryMuscles: ["Back width", "Biceps", "Rear delts"],
      equipment: "Machine or bench",
      repRange: "8-15",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Preferred row because the torso is supported."
    },
    {
      id: "machine-row",
      name: "Machine row",
      primaryMuscle: "Back thickness",
      secondaryMuscles: ["Back width", "Biceps", "Rear delts"],
      equipment: "Machine",
      repRange: "8-15",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Stable back work with minimal lower-back demand."
    },
    {
      id: "seated-cable-row",
      name: "Seated cable row",
      primaryMuscle: "Back thickness",
      secondaryMuscles: ["Back width", "Biceps", "Rear delts"],
      equipment: "Cable",
      repRange: "8-15",
      shoulderFriendly: true,
      lowerBackFriendly: "caution",
      status: "neutral",
      notes: "Keep torso still and avoid bracing fatigue."
    },
    {
      id: "barbell-row",
      name: "Barbell row",
      primaryMuscle: "Back thickness",
      secondaryMuscles: ["Back width", "Biceps", "Rear delts"],
      equipment: "Barbell",
      repRange: "6-12",
      shoulderFriendly: true,
      lowerBackFriendly: false,
      status: "avoid",
      notes: "Avoid for now because of lower-back risk."
    },
    {
      id: "leg-press",
      name: "Leg press",
      primaryMuscle: "Legs",
      secondaryMuscles: ["Glutes"],
      equipment: "Machine",
      repRange: "8-20",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Main lower-body option while avoiding axial loading."
    },
    {
      id: "hack-squat",
      name: "Hack squat",
      primaryMuscle: "Legs",
      secondaryMuscles: ["Glutes"],
      equipment: "Machine",
      repRange: "8-15",
      shoulderFriendly: true,
      lowerBackFriendly: "caution",
      status: "preferred",
      notes: "Good if back position feels supported; use caution with depth."
    },
    {
      id: "leg-extension",
      name: "Leg extension",
      primaryMuscle: "Legs",
      secondaryMuscles: [],
      equipment: "Machine",
      repRange: "10-25",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Simple quad volume with very low back demand."
    },
    {
      id: "seated-hamstring-curl",
      name: "Seated hamstring curl",
      primaryMuscle: "Legs",
      secondaryMuscles: [],
      equipment: "Machine",
      repRange: "10-20",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Preferred hamstring option."
    },
    {
      id: "lying-hamstring-curl",
      name: "Lying hamstring curl",
      primaryMuscle: "Legs",
      secondaryMuscles: [],
      equipment: "Machine",
      repRange: "10-20",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Good alternative hamstring curl."
    },
    {
      id: "romanian-deadlift",
      name: "Romanian deadlift",
      primaryMuscle: "Legs",
      secondaryMuscles: ["Glutes", "Lower back"],
      equipment: "Barbell or dumbbells",
      repRange: "6-12",
      shoulderFriendly: true,
      lowerBackFriendly: false,
      status: "avoid",
      notes: "Avoid for now because of lower-back risk."
    },
    {
      id: "calf-raise",
      name: "Calf raise",
      primaryMuscle: "Legs",
      secondaryMuscles: [],
      equipment: "Machine or dumbbells",
      repRange: "10-25",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Low-cost calf work."
    },
    {
      id: "reverse-pec-deck",
      name: "Reverse pec deck",
      primaryMuscle: "Rear delts",
      secondaryMuscles: ["Upper back"],
      equipment: "Machine",
      repRange: "12-25",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Stable rear delt support work."
    },
    {
      id: "cable-rear-delt-fly",
      name: "Cable rear delt fly",
      primaryMuscle: "Rear delts",
      secondaryMuscles: ["Upper back"],
      equipment: "Cable",
      repRange: "12-25",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Adjust line of pull to shoulder comfort."
    },
    {
      id: "face-pull",
      name: "Face pull",
      primaryMuscle: "Rear delts",
      secondaryMuscles: ["Rotator cuff", "Upper back"],
      equipment: "Cable",
      repRange: "12-25",
      shoulderFriendly: "caution",
      lowerBackFriendly: true,
      status: "neutral",
      notes: "Useful if it feels smooth; avoid cranking into external rotation."
    },
    {
      id: "cable-crunch",
      name: "Cable crunch",
      primaryMuscle: "Abs / waist",
      secondaryMuscles: [],
      equipment: "Cable",
      repRange: "10-20",
      shoulderFriendly: true,
      lowerBackFriendly: "caution",
      status: "neutral",
      notes: "Use caution if loaded spinal flexion irritates the back."
    },
    {
      id: "machine-crunch",
      name: "Machine crunch",
      primaryMuscle: "Abs / waist",
      secondaryMuscles: [],
      equipment: "Machine",
      repRange: "10-20",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Preferred if the machine supports the back well."
    },
    {
      id: "dead-bug",
      name: "Dead bug",
      primaryMuscle: "Abs / waist",
      secondaryMuscles: ["Hip flexors"],
      equipment: "Bodyweight",
      repRange: "8-15 each side",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Good control drill for trunk positioning."
    },
    {
      id: "pallof-press",
      name: "Pallof press",
      primaryMuscle: "Abs / waist",
      secondaryMuscles: ["Obliques"],
      equipment: "Cable or band",
      repRange: "10-20 each side",
      shoulderFriendly: true,
      lowerBackFriendly: true,
      status: "preferred",
      notes: "Anti-rotation work with low back cost."
    }
  ];

  var exercisePreferences = {
    shoulderPrep: ["dead-hang"],
    sideDelts: ["cable-lateral-raise", "machine-lateral-raise"],
    upperChest: ["incline-cable-press", "incline-machine-press"],
    chest: ["flat-dumbbell-press"],
    biceps: ["cable-curl", "machine-preacher-curl"],
    triceps: ["rope-pushdown", "cross-body-cable-extension"],
    backWidth: ["neutral-grip-pulldown", "underhand-grip-pulldown", "cable-lat-prayer"],
    backThickness: ["chest-supported-row", "machine-row"],
    rearDelts: ["reverse-pec-deck", "cable-rear-delt-fly"],
    legs: ["leg-press", "leg-extension"],
    absWaist: ["machine-crunch", "dead-bug"]
  };

  var goalPresets = [
    {
      id: "cyprus-visual-phase",
      name: "Cyprus Visual Phase",
      purpose: "Tighten waist, keep fullness, prioritize side delts, upper chest, arms, and back width with legs at maintenance/moderate volume.",
      trainingDaysPerWeek: 5,
      muscleUpdates: {
        sideDelts: { priority: "very high", goal: "grow", frequency: "3-5x/week", startingSets: 14, maxSets: 22 },
        upperChest: { priority: "high", goal: "grow", frequency: "2-3x/week", startingSets: 10, maxSets: 18 },
        biceps: { priority: "high", goal: "grow", frequency: "2-4x/week", startingSets: 9, maxSets: 16 },
        triceps: { priority: "high", goal: "grow", frequency: "2-4x/week", startingSets: 9, maxSets: 16 },
        backWidth: { priority: "high", goal: "grow", frequency: "2-3x/week", startingSets: 10, maxSets: 18 },
        rearDelts: { priority: "medium", goal: "support", frequency: "2-3x/week", startingSets: 6, maxSets: 14 },
        legs: { priority: "medium", goal: "maintain / moderate growth", frequency: "1-2x/week", startingSets: 7, maxSets: 12 }
      },
      exercisePreferences: exercisePreferences
    },
    {
      id: "shoulder-width-focus",
      name: "Shoulder Width Focus",
      purpose: "Side delt priority with rear delt support and upper chest support.",
      trainingDaysPerWeek: 5,
      muscleUpdates: {
        sideDelts: { priority: "very high", goal: "grow", frequency: "3-5x/week", startingSets: 16, maxSets: 24 },
        rearDelts: { priority: "high", goal: "support / grow", frequency: "2-4x/week", startingSets: 8, maxSets: 16 },
        upperChest: { priority: "medium", goal: "support", frequency: "2-3x/week", startingSets: 8, maxSets: 16 },
        legs: { priority: "low", goal: "maintain", frequency: "1-2x/week", startingSets: 6, maxSets: 10 }
      },
      exercisePreferences: {
        sideDelts: ["cable-lateral-raise", "machine-lateral-raise", "lean-away-cable-lateral-raise"],
        rearDelts: ["reverse-pec-deck", "cable-rear-delt-fly"],
        upperChest: ["incline-cable-press", "incline-machine-press"]
      }
    },
    {
      id: "upper-chest-arms-focus",
      name: "Upper Chest + Arms Focus",
      purpose: "Upper chest, biceps, and triceps priority with side delts secondary.",
      trainingDaysPerWeek: 5,
      muscleUpdates: {
        upperChest: { priority: "very high", goal: "grow", frequency: "2-4x/week", startingSets: 12, maxSets: 20 },
        biceps: { priority: "high", goal: "grow", frequency: "2-4x/week", startingSets: 10, maxSets: 18 },
        triceps: { priority: "high", goal: "grow", frequency: "2-4x/week", startingSets: 10, maxSets: 18 },
        sideDelts: { priority: "high", goal: "grow", frequency: "2-4x/week", startingSets: 10, maxSets: 20 }
      },
      exercisePreferences: {
        upperChest: ["incline-cable-press", "incline-machine-press", "flat-dumbbell-press"],
        biceps: ["cable-curl", "machine-preacher-curl", "hammer-curl"],
        triceps: ["rope-pushdown", "cross-body-cable-extension", "cable-overhead-extension"]
      }
    },
    {
      id: "back-width-focus",
      name: "Back Width Focus",
      purpose: "Pulldown, lat-prayer, and pullover emphasis with biceps and rear delt support.",
      trainingDaysPerWeek: 5,
      muscleUpdates: {
        backWidth: { priority: "very high", goal: "grow", frequency: "2-4x/week", startingSets: 14, maxSets: 22 },
        biceps: { priority: "high", goal: "support / grow", frequency: "2-4x/week", startingSets: 9, maxSets: 16 },
        rearDelts: { priority: "medium", goal: "support", frequency: "2-3x/week", startingSets: 7, maxSets: 14 }
      },
      exercisePreferences: {
        backWidth: ["neutral-grip-pulldown", "underhand-grip-pulldown", "cable-lat-prayer"],
        biceps: ["cable-curl", "hammer-curl"],
        rearDelts: ["reverse-pec-deck", "cable-rear-delt-fly"]
      }
    },
    {
      id: "fat-loss-maintenance",
      name: "Fat Loss / Maintenance",
      purpose: "Maintain muscle with moderate volume, lower fatigue, and walking/cardio support.",
      trainingDaysPerWeek: 4,
      muscleUpdates: {
        sideDelts: { priority: "high", goal: "maintain / grow", frequency: "2-4x/week", startingSets: 10, maxSets: 18 },
        upperChest: { priority: "medium", goal: "maintain", frequency: "2-3x/week", startingSets: 8, maxSets: 14 },
        biceps: { priority: "medium", goal: "maintain", frequency: "2-3x/week", startingSets: 7, maxSets: 12 },
        triceps: { priority: "medium", goal: "maintain", frequency: "2-3x/week", startingSets: 7, maxSets: 12 },
        backWidth: { priority: "medium", goal: "maintain", frequency: "2-3x/week", startingSets: 8, maxSets: 14 },
        legs: { priority: "low", goal: "maintain", frequency: "1-2x/week", startingSets: 6, maxSets: 10 }
      },
      exercisePreferences: {}
    },
    {
      id: "balanced-hypertrophy",
      name: "Balanced Hypertrophy",
      purpose: "Balanced training across all major muscle groups.",
      trainingDaysPerWeek: 5,
      muscleUpdates: {
        sideDelts: { priority: "high", goal: "grow", frequency: "2-4x/week", startingSets: 10, maxSets: 18 },
        upperChest: { priority: "high", goal: "grow", frequency: "2-3x/week", startingSets: 9, maxSets: 16 },
        biceps: { priority: "medium", goal: "grow", frequency: "2-3x/week", startingSets: 8, maxSets: 14 },
        triceps: { priority: "medium", goal: "grow", frequency: "2-3x/week", startingSets: 8, maxSets: 14 },
        backWidth: { priority: "high", goal: "grow", frequency: "2-3x/week", startingSets: 10, maxSets: 18 },
        rearDelts: { priority: "medium", goal: "support", frequency: "2-3x/week", startingSets: 7, maxSets: 14 },
        legs: { priority: "medium", goal: "grow", frequency: "1-2x/week", startingSets: 9, maxSets: 14 }
      },
      exercisePreferences: {}
    },
    {
      id: "recovery-friendly-phase",
      name: "Recovery-Friendly Phase",
      purpose: "Lower joint stress with machine/cable bias and shoulder/back-friendly exercise choices.",
      trainingDaysPerWeek: 4,
      muscleUpdates: {
        sideDelts: { priority: "high", goal: "grow", frequency: "2-4x/week", startingSets: 10, maxSets: 18 },
        upperChest: { priority: "medium", goal: "maintain / grow", frequency: "2-3x/week", startingSets: 8, maxSets: 14 },
        backWidth: { priority: "medium", goal: "maintain / grow", frequency: "2-3x/week", startingSets: 8, maxSets: 14 },
        legs: { priority: "low", goal: "maintain", frequency: "1-2x/week", startingSets: 6, maxSets: 10 }
      },
      exercisePreferences: {
        sideDelts: ["machine-lateral-raise", "cable-lateral-raise"],
        upperChest: ["incline-machine-press", "incline-cable-press", "flat-dumbbell-press"],
        backWidth: ["neutral-grip-pulldown", "machine-pullover", "cable-lat-prayer"],
        legs: ["leg-press", "leg-extension", "seated-hamstring-curl"]
      }
    }
  ];

  var sessionTemplates = [
    {
      id: "visual-upper-priority",
      name: "Visual Upper Priority",
      targetMuscles: ["Side Delts", "Upper Chest", "Triceps"],
      setRange: "8-14 working sets",
      recoveryNote: "Upper-priority session with shoulder comfort as the limiter."
    },
    {
      id: "back-width-biceps",
      name: "Back Width + Biceps",
      targetMuscles: ["Back Width", "Biceps", "Rear Delts"],
      setRange: "8-14 working sets",
      recoveryNote: "Lat-first pull session with supported rear delt and arm work."
    },
    {
      id: "delt-arm-pump",
      name: "Delt + Arm Pump",
      targetMuscles: ["Side Delts", "Biceps", "Triceps"],
      setRange: "8-13 working sets",
      recoveryNote: "Lower systemic fatigue, good for cable/machine-biased work."
    },
    {
      id: "upper-chest-back-width",
      name: "Upper Chest + Back Width",
      targetMuscles: ["Upper Chest", "Back Width", "Side Delts optional"],
      setRange: "8-15 working sets",
      recoveryNote: "Alternates pressing and lat work while keeping lower back quiet."
    },
    {
      id: "leg-maintenance",
      name: "Leg Maintenance",
      targetMuscles: ["Legs", "Calves if available", "Side Delts optional"],
      setRange: "6-11 working sets",
      recoveryNote: "Machine-based lower-body work with optional low-cost delt volume."
    },
    {
      id: "recovery-friendly-upper",
      name: "Recovery-Friendly Upper",
      targetMuscles: ["Upper Chest", "Side Delts", "Back Width"],
      setRange: "7-12 working sets",
      recoveryNote: "Machines and cables preferred; avoid chasing load when joints feel off."
    }
  ];

  window.TrainingData = {
    userProfile: {
      goalName: "Cyprus Visual Phase",
      bodyweightKg: 82.5,
      targetDate: "2026-07-14",
      defaultTrainingTime: "01:45",
      preferredSessionLengthMinutes: 70,
      goalDescription: "Tighten waist, keep fullness, and bias visible upper-body priorities while managing recovery."
    },
    mesocycleSettings: {
      currentWeek: 1,
      plannedWeeks: 5,
      trainingDaysPerWeek: 5
    },
    rirTargets: [
      { week: 1, target: "3 RIR" },
      { week: 2, target: "2 RIR" },
      { week: 3, target: "1-2 RIR" },
      { week: 4, target: "1 RIR" },
      { week: 5, target: "0-1 RIR selectively or deload depending recovery" }
    ],
    injurySettings: {
      shoulderFriendlyMode: true,
      lowerBackProtection: true,
      avoidHeavyAxialLoading: true,
      avoidRiskyOverheadPressing: true
    },
    musclePriorities: musclePriorities,
    exerciseLibrary: exerciseLibrary,
    exercisePreferences: exercisePreferences,
    goalPresets: goalPresets,
    sessionTemplates: sessionTemplates,
    activeGoalPreset: "cyprus-visual-phase",
    selectedSessionTemplate: "",
    placeholderWorkout: [
      { muscle: "Upper chest", exercise: "Incline machine press", sets: 2 },
      { muscle: "Side delts", exercise: "Cable lateral raise", sets: 3 },
      { muscle: "Back width", exercise: "Neutral-grip pulldown", sets: 2 },
      { muscle: "Biceps", exercise: "Cable curl", sets: 2 }
    ]
  };
})();
