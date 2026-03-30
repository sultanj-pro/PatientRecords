'use strict';

const { getKnexClient } = require('../../../db/knexClient');
const IVisitsRepository = require('../../interfaces/IVisitsRepository');

class KnexVisitsRepository extends IVisitsRepository {
  get db() {
    return getKnexClient();
  }

  async getVisits(patientId) {
    const patient = await this.db('patients').where({ patientid: patientId }).first();
    if (!patient) return null;

    const rows = await this.db('visits')
      .where({ patient_id: patientId })
      .orderBy('created_at', 'asc');

    return rows.map(_mapRow);
  }

  async addVisit(patientId, visit) {
    const patient = await this.db('patients').where({ patientid: patientId }).first();
    if (!patient) return null;

    await this.db('visits').insert({
      patient_id: patientId,
      data: JSON.stringify({ ...visit, deletedAt: null }),
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

module.exports = KnexVisitsRepository;
