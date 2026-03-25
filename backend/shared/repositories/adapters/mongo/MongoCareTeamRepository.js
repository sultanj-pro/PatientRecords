'use strict';

const mongoose = require('mongoose');
const ICareTeamRepository = require('../../interfaces/ICareTeamRepository');

const patientSchema = new mongoose.Schema({
  patientid: { type: Number, unique: true, required: true },
  careTeam: mongoose.Schema.Types.Mixed,
}, { strict: false, timestamps: true });

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema, 'patients');

class MongoCareTeamRepository extends ICareTeamRepository {
  async getCareTeam(patientId) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;
    return (patient.careTeam || []).filter((m) => !m.deletedAt);
  }

  async addMember(patientId, member) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;

    if (!patient.careTeam) patient.careTeam = [];

    if (member.isPrimary) {
      patient.careTeam.forEach((m) => {
        if (!m.deletedAt) m.isPrimary = false;
      });
    }

    patient.careTeam.push({ ...member, deletedAt: null });
    patient.markModified('careTeam');
    await patient.save();
    return patient;
  }

  async updateMember(patientId, memberId, updates) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;

    const member = (patient.careTeam || []).find(
      (m) => m._id?.toString() === memberId && !m.deletedAt
    );
    if (!member) return null;

    if (updates.isPrimary) {
      patient.careTeam.forEach((m) => {
        if (!m.deletedAt && m._id?.toString() !== memberId) m.isPrimary = false;
      });
    }

    Object.assign(member, updates);
    patient.markModified('careTeam');
    await patient.save();
    return member;
  }

  async removeMember(patientId, memberId) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return false;

    const member = (patient.careTeam || []).find(
      (m) => m._id?.toString() === memberId && !m.deletedAt
    );
    if (!member) return false;

    member.deletedAt = new Date();
    patient.markModified('careTeam');
    await patient.save();
    return true;
  }
}

module.exports = MongoCareTeamRepository;
