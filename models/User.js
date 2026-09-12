const mongoose = require('mongoose');

const MeasurementsSchema = new mongoose.Schema(
  {
    chest: Number,
    waist: Number,
    thighs: Number,
    wrist: Number,
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema({
  telegram_id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  age: Number,
  height_cm: Number,
  weight_kg: Number,
  goal: {
    type: String,
    enum: ['fat_loss', 'muscle_gain', 'maintenance', 'general_fitness'],
  },
  activity_level: {
    type: String,
    enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
  },
  workout_location: { type: String, enum: ['gym', 'home'] },
  equipment: { type: [String], default: [] },
  diet_type: { type: String, enum: ['vegetarian', 'non_veg', 'flexible'] },
  budget_tier: { type: String, enum: ['low', 'mid', 'high'], default: undefined },
  region: { type: String, default: '' },
  medical_flags: { type: [String], default: [] },
  measurements: { type: MeasurementsSchema, default: undefined },
  onboarding_complete: { type: Boolean, default: false },
  current_week: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  last_active_date: { type: String, default: null }, // 'YYYY-MM-DD', used for streak calc
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
