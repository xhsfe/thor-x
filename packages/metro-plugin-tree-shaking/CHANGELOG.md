# @xhsfe/metro-plugin-tree-shaking

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

- Updated dependencies [05ca0e5]
  - @xhsfe/babel-plugin-tree-shaking@0.1.8

## 0.1.7

### Patch Changes

- Updated dependencies
  - @xhsfe/babel-plugin-tree-shaking@0.1.7

## 0.1.6

### Patch Changes

- Updated dependencies
  - @xhsfe/babel-plugin-tree-shaking@0.1.6

## 0.1.5

### Patch Changes

- Updated dependencies
  - @xhsfe/babel-plugin-tree-shaking@0.1.5

## 0.1.4

### Patch Changes

- Updated dependencies
  - @xhsfe/babel-plugin-tree-shaking@0.1.4

## 0.1.3

### Patch Changes

- Updated dependencies
  - @xhsfe/babel-plugin-tree-shaking@0.1.3

## 0.1.0

- 🎉 First Release
