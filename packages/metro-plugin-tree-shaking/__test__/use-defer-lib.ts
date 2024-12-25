import { add as plus } from './libs/defer-math'

// It's not worked, 'use defer' should be placed at the top of file
// eslint-disable-next-line no-unused-expressions
'use defer'

plus(1, 2)
