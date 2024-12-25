/**
 * metro config for jest testing
 */

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const path = require('path')
const { serializer } = require('../babel-plugin-tree-shaking/src/tree-shaking-plugin')

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  serializer: {
    customSerializer: process.env.PRE_BUILD && !process.env.DISABLE_OPTIMIZE ? serializer : undefined,
  },
  resolver: {
    unstable_enableSymlinks: true,
  },
  watchFolders: [path.join(__dirname, '..', '..', 'node_modules')],
  /** disable all stores for concurrent builds */
  cacheStores: [],
  // TODO: support IPC communications or other ways to store isLive information to serialize
  // maxWorkers: 1,
  // transformer: esbuildTransformerConfig,
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
