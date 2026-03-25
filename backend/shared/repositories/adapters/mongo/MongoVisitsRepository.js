'use strict';

const mongoose = require('mongoose');
const IVisitsRepository = require('../../interfaces/IVisitsRepository');

const patientSchema = new mongoose.Schema({
  patientid: { type: Number, unique: true, required: true },
  visits: mongoose.Schema.Types.Mixed,
}, { strict: false, timestamps: true });

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema, 'patients');

class MongoVisitsRepository extends IVisitsRepository {
  async getVisits(patientId) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;
    return patient.visits || [];
  }

  async addVisit(patientId, visit) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;

    if (!patient.visits) patient.visits = [];
    patient.visits.push({ ...visit, deletedAt: null });
    patient.markModified('visits');
    await patient.save();
    return patient;
  }
}

module.exports = MongoVisitsRepository;
