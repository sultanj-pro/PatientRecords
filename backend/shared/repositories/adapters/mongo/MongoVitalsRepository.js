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
    return patient.vitals || [];
  }

  async addVital(patientId, vital) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;

    if (!patient.vitals) patient.vitals = [];

    // Soft-delete any existing vital with the same description (upsert-by-type)
    if (vital.vital_description) {
      patient.vitals.forEach((v) => {
        if (v.vital_description === vital.vital_description && !v.deletedAt) {
          v.deletedAt = new Date();
        }
      });
    }

    patient.vitals.push({ ...vital, deletedAt: null });
    patient.markModified('vitals');
    await patient.save();
    return patient;
  }
}

module.exports = MongoVitalsRepository;
