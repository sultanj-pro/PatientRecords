'use strict';

const axios = require('axios');

const PATIENT_SERVICE_URL     = process.env.PATIENT_SERVICE_URL     || 'http://localhost:5002';
const VITALS_SERVICE_URL      = process.env.VITALS_SERVICE_URL      || 'http://localhost:5003';
const LABS_SERVICE_URL        = process.env.LABS_SERVICE_URL        || 'http://localhost:5004';
const MEDICATIONS_SERVICE_URL = process.env.MEDICATIONS_SERVICE_URL || 'http://localhost:5005';
const VISITS_SERVICE_URL      = process.env.VISITS_SERVICE_URL      || 'http://localhost:5006';

/**
 * Fetch a single context section. Failures return { error, url } so that a
 * single unreachable upstream doesn't abort the entire context build.
 */
async function fetchSection(url, authHeader) {
  try {
    const { data } = await axios.get(url, {
      headers: { Authorization: authHeader },
      timeout: 5000,
    });
    return data;
  } catch (err) {
    const status = err.response ? err.response.status : null;
    return { _error: err.message, _status: status, _url: url };
  }
}

/**
 * Build a full patient context by fanning out to all 5 domain services in
 * parallel. Returns an object with keys: patient, vitals, labs, medications,
 * visits. Each value is either the service payload or an error descriptor.
 *
 * @param {string|number} patientId
 * @param {string}        authHeader  e.g. "Bearer <token>"
 */
async function buildContext(patientId, authHeader) {
  const id = encodeURIComponent(String(patientId));

  const [patient, vitals, labs, medications, visits] = await Promise.all([
    fetchSection(`${PATIENT_SERVICE_URL}/api/patients/${id}`,             authHeader),
    fetchSection(`${VITALS_SERVICE_URL}/api/patients/${id}/vitals`,       authHeader),
    fetchSection(`${LABS_SERVICE_URL}/api/patients/${id}/labs`,           authHeader),
    fetchSection(`${MEDICATIONS_SERVICE_URL}/api/patients/${id}/medications`, authHeader),
    fetchSection(`${VISITS_SERVICE_URL}/api/patients/${id}/visits`,       authHeader),
  ]);

  return { patient, vitals, labs, medications, visits };
}

module.exports = { buildContext };
