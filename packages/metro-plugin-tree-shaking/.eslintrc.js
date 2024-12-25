const path = require('path')

module.exports = {
  extends: path.join(__dirname, '../../.eslintrc.js'),
  rules: {
    'consistent-return': 'off',
    'no-continue': 'off',
    'no-plusplus': 'off',
  },
}
