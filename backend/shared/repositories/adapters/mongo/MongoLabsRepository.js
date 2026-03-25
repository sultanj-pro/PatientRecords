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
    return patient.labs || [];
  }

  async addLab(patientId, lab) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;

    if (!patient.labs) patient.labs = [];
    patient.labs.push({ ...lab, deletedAt: null });
    patient.markModified('labs'); // fix: was missing in original labs-service
    await patient.save();
    return patient;
  }
}

module.exports = MongoLabsRepository;
