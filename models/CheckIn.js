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

const CheckInSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  week_number: { type: Number, required: true },
  weight_kg: { type: Number, required: true },
  measurements: { type: MeasurementsSchema, default: undefined },
  adherence_rating: { type: Number, min: 1, max: 5, required: true },
  struggles: { type: [String], default: [] },
  note: { type: String, default: '' },
  // Only a compressed thumbnail (small base64 data URI) is ever persisted.
  // The full-resolution upload is processed in-memory by Gemini and discarded.
  photo_url: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
});

CheckInSchema.index({ user_id: 1, week_number: 1 }, { unique: true });

module.exports = mongoose.models.CheckIn || mongoose.model('CheckIn', CheckInSchema);
