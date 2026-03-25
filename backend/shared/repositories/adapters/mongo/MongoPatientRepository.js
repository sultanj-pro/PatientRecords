'use strict';

const mongoose = require('mongoose');
const IPatientRepository = require('../../interfaces/IPatientRepository');

const patientSchema = new mongoose.Schema({
  patientid: { type: Number, unique: true, required: true },
  firstname: String,
  lastname: String,
  demographics: mongoose.Schema.Types.Mixed,
  allergies: mongoose.Schema.Types.Mixed,
  vitals: mongoose.Schema.Types.Mixed,
  labs: mongoose.Schema.Types.Mixed,
  medications: mongoose.Schema.Types.Mixed,
  visits: mongoose.Schema.Types.Mixed,
  careTeam: mongoose.Schema.Types.Mixed,
}, { strict: false, timestamps: true });

patientSchema.index({ patientid: 1 });
patientSchema.index({ firstname: 1 });
patientSchema.index({ lastname: 1 });

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema, 'patients');

class MongoPatientRepository extends IPatientRepository {
  async list(q) {
    let query = {};
    if (q) {
      const numericId = parseInt(q, 10);
      query = {
        $or: [
          ...(isNaN(numericId) ? [] : [{ patientid: numericId }]),
          { firstname: { $regex: q, $options: 'i' } },
          { lastname: { $regex: q, $options: 'i' } },
        ],
      };
    }
    return Patient.find(query)
      .select('patientid firstname lastname demographics')
      .limit(50);
  }

  async getByPatientId(patientId) {
    return Patient.findOne({ patientid: patientId });
  }
}

module.exports = MongoPatientRepository;
