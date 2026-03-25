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
}

module.exports = IPatientRepository;
