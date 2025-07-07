---
'@xhsfe/babel-plugin-tree-shaking': patch
'@xhsfe/metro-plugin-tree-shaking': patch
---

feat: treeShaking support `excludePatterns` optional paramater

Example:

```js [babel.config.js]
module.exports = {
  presets: [['module:@xhsfe/metro-plugin-tree-shaking', { excludePatterns: [new RegExp('/react/')] }]],
}
```
