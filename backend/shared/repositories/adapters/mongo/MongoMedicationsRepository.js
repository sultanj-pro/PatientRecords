'use strict';

const mongoose = require('mongoose');
const IMedicationsRepository = require('../../interfaces/IMedicationsRepository');

const patientSchema = new mongoose.Schema({
  patientid: { type: Number, unique: true, required: true },
  medications: mongoose.Schema.Types.Mixed,
}, { strict: false, timestamps: true });

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema, 'patients');

class MongoMedicationsRepository extends IMedicationsRepository {
  async getMedications(patientId) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;
    const meds = patient.medications || [];

    // Lazy migration: existing records stored without _id get one assigned & persisted
    let needsSave = false;
    meds.forEach(m => {
      if (!m._id) {
        m._id = new mongoose.Types.ObjectId();
        needsSave = true;
      }
    });
    if (needsSave) {
      patient.markModified('medications');
      await patient.save();
    }

    return meds;
  }

  async addMedication(patientId, medication) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;

    if (!patient.medications) patient.medications = [];
    // Always assign a stable _id so the record can be targeted by PUT/DELETE
    patient.medications.push({ ...medication, _id: new mongoose.Types.ObjectId(), deletedAt: null });
    patient.markModified('medications');
    await patient.save();
    return patient;
  }

  async updateMedication(patientId, medId, data) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;

    const meds = patient.medications || [];
    const idx = meds.findIndex(m => String(m._id) === String(medId) && !m.deletedAt);
    if (idx === -1) return null;

    meds[idx] = { ...meds[idx], ...data, _id: meds[idx]._id, deletedAt: null };
    patient.markModified('medications');
    await patient.save();
    return meds[idx];
  }

  async deleteMedication(patientId, medId) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return false;

    const meds = patient.medications || [];
    const idx = meds.findIndex(m => String(m._id) === String(medId) && !m.deletedAt);
    if (idx === -1) return false;

    meds[idx].deletedAt = new Date().toISOString();
    patient.markModified('medications');
    await patient.save();
    return true;
  }

  async getDiscontinuedMedications(patientId) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return [];
    return (patient.medications || []).filter(m => m.deletedAt);
  }

  async reactivateMedication(patientId, medId) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;

    const meds = patient.medications || [];
    const idx = meds.findIndex(m => String(m._id) === String(medId) && m.deletedAt);
    if (idx === -1) return null;

    meds[idx].deletedAt = null;
    patient.markModified('medications');
    await patient.save();
    return meds[idx];
  }
}

module.exports = MongoMedicationsRepository;
