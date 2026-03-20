'use strict';

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  patientId:  { type: String, required: true, index: true },
  type:       {
    type: String,
    enum: ['event-escalation', 'visit-overdue', 'care-gap', 'medication-review'],
    required: true,
  },
  severity:   { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true },
  title:      { type: String, required: true },
  message:    { type: String, required: true },
  status:     { type: String, enum: ['pending', 'acknowledged'], default: 'pending' },
  // For event-driven notifications:
  eventType:  { type: String },
  ruleId:     { type: String },
  eventData:  { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

// Prevent exact duplicates: same patient + rule within a short window
notificationSchema.index({ patientId: 1, ruleId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema, 'notifications');

/**
 * Create a notification if an identical one (same patientId + ruleId) hasn't been
 * created in the last dedupWindowHours. Returns the new or existing notification.
 */
async function createNotification({ patientId, type, severity, title, message, eventType, ruleId, eventData }, dedupWindowHours = 24) {
  if (ruleId) {
    const cutoff = new Date(Date.now() - dedupWindowHours * 60 * 60 * 1000);
    const existing = await Notification.findOne({
      patientId,
      ruleId,
      createdAt: { $gte: cutoff },
    });
    if (existing) return existing; // already notified recently
  }

  return Notification.create({ patientId, type, severity, title, message, status: 'pending', eventType, ruleId, eventData });
}

/**
 * Return all pending notifications for a patient, newest first.
 */
async function getPendingNotifications(patientId) {
  return Notification.find({ patientId, status: 'pending' }).sort({ createdAt: -1 }).lean();
}

/**
 * Return all notifications (any status) for a patient, newest first, capped at 50.
 */
async function getAllNotifications(patientId) {
  return Notification.find({ patientId }).sort({ createdAt: -1 }).limit(50).lean();
}

/**
 * Acknowledge a notification by ID. Returns updated doc or null if not found.
 */
async function acknowledgeNotification(id) {
  return Notification.findByIdAndUpdate(id, { status: 'acknowledged' }, { new: true });
}

module.exports = {
  createNotification,
  getPendingNotifications,
  getAllNotifications,
  acknowledgeNotification,
};
