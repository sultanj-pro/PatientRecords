'use strict';

const { getKnexClient } = require('../../../db/knexClient');
const IPatientRepository = require('../../interfaces/IPatientRepository');

class KnexPatientRepository extends IPatientRepository {
  get db() {
    return getKnexClient();
  }

  async list(q) {
    let query = this.db('patients').select('*').orderBy('patientid');
    if (q) {
      const term = String(q).toLowerCase().trim();
      const numericId = parseInt(term, 10);
      query = query.where((builder) => {
        if (!isNaN(numericId)) {
          builder.orWhere('patientid', numericId);
        }
        builder
          .orWhereRaw('lower(firstname) LIKE ?', [`%${term}%`])
          .orWhereRaw('lower(lastname) LIKE ?', [`%${term}%`]);
      });
    }
    const rows = await query;
    return rows.map(_mapPatient);
  }

  async getByPatientId(patientId) {
    const row = await this.db('patients').where({ patientid: patientId }).first();
    if (!row) return null;
    return _mapPatient(row);
  }
}

function _mapPatient(row) {
  return {
    _id: row.id,
    patientid: row.patientid,
    firstname: row.firstname,
    lastname: row.lastname,
    demographics: row.demographics || {},
    allergies: row.allergies || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = KnexPatientRepository;
