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
   * Soft-deletes any existing vital with the same vital_description before adding.
   * @param {number} patientId
   * @param {Object} vital
   * @returns {Promise<Object>} the updated patient document
   */
  async addVital(patientId, vital) {
    throw new Error(`${this.constructor.name} must implement addVital()`);
  }
}

module.exports = IVitalsRepository;
