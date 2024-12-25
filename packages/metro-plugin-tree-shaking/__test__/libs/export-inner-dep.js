let uuid = 0

const env = () => {
  // ...
  uuid += 3
  return `ENV@${uuid}`
}

export { env }

export const setup = () => {
  global.__ENV__ = env()
}
