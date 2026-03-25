'use strict';

/**
 * ILabsRepository — abstract interface for patient lab results subdocument operations.
 */
class ILabsRepository {
  /**
   * Return the labs array for a patient.
   * @param {number} patientId
   * @returns {Promise<Array>}
   */
  async getLabs(patientId) {
    throw new Error(`${this.constructor.name} must implement getLabs()`);
  }

  /**
   * Append a new lab result to the patient's labs array.
   * @param {number} patientId
   * @param {Object} lab
   * @returns {Promise<Object>} the updated patient document
   */
  async addLab(patientId, lab) {
    throw new Error(`${this.constructor.name} must implement addLab()`);
  }
}

module.exports = ILabsRepository;
