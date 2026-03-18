const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

const mfConfig = {
  name: 'careTeamApp',
  filename: 'remoteEntry.js',
  exposes: {
    './CareTeamModule': './src/app/care-team/care-team.module.ts',
    './CareTeamRoutes': './src/app/care-team/care-team.routes.ts',
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
