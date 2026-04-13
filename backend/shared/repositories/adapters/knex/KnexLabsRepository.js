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

    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    await this.db('labs').insert({
      patient_id: patientId,
      data: JSON.stringify({ ...lab, _id: id, deletedAt: null }),
      deleted_at: null,
    });

    return { patientid: patientId };
  }

  async updateLab(patientId, labId, data) {
    const rows = await this.db('labs').where({ patient_id: patientId }).whereNull('deleted_at');
    const row = rows.find(r => {
      const d = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
      return String(d._id) === String(labId);
    });
    if (!row) return null;

    const current = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
    const updated = { ...current, ...data, _id: current._id, deletedAt: null };
    await this.db('labs').where({ id: row.id }).update({ data: JSON.stringify(updated) });
    return updated;
  }

  async deleteLab(patientId, labId) {
    const rows = await this.db('labs').where({ patient_id: patientId }).whereNull('deleted_at');
    const row = rows.find(r => {
      const d = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
      return String(d._id) === String(labId);
    });
    if (!row) return false;

    await this.db('labs').where({ id: row.id }).update({ deleted_at: new Date() });
    return true;
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
