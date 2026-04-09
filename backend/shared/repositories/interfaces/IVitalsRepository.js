'use strict';

/**
 * IVitalsRepository — abstract interface for patient vitals subdocument operations.
 */
class IVitalsRepository {
  /**
   * Return the vitals array for a patient.
   * @param {number} patientId
   * @returns {Promise<Array>}
   */
  async getVitals(patientId) {
    throw new Error(`${this.constructor.name} must implement getVitals()`);
  }

  /**
   * Append a new vital to the patient's vitals array.
   * @param {number} patientId
   * @param {Object} vital
   * @returns {Promise<Object>} the updated patient document
   */
  async addVital(patientId, vital) {
    throw new Error(`${this.constructor.name} must implement addVital()`);
  }

  /**
   * Update an existing vital by _id.
   * @param {number} patientId
   * @param {string} vitalId
   * @param {Object} data
   * @returns {Promise<Object|null>} the updated vital or null if not found
   */
  async updateVital(patientId, vitalId, data) {
    throw new Error(`${this.constructor.name} must implement updateVital()`);
  }

  /**
   * Soft-delete a vital by _id.
   * @param {number} patientId
   * @param {string} vitalId
   * @returns {Promise<boolean>}
   */
  async deleteVital(patientId, vitalId) {
    throw new Error(`${this.constructor.name} must implement deleteVital()`);
  }
}

module.exports = IVitalsRepository;
