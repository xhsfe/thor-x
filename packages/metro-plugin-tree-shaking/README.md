# @xhsfe/metro-plugin-tree-shaking

`@xhsfe/metro-plugin-tree-shaking` can provide tree shaking enhancement by generate optimize manifest in second-pass build.

For detail Design, Please read [Design Draft DOC](./DESIGN.md)

## Quick Start

1. Add Tree shaking metro presets before `module:metro-react-native-babel-preset`

`babel.config.js`
```js
module.exports = {
  presets: [
    ['module:@xhs/metro-plugin-tree-shaking', {}], // +
    ["module:metro-react-native-babel-preset", {}],
  ]
}
```

2. Use custom serializer on first build by `PRE_BUILD` and `DISABLE_OPTIMIZE` environment variables.

```js
/**
 * metro config for jest testing
 */

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const path = require('path')
import { serializer } from '@xhsfe/babel-plugin-tree-shaking'

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
```

3. Build twice to generate manifest for optimization and jsbundle separately

```sh
# METRO_TREE_SHAKING_CACHE_ROOT is recommended to set under os.tmpdir()
# generate manifest for optimization
PRE_BUILD=1 METRO_TREE_SHAKING_CACHE_ROOT=${METRO_TREE_SHAKING_CACHE_ROOT} react-native bundle --platform=android --entry-file=${ENTRY_FILE} --bundle-output=${BUNDLE_OUTPUT}/main.jsbundle --sourcemap-output=${BUNDLE_OUTPUT}/main.jsbundle.map --dev=true
# generate optimized jsbundle
METRO_TREE_SHAKING_CACHE_ROOT=${METRO_TREE_SHAKING_CACHE_ROOT} react-native bundle --platform=android --entry-file=${ENTRY_FILE} --bundle-output=${BUNDLE_OUTPUT}/main.jsbundle --sourcemap-output=${BUNDLE_OUTPUT}/main.jsbundle.map --dev=true
```

## Limitation

* `sideEffect` and `__PURE__` annotation is ignored currently.
* Build Time will be double without build cache.

## Production validation

`@xhsfe/metro-plugin-tree-shaking` has been used under production environment since 2024-04, 17+ application bundle enable it before 2024-12 and get 6% ~ 38% size reduction. We enable it by default in the latest tooling.

## Credits

Thanks to:

* The [esbuild](https://github.com/evanw/esbuild) project created by [@evanw](https://github.com/evanw), which inspire the tree shaking design.
