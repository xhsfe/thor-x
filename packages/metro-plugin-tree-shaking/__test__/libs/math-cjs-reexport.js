module.exports = {
  get Math() {
    // eslint-disable-next-line global-require
    return require('./math')
  },
  get Empty() {
    return () => 'empty'
  },
}
