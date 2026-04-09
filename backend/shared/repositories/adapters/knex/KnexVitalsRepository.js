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

    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    await this.db('vitals').insert({
      patient_id: patientId,
      vital_description: vital.vital_description || null,
      data: JSON.stringify({ ...vital, _id: id, deletedAt: null }),
      deleted_at: null,
    });

    return { patientid: patientId };
  }

  async updateVital(patientId, vitalId, data) {
    const rows = await this.db('vitals').where({ patient_id: patientId }).whereNull('deleted_at');
    const row = rows.find(r => {
      const d = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
      return String(d._id) === String(vitalId);
    });
    if (!row) return null;

    const current = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
    const updated = { ...current, ...data, _id: current._id, deletedAt: null };
    await this.db('vitals').where({ id: row.id }).update({
      vital_description: updated.vital_description || row.vital_description,
      data: JSON.stringify(updated),
    });
    return updated;
  }

  async deleteVital(patientId, vitalId) {
    const rows = await this.db('vitals').where({ patient_id: patientId }).whereNull('deleted_at');
    const row = rows.find(r => {
      const d = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
      return String(d._id) === String(vitalId);
    });
    if (!row) return false;

    await this.db('vitals').where({ id: row.id }).update({ deleted_at: new Date() });
    return true;
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
