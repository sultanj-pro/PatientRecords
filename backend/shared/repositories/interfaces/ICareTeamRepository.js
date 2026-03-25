'use strict';

/**
 * ICareTeamRepository — abstract interface for patient care team subdocument operations.
 */
class ICareTeamRepository {
  /**
   * Return the active (non-deleted) care team members for a patient.
   * @param {number} patientId
   * @returns {Promise<Array>}
   */
  async getCareTeam(patientId) {
    throw new Error(`${this.constructor.name} must implement getCareTeam()`);
  }

  /**
   * Append a new care team member.
   * If isPrimary is true, all other non-deleted members are demoted first.
   * @param {number} patientId
   * @param {Object} member
   * @returns {Promise<Object>} the updated patient document
   */
  async addMember(patientId, member) {
    throw new Error(`${this.constructor.name} must implement addMember()`);
  }

  /**
   * Update fields on an existing care team member identified by MongoDB subdoc _id string.
   * @param {number} patientId
   * @param {string} memberId - subdocument _id as string
   * @param {Object} updates   - fields to patch
   * @returns {Promise<Object|null>} the updated member, or null if not found
   */
  async updateMember(patientId, memberId, updates) {
    throw new Error(`${this.constructor.name} must implement updateMember()`);
  }

  /**
   * Soft-delete a care team member by setting deletedAt.
   * @param {number} patientId
   * @param {string} memberId - subdocument _id as string
   * @returns {Promise<boolean>} true if found and deleted, false if not found
   */
  async removeMember(patientId, memberId) {
    throw new Error(`${this.constructor.name} must implement removeMember()`);
  }
}

module.exports = ICareTeamRepository;
