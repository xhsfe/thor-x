/* eslint-disable no-void */
/* eslint-disable strict */

'use strict'

Object.defineProperty(exports, '__esModule', {
  value: true,
})
exports.default = void 0
exports.initReactI18next = void 0

// simplify
// eslint-disable-next-line @typescript-eslint/no-empty-function
const IconWrapper = (_name, impl) => impl

const _initInstance = _instance => _instance

// eslint-disable-next-line no-multi-assign, no-useless-concat, @typescript-eslint/no-unused-vars
const _default = exports.default = (0, IconWrapper)('arrow-left', props => `<svg width="${props.size}" height="${props.size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">` + `<path d="M15.7071 5.29289C16.0976 5.68342 16.0976 6.31658 15.7071 6.70711L10.4142 12L15.7071 17.2929C16.0976 17.6834 16.0976 18.3166 15.7071 18.7071C15.3166 19.0976 14.6834 19.0976 14.2929 18.7071L8.29289 12.7071C7.90237 12.3166 7.90237 11.6834 8.29289 11.2929L14.2929 5.29289C14.6834 4.90237 15.3166 4.90237 15.7071 5.29289Z" fill="${props.colors[0]}"/>` + '</svg>')

// eslint-disable-next-line no-multi-assign, @typescript-eslint/no-unused-vars
const initReactI18next = exports.initReactI18next = {
  type: '3rdParty',
  init(instance) {
    _initInstance(instance)
  },
}
