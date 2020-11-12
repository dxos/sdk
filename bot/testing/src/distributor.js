//
// Copyright 2020 DXOS.org
//

import fs from 'fs-extra';
import path from 'path';
import webpack from 'webpack';
import { sync as readPackageJson } from 'read-pkg-up';
import tar from 'tar';
import fetch from 'node-fetch';

const BUILD_PATH = './out/builds/node';

const { packageJson: { dependencies }} = readPackageJson();

const excludeDependencies = ['../../node_modules\/(?!(simple-websocket)\/).*'].concat(
  Object.keys(dependencies)
    .filter(d => d.includes('@dxos'))
    .map(d => d + '/')
);

const getWebpackConfig = botPath => {
  return {
    target: 'node',

    mode: 'development',

    stats: 'errors-only',

    entry: path.resolve(botPath),

    output: {
      path: path.resolve(BUILD_PATH),
      filename: '[name].js',
      libraryTarget: 'commonjs2',
      devtoolModuleFilenameTemplate: '[absolute-resource-path]'
    },

    externals: {
      fatfs: 'fatfs',
      runtimejs: 'runtimejs',
      wrtc: 'wrtc',
      bip32: 'bip32',
      typeforce: 'typeforce'
    },

    resolve: {
      modules: ['node_modules']
    },

    plugins: [
      new webpack.IgnorePlugin(/\.\/native/),
      new webpack.IgnorePlugin(/^electron$/)
    ],

    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: new RegExp(`(${excludeDependencies.join('|')})`), // Don't transpile deps.
          use: {
            loader: 'babel-loader',
            options: {
              cacheDirectory: './dist/babel-cache/',
              // TODO(egorgripasov): Webpack does not see babel conf.
              ...JSON.parse(fs.readFileSync(path.resolve(__dirname, '../.babelrc'))),
            }
          }
        }
      ]
    }
  }
};

const buildBot = async (botPath) => {
  const webpackConf = getWebpackConfig(botPath);

  return new Promise((resolve, reject) => {
    webpack({ ...webpackConf, stats: 'errors-only' }, (err, stats) => {
      if (err /* || stats.hasErrors()*/) {
        reject(err);
      } else {
        resolve(stats);
      }
    });
  });
}

const publishBot = async ipfsEndpoint => {
  if (!ipfsEndpoint.endsWith('/')) {
    ipfsEndpoint = `${ipfsEndpoint}/`;
  }

  const response = await fetch(ipfsEndpoint, {
    method: 'POST',
    body: tar.c({ gzip: true, C: BUILD_PATH }, ['.'])
  });

  return response.headers.get('Ipfs-Hash');
}

/**
 * @param {string} ipfsEndpoint IPFS Gateway endpoint.
 * @param {string} botPath Path to bot file from cwd.
 */
export const buildAndPublishBot = async (ipfsEndpoint, botPath) => {
  await buildBot(botPath);
  return publishBot(ipfsEndpoint);
}
