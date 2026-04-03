'use strict';

const DB_ADAPTER = (process.env.DB_ADAPTER || 'mongo').toLowerCase();

// ── Knex / PostgreSQL implementation ─────────────────────────────────────────

if (DB_ADAPTER === 'knex') {
  const Knex = require('knex');
  const db = Knex({ client: 'pg', connection: process.env.DATABASE_URL });

  function toApi(row) {
    return {
      _id:       row.id,
      patientId: row.patient_id,
      type:      row.type,
      severity:  row.severity,
      title:     row.title,
      message:   row.message,
      status:    row.status,
      eventType: row.event_type,
      ruleId:    row.rule_id,
      eventData: row.event_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async function createNotification({ patientId, type, severity, title, message, eventType, ruleId, eventData }, dedupWindowHours = 24) {
    if (ruleId) {
      const cutoff = new Date(Date.now() - dedupWindowHours * 60 * 60 * 1000);
      const existing = await db('notifications')
        .where({ patient_id: String(patientId), rule_id: ruleId })
        .where('created_at', '>=', cutoff)
        .first();
      if (existing) return toApi(existing);
    }

    const [row] = await db('notifications').insert({
      patient_id: String(patientId),
      type,
      severity,
      title,
      message,
      status:     'pending',
      event_type: eventType || null,
      rule_id:    ruleId || null,
      event_data: eventData ? JSON.stringify(eventData) : null,
      updated_at: db.fn.now(),
    }).returning('*');
    return toApi(row);
  }

  async function getPendingNotifications(patientId) {
    const rows = await db('notifications')
      .where({ patient_id: String(patientId), status: 'pending' })
      .orderBy('created_at', 'desc');
    return rows.map(toApi);
  }

  async function getAllNotifications(patientId) {
    const rows = await db('notifications')
      .where({ patient_id: String(patientId) })
      .orderBy('created_at', 'desc')
      .limit(50);
    return rows.map(toApi);
  }

  async function acknowledgeNotification(id) {
    const rows = await db('notifications')
      .where({ id })
      .update({ status: 'acknowledged', updated_at: db.fn.now() })
      .returning('*');
    return rows.length ? toApi(rows[0]) : null;
  }

  async function createAuditEntry({ streamMsgId, eventType, patientId, payload }) {
    try {
      await db('ai_audit_log').insert({
        stream_msg_id: streamMsgId,
        event_type:    eventType,
        patient_id:    patientId ? String(patientId) : null,
        payload:       payload ? JSON.stringify(payload) : null,
      });
    } catch (err) {
      // 23505 = unique_violation (duplicate stream_msg_id) — idempotent, ignore
      if (err.code !== '23505') throw err;
    }
  }

  async function getAuditLog(patientId) {
    return db('ai_audit_log')
      .where({ patient_id: String(patientId) })
      .orderBy('processed_at', 'desc')
      .limit(100);
  }

  module.exports = {
    createNotification,
    getPendingNotifications,
    getAllNotifications,
    acknowledgeNotification,
    createAuditEntry,
    getAuditLog,
  };

} else {

// ── Mongoose / MongoDB implementation ────────────────────────────────────────

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
    eventType:  { type: String },
    ruleId:     { type: String },
    eventData:  { type: mongoose.Schema.Types.Mixed },
  }, { timestamps: true });

  notificationSchema.index({ patientId: 1, ruleId: 1, createdAt: -1 });

  const Notification = mongoose.models.Notification ||
    mongoose.model('Notification', notificationSchema, 'notifications');

  async function createNotification({ patientId, type, severity, title, message, eventType, ruleId, eventData }, dedupWindowHours = 24) {
    if (ruleId) {
      const cutoff = new Date(Date.now() - dedupWindowHours * 60 * 60 * 1000);
      const existing = await Notification.findOne({
        patientId,
        ruleId,
        createdAt: { $gte: cutoff },
      });
      if (existing) return existing;
    }

    return Notification.create({ patientId, type, severity, title, message, status: 'pending', eventType, ruleId, eventData });
  }

  async function getPendingNotifications(patientId) {
    return Notification.find({ patientId, status: 'pending' }).sort({ createdAt: -1 }).lean();
  }

  async function getAllNotifications(patientId) {
    return Notification.find({ patientId }).sort({ createdAt: -1 }).limit(50).lean();
  }

  async function acknowledgeNotification(id) {
    return Notification.findByIdAndUpdate(id, { status: 'acknowledged' }, { new: true });
  }

  // ── Audit Log ───────────────────────────────────────────────────────────────

  const auditLogSchema = new mongoose.Schema({
    streamMsgId: { type: String, required: true },
    eventType:   { type: String, required: true, index: true },
    patientId:   { type: String, index: true },
    payload:     { type: mongoose.Schema.Types.Mixed },
    processedAt: { type: Date, default: Date.now },
  }, { timestamps: false, collection: 'ai_audit_log' });

  auditLogSchema.index({ streamMsgId: 1 }, { unique: true });

  // 8.8.7 — append-only: reject any attempt to update or delete audit records
  auditLogSchema.pre('findOneAndUpdate', function() { throw new Error('ai_audit_log is append-only'); });
  auditLogSchema.pre('updateOne',        function() { throw new Error('ai_audit_log is append-only'); });
  auditLogSchema.pre('updateMany',       function() { throw new Error('ai_audit_log is append-only'); });
  auditLogSchema.pre('deleteOne',        function() { throw new Error('ai_audit_log is append-only'); });
  auditLogSchema.pre('deleteMany',       function() { throw new Error('ai_audit_log is append-only'); });

  const AuditLog = mongoose.models.AuditLog ||
    mongoose.model('AuditLog', auditLogSchema, 'ai_audit_log');

  async function createAuditEntry({ streamMsgId, eventType, patientId, payload }) {
    try {
      // 8.8.7 — write concern majority ensures durability for HIPAA audit trail
      await new AuditLog({ streamMsgId, eventType, patientId, payload }).save({ writeConcern: { w: 'majority' } });
    } catch (err) {
      if (!err.message.includes('E11000')) throw err;
    }
  }

  async function getAuditLog(patientId) {
    return AuditLog.find({ patientId }).sort({ processedAt: -1 }).limit(100).lean();
  }

  module.exports = {
    createNotification,
    getPendingNotifications,
    getAllNotifications,
    acknowledgeNotification,
    createAuditEntry,
    getAuditLog,
  };
}
