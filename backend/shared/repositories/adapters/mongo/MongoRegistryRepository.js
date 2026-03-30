'use strict';

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const registrySchema = new mongoose.Schema({
  modules: [{
    id: String,
    name: String,
    description: String,
    icon: String,
    path: String,
    enabled: Boolean,
    framework: { type: String, enum: ['angular', 'react'] },
    roles: [String],
    order: Number,
    version: String,
    remoteEntry: String,
    remoteName: String,
    exposedModule: String
  }],
  version: { type: String, default: '1.0.0' },
  description: { type: String, default: 'PatientRecords Module Registry' }
}, { timestamps: true });

const Registry = mongoose.models.Registry || mongoose.model('Registry', registrySchema);

class MongoRegistryRepository {
  async seed() {
    const count = await Registry.countDocuments();
    if (count === 0) {
      const candidatePaths = [
        path.join(__dirname, '../../../../services/registry-service/registry.json'),
        path.join(process.cwd(), 'registry.json'),
      ];
      const filePath = candidatePaths.find(p => fs.existsSync(p));
      if (filePath) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        await Registry.create({ modules: data.modules, version: data.version, description: data.description });
        console.log(`Registry seeded with ${data.modules.length} modules`);
      } else {
        console.warn('[registry] registry.json not found, registry will be empty');
      }
    } else {
      console.log(`Registry already has ${count} entries`);
    }
  }

  async getRegistry() {
    return Registry.findOne({}).lean();
  }

  async addModule(module) {
    const registry = await Registry.findOne({});
    if (!registry) throw new Error('Registry not found');
    if (registry.modules.find(m => m.id === module.id)) {
      const err = new Error('Module already exists'); err.status = 409; throw err;
    }
    registry.modules.push(module);
    await registry.save();
    return module;
  }

  async updateModule(id, data) {
    const registry = await Registry.findOne({});
    if (!registry) throw new Error('Registry not found');
    const module = registry.modules.find(m => m.id === id);
    if (!module) { const err = new Error('Module not found'); err.status = 404; throw err; }
    Object.assign(module, data);
    await registry.save();
    return module;
  }

  async deleteModule(id) {
    const registry = await Registry.findOne({});
    if (!registry) throw new Error('Registry not found');
    const index = registry.modules.findIndex(m => m.id === id);
    if (index === -1) { const err = new Error('Module not found'); err.status = 404; throw err; }
    registry.modules.splice(index, 1);
    await registry.save();
  }

  async toggleModule(id, enabled) {
    const registry = await Registry.findOne({});
    if (!registry) throw new Error('Registry not found');
    const module = registry.modules.find(m => m.id === id);
    if (!module) { const err = new Error('Module not found'); err.status = 404; throw err; }
    module.enabled = enabled !== undefined ? enabled : !module.enabled;
    await registry.save();
    return module;
  }
}

module.exports = MongoRegistryRepository;
