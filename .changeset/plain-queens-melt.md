---
"@xhsfe/babel-plugin-tree-shaking": patch
---

- Improved excludePatterns handling in tree shaking plugin

Files matching excludePatterns are now properly marked with isExclude flag during the first build pass, and this flag is propagated to all their transitive dependencies.

- New checkExclude option

Added checkExclude option (default: true) to preserve excluded files and their dependencies during the second build phase.

```js
['metro-tree-shaking', {
  excludePatterns: [/my-custom-pattern/],
  checkExclude: true
}]
```


