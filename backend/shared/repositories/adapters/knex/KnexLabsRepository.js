'use strict';

const { getKnexClient } = require('../../../db/knexClient');
const ILabsRepository = require('../../interfaces/ILabsRepository');

class KnexLabsRepository extends ILabsRepository {
  get db() {
    return getKnexClient();
  }

  async getLabs(patientId) {
    const patient = await this.db('patients').where({ patientid: patientId }).first();
    if (!patient) return null;

    const rows = await this.db('labs')
      .where({ patient_id: patientId })
      .orderBy('created_at', 'asc');

    return rows.map(_mapRow);
  }

  async addLab(patientId, lab) {
    const patient = await this.db('patients').where({ patientid: patientId }).first();
    if (!patient) return null;

    await this.db('labs').insert({
      patient_id: patientId,
      data: JSON.stringify({ ...lab, deletedAt: null }),
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

module.exports = KnexLabsRepository;
