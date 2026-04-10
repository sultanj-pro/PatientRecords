'use strict';

const DB_ADAPTER = (process.env.DB_ADAPTER || 'mongo').toLowerCase();

// ── Knex / PostgreSQL implementation ─────────────────────────────────────────

if (DB_ADAPTER === 'knex') {
  const Knex = require('knex');
  const db = Knex({ client: 'pg', connection: process.env.DATABASE_URL });

  /** Map a PG row to the camelCase shape that server.js / the API expects. */
  function toApi(row) {
    return {
      _id:        row.id,
      patientId:  row.patient_id,
      context:    row.context,
      findings:   row.findings,
      status:     row.status,
      llmSummary: row.llm_summary,
      createdAt:  row.created_at,
      updatedAt:  row.updated_at,
    };
  }

  async function createRecommendation(patientId, context, findings = [], llmSummary = null) {
    const [row] = await db('ai_recommendations').insert({
      patient_id:  String(patientId),
      context:     JSON.stringify(context),
      findings:    JSON.stringify(findings),
      status:      'pending',
      llm_summary: llmSummary || null,
      updated_at:  db.fn.now(),
    }).returning('*');
    return toApi(row);
  }

  async function getRecommendations(patientId) {
    const rows = await db('ai_recommendations')
      .where({ patient_id: String(patientId) })
      .orderBy('created_at', 'desc');
    return rows.map(toApi);
  }

  async function setStatus(id, newStatus) {
    const existing = await db('ai_recommendations').where({ id }).first();
    if (!existing) return null;

    if (existing.status !== 'pending') {
      const err = new Error(
        `Cannot change status: recommendation is already "${existing.status}"`
      );
      err.code = 'IMMUTABLE_STATUS';
      throw err;
    }

    const [row] = await db('ai_recommendations')
      .where({ id })
      .update({ status: newStatus, updated_at: db.fn.now() })
      .returning('*');
    return toApi(row);
  }

  async function deleteAllRecommendations(patientId) {
    const count = await db('ai_recommendations')
      .where({ patient_id: String(patientId) })
      .delete();
    return { deleted: count };
  }

  async function getById(id) {
    const row = await db('ai_recommendations').where({ id }).first();
    return row ? toApi(row) : null;
  }

  async function updateSummary(id, llmSummary) {
    const [row] = await db('ai_recommendations')
      .where({ id })
      .update({ llm_summary: llmSummary, updated_at: db.fn.now() })
      .returning('*');
    return row ? toApi(row) : null;
  }

  module.exports = { createRecommendation, getRecommendations, setStatus, deleteAllRecommendations, getById, updateSummary };

} else {

// ── Mongoose / MongoDB implementation ────────────────────────────────────────

  const mongoose = require('mongoose');

  const recommendationSchema = new mongoose.Schema(
    {
      patientId:  { type: String, required: true, index: true },
      context:    { type: mongoose.Schema.Types.Mixed, required: true },
      findings:   [{ type: mongoose.Schema.Types.Mixed }],
      status:     { type: String, enum: ['pending', 'approved', 'dismissed'], default: 'pending' },
      llmSummary: { type: String, default: null },
    },
    { timestamps: true }
  );

  const Recommendation = mongoose.models.Recommendation ||
    mongoose.model('Recommendation', recommendationSchema, 'ai_recommendations');

  async function createRecommendation(patientId, context, findings = [], llmSummary = null) {
    const rec = new Recommendation({ patientId: String(patientId), context, findings, llmSummary });
    return rec.save();
  }

  async function getRecommendations(patientId) {
    return Recommendation.find({ patientId: String(patientId) }).sort({ createdAt: -1 }).lean();
  }

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

  async function deleteAllRecommendations(patientId) {
    const result = await Recommendation.deleteMany({ patientId: String(patientId) });
    return { deleted: result.deletedCount };
  }

  async function getById(id) {
    return Recommendation.findById(id).lean();
  }

  async function updateSummary(id, llmSummary) {
    return Recommendation.findByIdAndUpdate(id, { llmSummary }, { new: true }).lean();
  }

  module.exports = { createRecommendation, getRecommendations, setStatus, deleteAllRecommendations, getById, updateSummary };
}
