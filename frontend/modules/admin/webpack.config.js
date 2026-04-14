const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

const mfConfig = {
  name: 'adminApp',
  filename: 'remoteEntry.js',
  exposes: {
    './AdminModule': './src/app/admin/admin.module.ts',
    './AdminRoutes': './src/app/admin/admin.routes.ts',
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
