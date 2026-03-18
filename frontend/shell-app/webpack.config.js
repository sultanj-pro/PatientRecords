const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

const mfConfig = {
  name: 'patientrecords-shell',
  filename: 'remoteEntry.js',
  exposes: {
    './AuthService': './src/app/core/services/auth.service.ts',
    './PatientContextService': './src/app/core/services/patient-context.service.ts',
  },
  remotes: {
    demographicsApp: 'http://localhost:4201/remoteEntry.js',
    vitalsApp: 'http://localhost:4202/remoteEntry.js',
    labsApp: 'http://localhost:4203/remoteEntry.js',
    medicationsApp: 'http://localhost:4204/remoteEntry.js',
    visitsApp: 'http://localhost:4205/remoteEntry.js',
    careTeamApp: 'http://localhost:4206/remoteEntry.js',
  },
  shared: {
    ...shareAll({
      singleton: true,
      strictVersion: false,
      requiredVersion: false,
    })
  },
};

let config = withModuleFederationPlugin(mfConfig);

// Configure output for Module Federation
config.output = config.output || {};
config.output.publicPath = 'auto'; // Use 'auto' for dynamic publicPath

module.exports = config;
