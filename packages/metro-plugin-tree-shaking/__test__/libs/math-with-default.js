export const add = (a, b) => a + b

export function div(a, b) {
  return a / b
}

const sub = (a, b) => a - b

function _(a, b) {
  return a * b
}

const info = {
  version: '1.0.0',
}

export { sub, _ as mul }

export default info
