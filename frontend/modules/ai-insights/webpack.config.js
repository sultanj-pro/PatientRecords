const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

const mfConfig = {
  name: 'aiInsightsApp',
  filename: 'remoteEntry.js',
  exposes: {
    './AiInsightsModule': './src/app/ai-insights.module.ts',
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
