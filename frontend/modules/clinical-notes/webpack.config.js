const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

const mfConfig = {
  name: 'clinicalNotesApp',
  filename: 'remoteEntry.js',
  exposes: {
    './ClinicalNotesModule': './src/app/clinical-notes.module.ts',
  },
  shared: shareAll({
    singleton: true,
    strictVersion: false,
    requiredVersion: false,
  }),
};

let config = withModuleFederationPlugin(mfConfig);

config.output = config.output || {};
config.output.publicPath = 'auto';

module.exports = config;
