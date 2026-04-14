'use strict';

/**
 * IPatientRepository — abstract interface for patient document operations.
 * All adapters must implement every method; unimplemented methods throw at runtime.
 */
class IPatientRepository {
  /**
   * Return a list of patients matching an optional search query.
   * @param {string|null} q - free-text search (matches patientid, firstname, lastname)
   * @returns {Promise<Array>} array of patient summary objects
   */
  async list(q) {
    throw new Error(`${this.constructor.name} must implement list()`);
  }

  /**
   * Return a single patient document by numeric patientid.
   * @param {number} patientId
   * @returns {Promise<Object|null>}
   */
  async getByPatientId(patientId) {
    throw new Error(`${this.constructor.name} must implement getByPatientId()`);
  }

  /**
   * Merge-update the demographics sub-document for a patient.
   * @param {number} patientId
   * @param {Object} demographics  partial or full demographics fields
   * @returns {Promise<Object|null>} updated patient, or null if not found
   */
  async updateDemographics(patientId, demographics) {
    throw new Error(`${this.constructor.name} must implement updateDemographics()`);
  }

  /**
   * Create a new patient record.
   * @param {Object} data - { firstname, lastname, dateOfBirth, gender, mrn }
   * @returns {Promise<Object>} the created patient document
   */
  async create(data) {
    throw new Error(`${this.constructor.name} must implement create()`);
  }

  /**
   * Sync top-level firstname/lastname fields (after a legalName demographics change).
   * @param {number} patientId
   * @param {Object} fields - { firstname?, lastname? }
   * @returns {Promise<Object|null>} updated patient, or null if not found
   */
  async updateTopLevelName(patientId, fields) {
    throw new Error(`${this.constructor.name} must implement updateTopLevelName()`);
  }
}

module.exports = IPatientRepository;
