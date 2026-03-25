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
    return patient.medications || [];
  }

  async addMedication(patientId, medication) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;

    if (!patient.medications) patient.medications = [];
    patient.medications.push({ ...medication, deletedAt: null });
    patient.markModified('medications'); // fix: was missing in original medications-service
    await patient.save();
    return patient;
  }
}

module.exports = MongoMedicationsRepository;
