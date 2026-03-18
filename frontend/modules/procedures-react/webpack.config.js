const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].js',
    publicPath: 'auto',
    clean: true,
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { 
                targets: { browsers: ['last 2 chrome versions', 'last 2 firefox versions'] } 
              }],
              ['@babel/preset-react', { runtime: 'automatic' }]
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'proceduresApp',
      filename: 'remoteEntry.js',
      exposes: {
        './ProceduresModule': './src/ProceduresModule.jsx'
      },
      shared: {
        react: {
          singleton: true,
          strictVersion: false,
          requiredVersion: false,
          eager: false
        },
        'react-dom': {
          singleton: true,
          strictVersion: false,
          requiredVersion: false,
          eager: false
        }
      }
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      favicon: false
    })
  ],
  devServer: {
    port: 4207,
    host: '0.0.0.0',
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    compress: true
  }
};
