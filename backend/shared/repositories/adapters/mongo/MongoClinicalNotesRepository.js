'use strict';

const mongoose = require('mongoose');
const IClinicalNotesRepository = require('../../interfaces/IClinicalNotesRepository');

const noteSchema = new mongoose.Schema({
  patientId: { type: Number, required: true, index: true },
  type: {
    type: String,
    enum: ['observation', 'diagnostic', 'prognosis', 'plan', 'general'],
    default: 'general',
  },
  content: { type: String, required: true },
  providerId: { type: String, required: true },
  providerName: { type: String, required: true },
  providerRole: { type: String, default: '' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

const Note = mongoose.models.ClinicalNote || mongoose.model('ClinicalNote', noteSchema, 'clinical_notes');

class MongoClinicalNotesRepository extends IClinicalNotesRepository {
  async getNotes(patientId, options = {}) {
    const { type, limit = 50 } = options;
    const cap = Math.min(limit, 200);
    const query = { patientId, deletedAt: null };
    if (type) query.type = type;
    return Note.find(query).sort({ createdAt: -1 }).limit(cap);
  }

  async createNote(note) {
    return Note.create(note);
  }

  async getNoteById(noteId) {
    return Note.findOne({ _id: noteId, deletedAt: null });
  }

  async updateNote(noteId, updates) {
    const note = await Note.findOne({ _id: noteId, deletedAt: null });
    if (!note) return null;
    if (updates.content !== undefined) note.content = updates.content;
    if (updates.type !== undefined) note.type = updates.type;
    await note.save();
    return note;
  }

  async deleteNote(noteId) {
    const note = await Note.findOne({ _id: noteId, deletedAt: null });
    if (!note) return false;
    note.deletedAt = new Date();
    await note.save();
    return true;
  }
}

module.exports = MongoClinicalNotesRepository;
