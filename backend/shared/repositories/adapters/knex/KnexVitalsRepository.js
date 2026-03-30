'use strict';

const { getKnexClient } = require('../../../db/knexClient');
const IVitalsRepository = require('../../interfaces/IVitalsRepository');

class KnexVitalsRepository extends IVitalsRepository {
  get db() {
    return getKnexClient();
  }

  async getVitals(patientId) {
    const patient = await this.db('patients').where({ patientid: patientId }).first();
    if (!patient) return null;

    const rows = await this.db('vitals')
      .where({ patient_id: patientId })
      .orderBy('created_at', 'asc');

    return rows.map(_mapVital);
  }

  async addVital(patientId, vital) {
    const patient = await this.db('patients').where({ patientid: patientId }).first();
    if (!patient) return null;

    if (vital.vital_description) {
      await this.db('vitals')
        .where({ patient_id: patientId, vital_description: vital.vital_description })
        .whereNull('deleted_at')
        .update({ deleted_at: new Date() });
    }

    await this.db('vitals').insert({
      patient_id: patientId,
      vital_description: vital.vital_description || null,
      data: JSON.stringify({ ...vital, deletedAt: null }),
      deleted_at: null,
    });

    return { patientid: patientId };
  }
}

function _mapVital(row) {
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
  return {
    ...data,
    deletedAt: row.deleted_at,
  };
}

module.exports = KnexVitalsRepository;
