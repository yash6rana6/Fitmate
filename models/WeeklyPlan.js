const mongoose = require('mongoose');

const MealSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // breakfast|lunch|snack|dinner
    items: { type: [String], default: [] },
    calories: Number,
    protein_g: Number,
  },
  { _id: false }
);

const ExerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sets: Number,
    reps: String,
  },
  { _id: false }
);

const WorkoutSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['gym', 'home', 'rest'], default: 'rest' },
    exercises: { type: [ExerciseSchema], default: [] },
    duration_min: Number,
  },
  { _id: false }
);

const DaySchema = new mongoose.Schema(
  {
    day: { type: String, required: true }, // Monday..Sunday
    meals: { type: [MealSchema], default: [] },
    workout: { type: WorkoutSchema, default: () => ({}) },
    todos: { type: [String], default: [] },
  },
  { _id: false }
);

const TargetsSchema = new mongoose.Schema(
  {
    calories: Number,
    protein_g: Number,
    water_liters: Number,
  },
  { _id: false }
);

const FeedbackSchema = new mongoose.Schema(
  {
    summary: String,
    weight_change_kg: Number,
    adjustment_reason: String,
  },
  { _id: false }
);

const WeeklyPlanSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  week_number: { type: Number, required: true },
  targets: { type: TargetsSchema, default: () => ({}) },
  days: { type: [DaySchema], default: [] },
  coach_note: { type: String, default: '' },
  feedback: { type: FeedbackSchema, default: null },
  created_at: { type: Date, default: Date.now },
});

WeeklyPlanSchema.index({ user_id: 1, week_number: 1 }, { unique: true });

module.exports = mongoose.models.WeeklyPlan || mongoose.model('WeeklyPlan', WeeklyPlanSchema);
