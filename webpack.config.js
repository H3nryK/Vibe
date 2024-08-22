const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

let localCanisters, prodCanisters, canisters;

function initCanisterIds() {
  try {
    localCanisters = require(path.resolve('.dfx', 'local', 'canister_ids.json'));
  } catch (error) {
    console.log('No local canister_ids.json found. Continuing production');
  }
  try {
    prodCanisters = require(path.resolve('canister_ids.json'));
  } catch (error) {
    console.log('No production canister_ids.json found. Continuing with local');
  }

  const network =
    process.env.DFX_NETWORK ||
    (process.env.NODE_ENV === 'production' ? 'ic' : 'local');

  canisters = network === 'local' ? localCanisters : prodCanisters;

  for (const canister in canisters) {
    process.env[canister.toUpperCase() + '_CANISTER_ID'] =
      canisters[canister][network];
  }
}
initCanisterIds();

const isDevelopment = process.env.NODE_ENV !== 'production';
const asset_entry = path.join(
  'src',
  'chat_app_assets',
  'src',
  'index.html'
);

module.exports = {
  target: 'web',
  mode: isDevelopment ? 'development' : 'production',
  entry: {
    index: path.join(__dirname, asset_entry).replace(/\.html$/, '.js'),
  },
  devtool: isDevelopment ? 'source-map' : false,
  optimization: {
    minimize: !isDevelopment,
    minimizer: [new TerserPlugin()],
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx'],
    fallback: {
      assert: require.resolve('assert/'),
      buffer: require.resolve('buffer/'),
      events: require.resolve('events/'),
      stream: require.resolve('stream-browserify/'),
      util: require.resolve('util/'),
    },
  },
  output: {
    filename: 'index.js',
    path: path.join(__dirname, 'dist', 'chat_app_assets'),
  },
  module: {
    rules: [
      { test: /\.(ts|tsx|jsx)$/, loader: 'ts-loader' },
      { test: /\.css$/, use: ['style-loader','css-loader'] }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, asset_entry),
      cache: false
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.join(__dirname, 'src', 'chat_app_assets', 'assets'),
          to: path.join(__dirname, 'dist', 'chat_app_assets'),
        },
      ],
    }),
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development',
      CHAT_APP_CANISTER_ID: canisters['chat_app']
    }),
    new webpack.ProvidePlugin({
      Buffer: [require.resolve('buffer/'), 'Buffer'],
      process: require.resolve('process/browser'),
    }),
  ],
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        pathRewrite: {
          '^/api': '/api',
        },
      },
    },
    hot: true,
    static: {
      directory: path.resolve(__dirname, './src/chat_app_assets'),
    },
    historyApiFallback: true,
    watchFiles: ['src/**/*.{js,ts,jsx,tsx}'],
  },
};