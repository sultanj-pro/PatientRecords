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

  async updateMedication(patientId, medId, data) {
    const row = await this.db('medications')
      .where({ id: medId, patient_id: patientId })
      .whereNull('deleted_at')
      .first();
    if (!row) return null;

    const existing = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
    const updated = { ...existing, ...data, deletedAt: null };
    await this.db('medications')
      .where({ id: medId, patient_id: patientId })
      .update({ data: JSON.stringify(updated) });
    return updated;
  }

  async deleteMedication(patientId, medId) {
    const row = await this.db('medications')
      .where({ id: medId, patient_id: patientId })
      .whereNull('deleted_at')
      .first();
    if (!row) return false;

    await this.db('medications')
      .where({ id: medId, patient_id: patientId })
      .update({ deleted_at: new Date().toISOString() });
    return true;
  }

  async getDiscontinuedMedications(patientId) {
    const rows = await this.db('medications')
      .where({ patient_id: patientId })
      .whereNotNull('deleted_at')
      .orderBy('deleted_at', 'desc');
    return rows.map(_mapRow);
  }

  async reactivateMedication(patientId, medId) {
    const row = await this.db('medications')
      .where({ id: medId, patient_id: patientId })
      .whereNotNull('deleted_at')
      .first();
    if (!row) return null;

    await this.db('medications')
      .where({ id: medId, patient_id: patientId })
      .update({ deleted_at: null });
    return _mapRow(row);
  }
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
