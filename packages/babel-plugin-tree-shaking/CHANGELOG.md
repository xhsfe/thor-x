# @xhsfe/babel-plugin-tree-shaking

## 0.1.9

### Patch Changes

- 8642187: - Improved excludePatterns handling in tree shaking plugin

  Files matching excludePatterns are now properly marked with isExclude flag during the first build pass, and this flag is propagated to all their transitive dependencies.

  - New checkExclude option

  Added checkExclude option (default: true) to preserve excluded files and their dependencies during the second build phase.

  ```js
  [
    "metro-tree-shaking",
    {
      excludePatterns: [/my-custom-pattern/],
      checkExclude: true,
    },
  ];
  ```

## 0.1.8

### Patch Changes

- 05ca0e5: feat: treeShaking support `excludePatterns` optional paramater

  Example:

  ```js [babel.config.js]
  module.exports = {
    presets: [
      [
        "module:@xhsfe/metro-plugin-tree-shaking",
        { excludePatterns: [new RegExp("/react/")] },
      ],
    ],
  };
  ```

## 0.1.7

### Patch Changes

- fix(cache): frozen file metadata after pass it to metro

## 0.1.6

### Patch Changes

- fix(cache): only write treeShakingMeta in pre build stage

## 0.1.5

### Patch Changes

- fix: make file cache location compatible with before

Some internal plugin (code splitting) may depend on pre cache location

## 0.1.4

### Patch Changes

- Improve internal cache behavior.
  1. Use `unstable_transformResultKey` as cache key if possible
  2. store the same tree shaking metadata in `file.metadata`

## 0.1.3

### Patch Changes

- pass tree shaking meta into babel file metadata

  [Internal] store the babel file metadata into metro transform cache

## 0.1.0

- 🎉 First Release
