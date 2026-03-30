'use strict';

const { getKnexClient } = require('../../../db/knexClient');
const IMedicationsRepository = require('../../interfaces/IMedicationsRepository');

class KnexMedicationsRepository extends IMedicationsRepository {
  get db() {
    return getKnexClient();
  }

  async getMedications(patientId) {
    const patient = await this.db('patients').where({ patientid: patientId }).first();
    if (!patient) return null;

    const rows = await this.db('medications')
      .where({ patient_id: patientId })
      .orderBy('created_at', 'asc');

    return rows.map(_mapRow);
  }

  async addMedication(patientId, medication) {
    const patient = await this.db('patients').where({ patientid: patientId }).first();
    if (!patient) return null;

    await this.db('medications').insert({
      patient_id: patientId,
      data: JSON.stringify({ ...medication, deletedAt: null }),
      deleted_at: null,
    });

    return { patientid: patientId };
  }
}

function _mapRow(row) {
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
  return {
    ...data,
    deletedAt: row.deleted_at,
  };
}

module.exports = KnexMedicationsRepository;
