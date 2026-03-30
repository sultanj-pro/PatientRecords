'use strict';

const { getKnexClient } = require('../../../db/knexClient');
const IClinicalNotesRepository = require('../../interfaces/IClinicalNotesRepository');

const VALID_TYPES = ['observation', 'diagnostic', 'prognosis', 'plan', 'general'];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

class KnexClinicalNotesRepository extends IClinicalNotesRepository {
  get db() {
    return getKnexClient();
  }

  async getNotes(patientId, options = {}) {
    const { type, limit = DEFAULT_LIMIT } = options;
    const cap = Math.min(limit, MAX_LIMIT);

    let query = this.db('clinical_notes')
      .where({ patient_id: patientId })
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc')
      .limit(cap);

    if (type && VALID_TYPES.includes(type)) {
      query = query.where({ type });
    }

    const rows = await query;
    return rows.map(_mapNote);
  }

  async createNote(note) {
    const [inserted] = await this.db('clinical_notes')
      .insert({
        patient_id: note.patientId,
        type: note.type || 'general',
        content: note.content,
        provider_id: note.providerId,
        provider_name: note.providerName,
        provider_role: note.providerRole || '',
        deleted_at: null,
      })
      .returning('*');
    return _mapNote(inserted);
  }

  async getNoteById(noteId) {
    if (!noteId) return null;

    const row = await this.db('clinical_notes')
      .where({ id: noteId })
      .whereNull('deleted_at')
      .first();
    return row ? _mapNote(row) : null;
  }

  async updateNote(noteId, updates) {
    if (!noteId) return null;

    const existing = await this.db('clinical_notes')
      .where({ id: noteId })
      .whereNull('deleted_at')
      .first();
    if (!existing) return null;

    const patch = { updated_at: new Date() };
    if (updates.content !== undefined) patch.content = updates.content;
    if (updates.type !== undefined)    patch.type = updates.type;

    const [updated] = await this.db('clinical_notes')
      .where({ id: noteId })
      .update(patch)
      .returning('*');
    return _mapNote(updated);
  }

  async deleteNote(noteId) {
    if (!noteId) return false;

    const count = await this.db('clinical_notes')
      .where({ id: noteId })
      .whereNull('deleted_at')
      .update({ deleted_at: new Date() });

    return count > 0;
  }
}

function _mapNote(row) {
  return {
    _id: String(row.id),
    patientId: row.patient_id,
    type: row.type,
    content: row.content,
    providerId: row.provider_id,
    providerName: row.provider_name,
    providerRole: row.provider_role,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = KnexClinicalNotesRepository;
