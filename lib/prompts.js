function buildWeek1Prompt(user) {
  return `You are a certified fitness and nutrition coach AI. Generate a 7-day diet and workout plan.

USER PROFILE:
- Name: ${user.name}
- Gender: ${user.gender}, Age: ${user.age}
- Height: ${user.height_cm} cm, Weight: ${user.weight_kg} kg
- Goal: ${user.goal}
- Activity level: ${user.activity_level}
- Workout location: ${user.workout_location} (equipment: ${(user.equipment || []).join(', ') || 'none specified'})
- Diet type: ${user.diet_type}
- Budget tier: ${user.budget_tier || 'not specified'}
- Region: ${user.region || 'not specified'}
- Medical flags: ${(user.medical_flags || []).join(', ') || 'none'}

RULES:
1. Diet must use only common, region-appropriate foods for the given budget tier. Do not invent exotic or expensive items.
2. Calculate estimated TDEE and set calorie/protein targets based on goal.
3. Workout must match workout location and equipment. If medical flags exist, avoid contraindicated exercises and add a caution note.
4. Output ONLY valid JSON matching this schema, no markdown or extra text:
{
  "targets": { "calories": number, "protein_g": number, "water_liters": number },
  "days": [
    { "day": "Monday", "meals": [{ "type": "breakfast", "items": ["..."], "calories": number, "protein_g": number }],
      "workout": { "type": "gym|home|rest", "exercises": [{ "name": "...", "sets": number, "reps": "..." }], "duration_min": number },
      "todos": ["..."] }
  ],
  "coach_note": "1-2 line note"
}`;
}

function buildAdaptivePlanPrompt({ previousTargets, startWeight, weight, measurements, adherenceRating, struggles, note }) {
  return `You are a certified fitness coach AI reviewing a client's weekly progress.

PREVIOUS WEEK TARGET: ${JSON.stringify(previousTargets)}
STARTING WEIGHT: ${startWeight} kg

THIS WEEK'S CHECK-IN:
- Current weight: ${weight} kg
- Measurements: ${JSON.stringify(measurements || {})}
- Adherence self-rating: ${adherenceRating}/5
- Reported struggles: ${(struggles && struggles.length) ? struggles.join(', ') : 'none reported'}
- User note: "${note || ''}"
- Progress photo: [attached image]

TASK:
1. Analyze the photo alongside the numbers — numbers (weight/measurement change) are the primary signal, photo is secondary/confirmatory.
2. If adherence was low (1-2), simplify next week's plan. If high (4-5) with progress, apply progressive overload. If no progress despite high adherence, flag a plateau and adjust calories/macros or workout split. Use the reported struggles to target the specific fix (e.g. "no equipment" -> swap to bodyweight alternatives, "time" -> shorten workouts/simplify meal prep, "diet" -> simplify the meal plan).
3. Output ONLY valid JSON:
{
  "feedback": { "summary": "...", "weight_change_kg": number, "adjustment_reason": "..." },
  "targets": {"calories": number, "protein_g": number, "water_liters": number},
  "days": [
    { "day": "Monday", "meals": [{ "type": "breakfast", "items": ["..."], "calories": number, "protein_g": number }],
      "workout": { "type": "gym|home|rest", "exercises": [{ "name": "...", "sets": number, "reps": "..." }], "duration_min": number },
      "todos": ["..."] }
  ]
}`;
}

module.exports = { buildWeek1Prompt, buildAdaptivePlanPrompt };
