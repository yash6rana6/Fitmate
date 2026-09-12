const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['plan_ready', 'feedback', 'reminder_daily', 'reminder_checkin', 'achievement', 'info'],
    default: 'info',
  },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

NotificationSchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
