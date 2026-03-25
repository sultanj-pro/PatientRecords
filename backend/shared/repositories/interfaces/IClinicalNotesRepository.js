'use strict';

/**
 * IClinicalNotesRepository — abstract interface for clinical notes collection operations.
 * Clinical notes live in their own collection (not embedded in patients).
 */
class IClinicalNotesRepository {
  /**
   * Return notes for a patient, optional type filter, newest first.
   * @param {number} patientId
   * @param {Object} options
   * @param {string} [options.type]    - filter by note type
   * @param {number} [options.limit]   - max records to return (default 50, max 200)
   * @returns {Promise<Array>}
   */
  async getNotes(patientId, options) {
    throw new Error(`${this.constructor.name} must implement getNotes()`);
  }

  /**
   * Create a new clinical note.
   * @param {Object} note - { patientId, type, content, providerId, providerName, providerRole }
   * @returns {Promise<Object>} the created note document
   */
  async createNote(note) {
    throw new Error(`${this.constructor.name} must implement createNote()`);
  }

  /**
   * Find a non-deleted note by its document _id string.
   * @param {string} noteId
   * @returns {Promise<Object|null>}
   */
  async getNoteById(noteId) {
    throw new Error(`${this.constructor.name} must implement getNoteById()`);
  }

  /**
   * Update content and/or type on an existing note.
   * @param {string} noteId
   * @param {Object} updates - { content?, type? }
   * @returns {Promise<Object>} the updated note document
   */
  async updateNote(noteId, updates) {
    throw new Error(`${this.constructor.name} must implement updateNote()`);
  }

  /**
   * Soft-delete a note by setting deletedAt.
   * @param {string} noteId
   * @returns {Promise<boolean>} true if deleted, false if not found
   */
  async deleteNote(noteId) {
    throw new Error(`${this.constructor.name} must implement deleteNote()`);
  }
}

module.exports = IClinicalNotesRepository;
