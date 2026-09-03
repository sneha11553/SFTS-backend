// Rule-based logic per SRS 2.5 ("BMI/recommendation logic is rule-based, not ML")

// REQ-5: BMI = weight(kg) / height(m)^2
function calculateBMI(heightCm, weightKg) {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 100) / 100;
}

// REQ-6: Mifflin-St Jeor maintenance calories (References 1.5), activity factor 1.375 (light-active default)
function calculateMaintenanceCalories(heightCm, weightKg, age, gender) {
  let bmr;
  if (gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  return Math.round(bmr * 1.375);
}

// REQ-16: target calories from maintenance + goal
function calculateTargetCalories(maintenanceCal, goalType) {
  if (goalType === 'loss') return Math.round(maintenanceCal * 0.8); // ~20% deficit
  if (goalType === 'gain') return Math.round(maintenanceCal * 1.15); // ~15% surplus
  return maintenanceCal; // recomposition: at maintenance
}

// REQ-17: macro breakdown (protein/carbs/fat in grams)
function calculateMacros(targetCalories, goalType) {
  let proteinPct, fatPct;
  if (goalType === 'loss') { proteinPct = 0.40; fatPct = 0.30; }
  else if (goalType === 'gain') { proteinPct = 0.30; fatPct = 0.25; }
  else { proteinPct = 0.35; fatPct = 0.30; } // recomposition

  const carbPct = 1 - proteinPct - fatPct;
  return {
    protein_g: Math.round((targetCalories * proteinPct) / 4),
    carbs_g: Math.round((targetCalories * carbPct) / 4),
    fat_g: Math.round((targetCalories * fatPct) / 9)
  };
}

// REQ-12/18: adjust diet notes when health issues are present
function dietHealthNotes(healthIssues) {
  if (!healthIssues) return null;
  const issues = healthIssues.toLowerCase();
  const notes = [];
  if (issues.includes('diabet')) notes.push('Lower simple-sugar intake; prefer complex carbs and fiber.');
  if (issues.includes('hypertension') || issues.includes('bp')) notes.push('Reduce sodium intake; avoid processed foods.');
  if (issues.includes('thyroid')) notes.push('Ensure adequate iodine and consistent meal timing.');
  if (issues.includes('cholesterol') || issues.includes('heart')) notes.push('Favor unsaturated fats; limit saturated/trans fats.');
  if (issues.includes('knee') || issues.includes('joint') || issues.includes('back')) notes.push('No dietary restriction, but pair with low-impact training below.');
  return notes.length ? notes.join(' ') : 'General guidance applied; consult a professional for your specific condition.';
}

// REQ-13/14/15: workout split by goal + environment + health issues
// Returns array of { day_name, exercises, day_order }
function generateWorkoutSplit(goalType, environment, healthIssues) {
  const issues = (healthIssues || '').toLowerCase();
  const lowImpact = issues.includes('knee') || issues.includes('joint') || issues.includes('back') || issues.includes('heart');

  const gymPlans = {
    loss: [
      ['Day 1 - Full Body A', ['Squats', 'Bench Press', 'Bent-over Row', 'Plank']],
      ['Day 2 - Cardio + Core', ['Treadmill Intervals', 'Cycling', 'Hanging Leg Raise']],
      ['Day 3 - Full Body B', ['Deadlift', 'Overhead Press', 'Lat Pulldown', 'Mountain Climbers']],
      ['Day 4 - Rest / Active Recovery', ['Light Walk', 'Stretching']],
      ['Day 5 - Full Body C', ['Leg Press', 'Incline Dumbbell Press', 'Seated Row', 'Russian Twists']]
    ],
    gain: [
      ['Day 1 - Push', ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Tricep Dips']],
      ['Day 2 - Pull', ['Deadlift', 'Barbell Row', 'Lat Pulldown', 'Bicep Curls']],
      ['Day 3 - Legs', ['Back Squat', 'Leg Press', 'Romanian Deadlift', 'Calf Raises']],
      ['Day 4 - Rest', ['Stretching / Mobility']],
      ['Day 5 - Push', ['Incline Bench Press', 'Arnold Press', 'Cable Fly', 'Tricep Pushdown']],
      ['Day 6 - Pull', ['Pull-ups', 'T-Bar Row', 'Face Pulls', 'Hammer Curls']]
    ],
    recomposition: [
      ['Day 1 - Upper Strength', ['Bench Press', 'Barbell Row', 'Overhead Press']],
      ['Day 2 - Lower Strength', ['Squats', 'Romanian Deadlift', 'Leg Curl']],
      ['Day 3 - Conditioning', ['Circuit Training', 'Core Work']],
      ['Day 4 - Upper Hypertrophy', ['Incline Press', 'Cable Row', 'Lateral Raise']],
      ['Day 5 - Lower Hypertrophy', ['Leg Press', 'Walking Lunges', 'Calf Raises']]
    ]
  };

  const homePlans = {
    loss: [
      ['Day 1 - Bodyweight Circuit', ['Squats', 'Push-ups', 'Lunges', 'Plank']],
      ['Day 2 - Cardio', ['Jumping Jacks', 'High Knees', 'Burpees']],
      ['Day 3 - Bodyweight Circuit', ['Glute Bridges', 'Incline Push-ups', 'Mountain Climbers']],
      ['Day 4 - Rest / Active Recovery', ['Walk', 'Stretching']],
      ['Day 5 - Core + Cardio', ['Jump Rope', 'Sit-ups', 'Plank Variations']]
    ],
    gain: [
      ['Day 1 - Upper Body', ['Push-ups', 'Pike Push-ups', 'Chair Dips', 'Resistance Band Rows']],
      ['Day 2 - Lower Body', ['Squats', 'Lunges', 'Glute Bridges', 'Calf Raises']],
      ['Day 3 - Rest', ['Mobility Work']],
      ['Day 4 - Full Body', ['Burpees', 'Push-ups', 'Squats', 'Plank']],
      ['Day 5 - Core & Stability', ['Sit-ups', 'Side Plank', 'Superman Hold']]
    ],
    recomposition: [
      ['Day 1 - Full Body A', ['Squats', 'Push-ups', 'Bent-over Band Row']],
      ['Day 2 - Core + Cardio', ['Plank', 'Jump Rope', 'Bicycle Crunches']],
      ['Day 3 - Full Body B', ['Lunges', 'Pike Push-ups', 'Glute Bridge']],
      ['Day 4 - Rest', ['Stretching']],
      ['Day 5 - Conditioning', ['Circuit: Burpees, Squats, Push-ups']]
    ]
  };

  const source = environment === 'home' ? homePlans : gymPlans;
  const plan = source[goalType] || source.recomposition;

  return plan.map(([dayName, exercises], idx) => {
    let list = exercises;
    if (lowImpact) {
      // REQ-12: swap high-impact moves for low-impact alternatives
      list = exercises.map(e => {
        if (/squat/i.test(e)) return 'Wall Sit (low-impact)';
        if (/lunge/i.test(e)) return 'Step-ups (low-impact)';
        if (/jump|burpee|high knees|jumping jacks/i.test(e)) return 'Brisk Walk / Cycling (low-impact)';
        if (/deadlift/i.test(e) && issues.includes('back')) return 'Hip Thrust (back-friendly)';
        return e;
      });
    }
    return {
      day_name: dayName,
      exercises: JSON.stringify(list),
      day_order: idx + 1
    };
  });
}

module.exports = {
  calculateBMI,
  calculateMaintenanceCalories,
  calculateTargetCalories,
  calculateMacros,
  dietHealthNotes,
  generateWorkoutSplit
};
