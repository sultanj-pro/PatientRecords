'use strict';

const { getKnexClient } = require('../../../db/knexClient');
const fs = require('fs');
const path = require('path');

class KnexRegistryRepository {
  get db() {
    return getKnexClient();
  }

  async seed() {
    const rows = await this.db('registry').count('id as cnt');
    if (parseInt(rows[0].cnt, 10) === 0) {
      // Support both local dev and Docker container layouts
      const candidatePaths = [
        path.join(__dirname, '../../../../services/registry-service/registry.json'),
        path.join(process.cwd(), 'registry.json'),
      ];
      const filePath = candidatePaths.find(p => fs.existsSync(p));
      if (filePath) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        await this.db('registry').insert({
          version: data.version,
          description: data.description,
          modules: JSON.stringify(data.modules)
        });
        console.log(`[registry] Seeded ${data.modules.length} modules into PostgreSQL`);
      } else {
        console.warn('[registry] registry.json not found, registry will be empty');
      }
    } else {
      console.log('[registry] PostgreSQL registry already seeded');
    }
  }

  async getRegistry() {
    const row = await this.db('registry').first();
    if (!row) return null;
    return {
      version: row.version,
      description: row.description,
      modules: row.modules
    };
  }

  async _getRow() {
    return this.db('registry').first();
  }

  async addModule(module) {
    const row = await this._getRow();
    if (!row) throw new Error('Registry not found');
    const modules = row.modules;
    if (modules.find(m => m.id === module.id)) {
      const err = new Error('Module already exists'); err.status = 409; throw err;
    }
    modules.push(module);
    await this.db('registry').where({ id: row.id }).update({ modules: JSON.stringify(modules), updated_at: this.db.fn.now() });
    return module;
  }

  async updateModule(id, data) {
    const row = await this._getRow();
    if (!row) throw new Error('Registry not found');
    const modules = row.modules;
    const idx = modules.findIndex(m => m.id === id);
    if (idx === -1) { const err = new Error('Module not found'); err.status = 404; throw err; }
    Object.assign(modules[idx], data);
    await this.db('registry').where({ id: row.id }).update({ modules: JSON.stringify(modules), updated_at: this.db.fn.now() });
    return modules[idx];
  }

  async deleteModule(id) {
    const row = await this._getRow();
    if (!row) throw new Error('Registry not found');
    const modules = row.modules;
    const idx = modules.findIndex(m => m.id === id);
    if (idx === -1) { const err = new Error('Module not found'); err.status = 404; throw err; }
    modules.splice(idx, 1);
    await this.db('registry').where({ id: row.id }).update({ modules: JSON.stringify(modules), updated_at: this.db.fn.now() });
  }

  async toggleModule(id, enabled) {
    const row = await this._getRow();
    if (!row) throw new Error('Registry not found');
    const modules = row.modules;
    const module = modules.find(m => m.id === id);
    if (!module) { const err = new Error('Module not found'); err.status = 404; throw err; }
    module.enabled = enabled !== undefined ? enabled : !module.enabled;
    await this.db('registry').where({ id: row.id }).update({ modules: JSON.stringify(modules), updated_at: this.db.fn.now() });
    return module;
  }
}

module.exports = KnexRegistryRepository;
