const mongoose = require('mongoose');

const DailyLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  week_number: { type: Number, required: true },
  day: { type: String, required: true }, // Monday..Sunday
  date: { type: String, required: true }, // 'YYYY-MM-DD', unique per user per date
  todos_completed: { type: [String], default: [] },
  xp_earned: { type: Number, default: 0 },
});

DailyLogSchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.models.DailyLog || mongoose.model('DailyLog', DailyLogSchema);
