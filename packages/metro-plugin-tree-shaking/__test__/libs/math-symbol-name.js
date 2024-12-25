export const add = (a, b) => a + b

export function div(a, b) {
  return a / b
}

const sub = (a, b) => a - b

function _(a, b) {
  return a * b
}

function mul(a, b) {
  // ('I am shadow _')
  return a * b
}

export { sub, _ as mul, mul as _ }
