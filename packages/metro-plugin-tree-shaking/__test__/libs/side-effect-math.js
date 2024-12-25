export const add = (a, b) => a + b

export function div(a, b) {
  return a / b
}

const sub = (a, b) => a - b

function _(a, b) {
  return a * b
}

global.__MAGIC_SUB__ = sub

export { sub, _ as mul }
