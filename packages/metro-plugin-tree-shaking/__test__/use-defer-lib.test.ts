import { execSync } from 'child_process'
import 'colors'
import fs from 'fs'
import path from 'path'

test("set 'use defer' at the top of library", () => {
  const METRO_TREE_SHAKING_CACHE_ROOT = path.join(
    __dirname,
    '../.optimize/use-defer-lib',
  )
  const OUTPUT_ROOT = path.join(__dirname, '../dist/use-defer-lib')
  const ENTRY_FILE = './__test__/use-defer-lib.ts'
  const BUNDLE_OUTPUT = './dist/use-defer-lib'

  if (fs.existsSync(OUTPUT_ROOT)) {
    fs.rmSync(OUTPUT_ROOT, { recursive: true })
  }

  fs.mkdirSync(OUTPUT_ROOT, { recursive: true })

  if (fs.existsSync(METRO_TREE_SHAKING_CACHE_ROOT)) {
    fs.rmSync(METRO_TREE_SHAKING_CACHE_ROOT, { recursive: true })
  }

  execSync(
    `PRE_BUILD=1 METRO_TREE_SHAKING_CACHE_ROOT=${METRO_TREE_SHAKING_CACHE_ROOT} react-native bundle --platform=native --entry-file=${ENTRY_FILE} --bundle-output=${BUNDLE_OUTPUT}/main.jsbundle --sourcemap-output=${BUNDLE_OUTPUT}/main.jsbundle.map --dev=true`,
  )

  execSync(
    `DISABLE_OPTIMIZE=1 METRO_TREE_SHAKING_CACHE_ROOT=${METRO_TREE_SHAKING_CACHE_ROOT} react-native bundle --platform=native --entry-file=${ENTRY_FILE} --bundle-output=${BUNDLE_OUTPUT}/origin.jsbundle --sourcemap-output=${BUNDLE_OUTPUT}/origin.jsbundle.map --dev=true`,
  )

  execSync(
    `METRO_TREE_SHAKING_CACHE_ROOT=${METRO_TREE_SHAKING_CACHE_ROOT} react-native bundle --platform=native --entry-file=${ENTRY_FILE} --bundle-output=${BUNDLE_OUTPUT}/optimize.jsbundle --sourcemap-output=${BUNDLE_OUTPUT}/optimize.jsbundle.map --dev=true`,
  )

  const optimizeInfo = JSON.parse(
    fs.readFileSync(
      path.join(METRO_TREE_SHAKING_CACHE_ROOT, 'native/stats.json'),
      { encoding: 'utf8' },
    ),
  )

  // const deferrableEntry = 'use-defer-lib.ts'
  const deferrableLib = 'libs/defer-math.js'
  // const deferrableCommonLib = '@babel/runtime/helpers/interopRequireDefault.js'
  Object.entries(optimizeInfo).forEach(([fileName, info]) => {
    // @ts-ignore
    if (info.deferrable) {
      expect(fileName.includes(deferrableLib)).toBe(true)
    }
    if (info.defer) {
      expect(fileName.includes(deferrableLib)).toBe(true)
    }
  })
})
