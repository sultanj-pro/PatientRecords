'use strict';

/**
 * Repository Factory
 *
 * Returns the correct repository adapter based on the DB_ADAPTER environment variable.
 * Defaults to 'mongo'. Set DB_ADAPTER=knex to use the relational adapter (Phase 7).
 *
 * Usage:
 *   const getRepository = require('../../shared/repositories/repositoryFactory');
 *   const repo = getRepository('vitals');
 *   const vitals = await repo.getVitals(patientId);
 */

const adapter = (process.env.DB_ADAPTER || 'mongo').toLowerCase();

const adapters = {
  mongo: {
    patient:       () => new (require('./adapters/mongo/MongoPatientRepository'))(),
    vitals:        () => new (require('./adapters/mongo/MongoVitalsRepository'))(),
    labs:          () => new (require('./adapters/mongo/MongoLabsRepository'))(),
    medications:   () => new (require('./adapters/mongo/MongoMedicationsRepository'))(),
    visits:        () => new (require('./adapters/mongo/MongoVisitsRepository'))(),
    careTeam:      () => new (require('./adapters/mongo/MongoCareTeamRepository'))(),
    clinicalNotes: () => new (require('./adapters/mongo/MongoClinicalNotesRepository'))(),
    registry:      () => new (require('./adapters/mongo/MongoRegistryRepository'))(),
  },
  knex: {
    patient:       () => new (require('./adapters/knex/KnexPatientRepository'))(),
    vitals:        () => new (require('./adapters/knex/KnexVitalsRepository'))(),
    labs:          () => new (require('./adapters/knex/KnexLabsRepository'))(),
    medications:   () => new (require('./adapters/knex/KnexMedicationsRepository'))(),
    visits:        () => new (require('./adapters/knex/KnexVisitsRepository'))(),
    careTeam:      () => new (require('./adapters/knex/KnexCareTeamRepository'))(),
    clinicalNotes: () => new (require('./adapters/knex/KnexClinicalNotesRepository'))(),
    registry:      () => new (require('./adapters/knex/KnexRegistryRepository'))(),
  },
};

const adapterMap = adapters[adapter];
if (!adapterMap) {
  throw new Error(`Unknown DB_ADAPTER: "${adapter}". Supported values: ${Object.keys(adapters).join(', ')}`);
}

/**
 * @param {'patient'|'vitals'|'labs'|'medications'|'visits'|'careTeam'|'clinicalNotes'} domain
 * @returns {IPatientRepository|IVitalsRepository|ILabsRepository|IMedicationsRepository|IVisitsRepository|ICareTeamRepository|IClinicalNotesRepository}
 */
function getRepository(domain) {
  const factory = adapterMap[domain];
  if (!factory) {
    throw new Error(`Unknown repository domain: "${domain}". Supported: ${Object.keys(adapterMap).join(', ')}`);
  }
  return factory();
}

module.exports = getRepository;
