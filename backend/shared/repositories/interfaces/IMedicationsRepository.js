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

  /**
   * Replace a medication entry (full update).
   * @param {number} patientId
   * @param {string} medId
   * @param {Object} data  full replacement fields
   * @returns {Promise<Object|null>} updated medication, or null if not found
   */
  async updateMedication(patientId, medId, data) {
    throw new Error(`${this.constructor.name} must implement updateMedication()`);
  }

  /**
   * Soft-delete a medication (sets deletedAt timestamp).
   * @param {number} patientId
   * @param {string} medId
   * @returns {Promise<boolean>} true if deleted, false if not found
   */
  async deleteMedication(patientId, medId) {
    throw new Error(`${this.constructor.name} must implement deleteMedication()`);
  }

  /**
   * Return medications that have been soft-deleted (discontinued).
   * @param {number} patientId
   * @returns {Promise<Array>}
   */
  async getDiscontinuedMedications(patientId) {
    throw new Error(`${this.constructor.name} must implement getDiscontinuedMedications()`);
  }

  /**
   * Re-activate a discontinued medication (clears deletedAt).
   * @param {number} patientId
   * @param {string} medId
   * @returns {Promise<Object|null>} reactivated medication, or null if not found
   */
  async reactivateMedication(patientId, medId) {
    throw new Error(`${this.constructor.name} must implement reactivateMedication()`);
  }
}
module.exports = IMedicationsRepository;
