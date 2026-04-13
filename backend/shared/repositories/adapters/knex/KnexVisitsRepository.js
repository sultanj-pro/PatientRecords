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

    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();
    await this.db('visits').insert({
      patient_id: patientId,
      data: JSON.stringify({ ...visit, _id: id, deletedAt: null }),
      deleted_at: null,
    });

    return { patientid: patientId };
  }

  async updateVisit(patientId, visitId, data) {
    const rows = await this.db('visits').where({ patient_id: patientId }).whereNull('deleted_at');
    const row = rows.find(r => {
      const d = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
      return String(d._id) === String(visitId);
    });
    if (!row) return null;

    const current = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
    const updated = { ...current, ...data, _id: current._id, deletedAt: null };
    await this.db('visits').where({ id: row.id }).update({ data: JSON.stringify(updated) });
    return updated;
  }

  async deleteVisit(patientId, visitId) {
    const rows = await this.db('visits').where({ patient_id: patientId }).whereNull('deleted_at');
    const row = rows.find(r => {
      const d = typeof r.data === 'string' ? JSON.parse(r.data) : (r.data || {});
      return String(d._id) === String(visitId);
    });
    if (!row) return false;

    await this.db('visits').where({ id: row.id }).update({ deleted_at: new Date() });
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

module.exports = KnexVisitsRepository;
