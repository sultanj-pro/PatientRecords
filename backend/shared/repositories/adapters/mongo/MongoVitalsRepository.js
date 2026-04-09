'use strict';

const mongoose = require('mongoose');
const IVitalsRepository = require('../../interfaces/IVitalsRepository');

const patientSchema = new mongoose.Schema({
  patientid: { type: Number, unique: true, required: true },
  vitals: mongoose.Schema.Types.Mixed,
}, { strict: false, timestamps: true });

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema, 'patients');

class MongoVitalsRepository extends IVitalsRepository {
  async getVitals(patientId) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;
    const vitals = patient.vitals || [];

    // Lazy migration: assign _id to existing records that don't have one
    let needsSave = false;
    vitals.forEach(v => {
      if (!v._id) {
        v._id = new mongoose.Types.ObjectId();
        needsSave = true;
      }
    });
    if (needsSave) {
      patient.markModified('vitals');
      await patient.save();
    }

    return vitals;
  }

  async addVital(patientId, vital) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;

    if (!patient.vitals) patient.vitals = [];

    patient.vitals.push({ ...vital, _id: new mongoose.Types.ObjectId(), deletedAt: null });
    patient.markModified('vitals');
    await patient.save();
    return patient;
  }

  async updateVital(patientId, vitalId, data) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;

    const vitals = patient.vitals || [];
    const idx = vitals.findIndex(v => String(v._id) === String(vitalId) && !v.deletedAt);
    if (idx === -1) return null;

    vitals[idx] = { ...vitals[idx], ...data, _id: vitals[idx]._id, deletedAt: null };
    patient.markModified('vitals');
    await patient.save();
    return vitals[idx];
  }

  async deleteVital(patientId, vitalId) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return false;

    const vitals = patient.vitals || [];
    const idx = vitals.findIndex(v => String(v._id) === String(vitalId) && !v.deletedAt);
    if (idx === -1) return false;

    vitals[idx].deletedAt = new Date().toISOString();
    patient.markModified('vitals');
    await patient.save();
    return true;
  }
}

module.exports = MongoVitalsRepository;
