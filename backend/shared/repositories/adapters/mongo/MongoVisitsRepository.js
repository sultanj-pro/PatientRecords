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
    const visits = patient.visits || [];

    // Lazy migration: assign _id to existing records that don't have one
    let needsSave = false;
    visits.forEach(v => {
      if (!v._id) {
        v._id = new mongoose.Types.ObjectId();
        needsSave = true;
      }
    });
    if (needsSave) {
      patient.markModified('visits');
      await patient.save();
    }
    return visits;
  }

  async addVisit(patientId, visit) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;

    if (!patient.visits) patient.visits = [];
    patient.visits.push({ ...visit, _id: new mongoose.Types.ObjectId(), deletedAt: null });
    patient.markModified('visits');
    await patient.save();
    return patient;
  }

  async updateVisit(patientId, visitId, data) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return null;

    const visits = patient.visits || [];
    const idx = visits.findIndex(v => String(v._id) === String(visitId) && !v.deletedAt);
    if (idx === -1) return null;

    visits[idx] = { ...visits[idx], ...data, _id: visits[idx]._id, deletedAt: null };
    patient.markModified('visits');
    await patient.save();
    return visits[idx];
  }

  async deleteVisit(patientId, visitId) {
    const patient = await Patient.findOne({ patientid: patientId });
    if (!patient) return false;

    const visits = patient.visits || [];
    const idx = visits.findIndex(v => String(v._id) === String(visitId) && !v.deletedAt);
    if (idx === -1) return false;

    visits[idx].deletedAt = new Date().toISOString();
    patient.markModified('visits');
    await patient.save();
    return true;
  }
}

module.exports = MongoVisitsRepository;
