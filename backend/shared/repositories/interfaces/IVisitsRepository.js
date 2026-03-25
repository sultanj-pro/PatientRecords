'use strict';

/**
 * IVisitsRepository — abstract interface for patient visits subdocument operations.
 */
class IVisitsRepository {
  /**
   * Return the visits array for a patient.
   * @param {number} patientId
   * @returns {Promise<Array>}
   */
  async getVisits(patientId) {
    throw new Error(`${this.constructor.name} must implement getVisits()`);
  }

  /**
   * Append a new visit to the patient's visits array.
   * @param {number} patientId
   * @param {Object} visit
   * @returns {Promise<Object>} the updated patient document
   */
  async addVisit(patientId, visit) {
    throw new Error(`${this.constructor.name} must implement addVisit()`);
  }
}

module.exports = IVisitsRepository;
