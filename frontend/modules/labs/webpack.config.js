const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

const mfConfig = {
  name: 'labsApp',
  filename: 'remoteEntry.js',
  exposes: {
    './LabsModule': './src/app/labs.module.ts',
  },
  shared: shareAll({
    singleton: true,
    strictVersion: false,
    requiredVersion: false,
  }),
};

let config = withModuleFederationPlugin(mfConfig);

// Configure output for Module Federation
config.output = config.output || {};
config.output.publicPath = 'auto'; // Use 'auto' for dynamic publicPath

module.exports = config;

