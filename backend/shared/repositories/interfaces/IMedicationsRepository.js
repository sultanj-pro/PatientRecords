'use strict';

/**
 * IMedicationsRepository — abstract interface for patient medications subdocument operations.
 */
class IMedicationsRepository {
  /**
   * Return the medications array for a patient.
   * @param {number} patientId
   * @returns {Promise<Array>}
   */
  async getMedications(patientId) {
    throw new Error(`${this.constructor.name} must implement getMedications()`);
  }

  /**
   * Append a new medication to the patient's medications array.
   * @param {number} patientId
   * @param {Object} medication
   * @returns {Promise<Object>} the updated patient document
   */
  async addMedication(patientId, medication) {
    throw new Error(`${this.constructor.name} must implement addMedication()`);
  }
}

module.exports = IMedicationsRepository;
