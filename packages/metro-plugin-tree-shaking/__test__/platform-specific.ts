// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-var-requires, import/named
import { add, platform } from './libs/math'

add(1, platform === 'android' ? 1 : 2)
