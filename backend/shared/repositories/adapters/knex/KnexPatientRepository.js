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

  async updateDemographics(patientId, demographics) {
    const row = await this.db('patients').where({ patientid: patientId }).first();
    if (!row) return null;
    const existing = row.demographics || {};
    const merged = { ...existing, ...demographics };
    await this.db('patients')
      .where({ patientid: patientId })
      .update({ demographics: JSON.stringify(merged), updated_at: new Date().toISOString() });
    return _mapPatient({ ...row, demographics: merged });
  }

  async create(data) {
    const rows = await this.db('patients').select('patientid').orderBy('patientid', 'desc').limit(1);
    const nextId = rows.length ? rows[0].patientid + 1 : 1001;
    const demographics = {
      mrn: data.mrn || `MRN-${nextId}`,
      dateOfBirth: data.dateOfBirth || null,
      gender: data.gender || null,
      legalName: { first: data.firstname, last: data.lastname },
    };
    const [inserted] = await this.db('patients').insert({
      patientid: nextId,
      firstname: data.firstname,
      lastname: data.lastname,
      demographics: JSON.stringify(demographics),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).returning('*');
    return _mapPatient(inserted);
  }

  async updateTopLevelName(patientId, fields) {
    const updates = {};
    if (fields.firstname) updates.firstname = fields.firstname;
    if (fields.lastname)  updates.lastname  = fields.lastname;
    if (!Object.keys(updates).length) return null;
    updates.updated_at = new Date().toISOString();
    await this.db('patients').where({ patientid: patientId }).update(updates);
    const row = await this.db('patients').where({ patientid: patientId }).first();
    return row ? _mapPatient(row) : null;
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
