'use strict';

const { getKnexClient } = require('../../../db/knexClient');
const ICareTeamRepository = require('../../interfaces/ICareTeamRepository');

class KnexCareTeamRepository extends ICareTeamRepository {
  get db() {
    return getKnexClient();
  }

  async getCareTeam(patientId) {
    const patient = await this.db('patients').where({ patientid: patientId }).first();
    if (!patient) return null;

    const rows = await this.db('care_team_members')
      .where({ patient_id: patientId })
      .whereNull('deleted_at')
      .orderBy('created_at', 'asc');

    return rows.map(_mapMember);
  }

  async addMember(patientId, member) {
    const patient = await this.db('patients').where({ patientid: patientId }).first();
    if (!patient) return null;

    if (member.isPrimary) {
      await this.db('care_team_members')
        .where({ patient_id: patientId })
        .whereNull('deleted_at')
        .update({ is_primary: false });
    }

    const [inserted] = await this.db('care_team_members')
      .insert({
        patient_id: patientId,
        name: member.name || null,
        role: member.role || null,
        specialty: member.specialty || null,
        phone: member.phone || null,
        email: member.email || null,
        organization: member.organization || null,
        start_date: member.startDate || null,
        end_date: member.endDate || null,
        is_primary: member.isPrimary ? true : false,
        deleted_at: null,
      })
      .returning('*');

    // Return shape compatible with care-team-service: patient.careTeam[last]
    return { careTeam: [_mapMember(inserted)] };
  }

  async updateMember(patientId, memberId, updates) {
    if (!memberId) return null;

    const existing = await this.db('care_team_members')
      .where({ id: memberId, patient_id: patientId })
      .whereNull('deleted_at')
      .first();
    if (!existing) return null;

    if (updates.isPrimary) {
      await this.db('care_team_members')
        .where({ patient_id: patientId })
        .whereNull('deleted_at')
        .whereNot({ id: memberId })
        .update({ is_primary: false });
    }

    const patch = {};
    if (updates.name !== undefined)        patch.name = updates.name;
    if (updates.role !== undefined)        patch.role = updates.role;
    if (updates.specialty !== undefined)   patch.specialty = updates.specialty;
    if (updates.phone !== undefined)       patch.phone = updates.phone;
    if (updates.email !== undefined)       patch.email = updates.email;
    if (updates.organization !== undefined) patch.organization = updates.organization;
    if (updates.startDate !== undefined)   patch.start_date = updates.startDate;
    if (updates.endDate !== undefined)     patch.end_date = updates.endDate;
    if (updates.isPrimary !== undefined)   patch.is_primary = updates.isPrimary;

    const [updated] = await this.db('care_team_members')
      .where({ id: memberId })
      .update(patch)
      .returning('*');

    return _mapMember(updated);
  }

  async removeMember(patientId, memberId) {
    if (!memberId) return false;

    const count = await this.db('care_team_members')
      .where({ id: memberId, patient_id: patientId })
      .whereNull('deleted_at')
      .update({ deleted_at: new Date() });

    return count > 0;
  }
}

function _mapMember(row) {
  return {
    _id: String(row.id),
    name: row.name,
    role: row.role,
    specialty: row.specialty,
    phone: row.phone,
    email: row.email,
    organization: row.organization,
    startDate: row.start_date,
    endDate: row.end_date,
    isPrimary: row.is_primary,
    deletedAt: row.deleted_at,
  };
}

module.exports = KnexCareTeamRepository;
