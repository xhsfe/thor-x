/* eslint-disable @typescript-eslint/no-unused-vars */
module.exports = function treeShakingPreset(api, options, dirname) {
  return {
    plugins: [['@xhsfe/babel-plugin-tree-shaking', options]],
  }
}
