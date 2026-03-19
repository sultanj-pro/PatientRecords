'use strict';

const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    // Snapshot of patient context at time of recommendation generation
    context:   { type: mongoose.Schema.Types.Mixed, required: true },
    // Findings produced by domain agents (populated in later milestones)
    findings:  [{ type: mongoose.Schema.Types.Mixed }],
    // Status lifecycle: pending → approved | dismissed (transitions are one-way)
    status:    { type: String, enum: ['pending', 'approved', 'dismissed'], default: 'pending' },
  },
  { timestamps: true }
);

const Recommendation = mongoose.model(
  'Recommendation',
  recommendationSchema,
  'ai_recommendations'
);

/** Store a new recommendation in pending state. */
async function createRecommendation(patientId, context, findings = []) {
  const rec = new Recommendation({
    patientId: String(patientId),
    context,
    findings,
  });
  return rec.save();
}

/** List all recommendations for a patient, newest first. */
async function getRecommendations(patientId) {
  return Recommendation.find({ patientId: String(patientId) })
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Transition a recommendation's status to approved or dismissed.
 * Throws with code 'IMMUTABLE_STATUS' if the record is already resolved.
 */
async function setStatus(id, newStatus) {
  const rec = await Recommendation.findById(id);
  if (!rec) return null;

  if (rec.status !== 'pending') {
    const err = new Error(
      `Cannot change status: recommendation is already "${rec.status}"`
    );
    err.code = 'IMMUTABLE_STATUS';
    throw err;
  }

  rec.status = newStatus;
  return rec.save();
}

module.exports = { createRecommendation, getRecommendations, setStatus };
