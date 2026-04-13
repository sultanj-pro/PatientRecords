'use strict';

const mongoose = require('mongoose');
const ILabsRepository = require('../../interfaces/ILabsRepository');

const patientSchema = new mongoose.Schema({
  patientid: { type: Number, unique: true, required: true },
  labs: mongoose.Schema.Types.Mixed,
}, { strict: false, timestamps: true });

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema, 'patients');

class MongoLabsRepository extends ILabsRepository {
  async getLabs(patientId) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;
    const labs = patient.labs || [];

    // Lazy migration: assign _id to existing records that don't have one
    let needsSave = false;
    labs.forEach(l => {
      if (!l._id) {
        l._id = new mongoose.Types.ObjectId();
        needsSave = true;
      }
    });
    if (needsSave) {
      patient.markModified('labs');
      await patient.save();
    }

    return labs;
  }

  async addLab(patientId, lab) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;

    if (!patient.labs) patient.labs = [];
    patient.labs.push({ ...lab, _id: new mongoose.Types.ObjectId(), deletedAt: null });
    patient.markModified('labs');
    await patient.save();
    return patient;
  }

  async updateLab(patientId, labId, data) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;

    const labs = patient.labs || [];
    const idx = labs.findIndex(l => String(l._id) === String(labId) && !l.deletedAt);
    if (idx === -1) return null;

    labs[idx] = { ...labs[idx], ...data, _id: labs[idx]._id, deletedAt: null };
    patient.markModified('labs');
    await patient.save();
    return labs[idx];
  }

  async deleteLab(patientId, labId) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return false;

    const labs = patient.labs || [];
    const idx = labs.findIndex(l => String(l._id) === String(labId) && !l.deletedAt);
    if (idx === -1) return false;

    labs[idx].deletedAt = new Date().toISOString();
    patient.markModified('labs');
    await patient.save();
    return true;
  }
}

module.exports = MongoLabsRepository;
