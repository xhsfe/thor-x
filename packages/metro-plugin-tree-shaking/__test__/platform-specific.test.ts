import { execSync } from 'child_process'
import 'colors'
import fs from 'fs'
import path from 'path'
import { diffLines } from 'diff'

test('tree shaking stats is pure, final live state of parts is decided by metroGraph in serializer', () => {
  const METRO_TREE_SHAKING_CACHE_ROOT = path.join(
    __dirname,
    '../.optimize/platform-specific',
  )
  const OUTPUT_ROOT = path.join(
    __dirname,
    '../dist/platform-specific',
  )
  const ENTRY_FILE = './__test__/platform-specific.ts'
  const BUNDLE_OUTPUT = './dist/platform-specific'

  if (fs.existsSync(OUTPUT_ROOT)) {
    fs.rmSync(OUTPUT_ROOT, { recursive: true })
  }

  fs.mkdirSync(OUTPUT_ROOT, { recursive: true })

  if (fs.existsSync(METRO_TREE_SHAKING_CACHE_ROOT)) {
    fs.rmSync(METRO_TREE_SHAKING_CACHE_ROOT, { recursive: true })
  }

  execSync(
    `PRE_BUILD=1 METRO_TREE_SHAKING_CACHE_ROOT=${METRO_TREE_SHAKING_CACHE_ROOT} react-native bundle --platform=android --entry-file=${ENTRY_FILE} --bundle-output=${BUNDLE_OUTPUT}/main.jsbundle --sourcemap-output=${BUNDLE_OUTPUT}/main.jsbundle.map --dev=true`,
  )

  execSync(
    `PRE_BUILD=1 METRO_TREE_SHAKING_CACHE_ROOT=${METRO_TREE_SHAKING_CACHE_ROOT} react-native bundle --platform=ios --entry-file=${ENTRY_FILE} --bundle-output=${BUNDLE_OUTPUT}/main.jsbundle --sourcemap-output=${BUNDLE_OUTPUT}/main.jsbundle.map --dev=true`,
  )

  execSync(
    `DISABLE_OPTIMIZE=1 METRO_TREE_SHAKING_CACHE_ROOT=${METRO_TREE_SHAKING_CACHE_ROOT} react-native bundle --platform=native --entry-file=${ENTRY_FILE} --bundle-output=${BUNDLE_OUTPUT}/origin.jsbundle --sourcemap-output=${BUNDLE_OUTPUT}/origin.jsbundle.map --dev=true`,
  )

  execSync(
    `METRO_TREE_SHAKING_CACHE_ROOT=${METRO_TREE_SHAKING_CACHE_ROOT} react-native bundle --platform=android --entry-file=${ENTRY_FILE} --bundle-output=${BUNDLE_OUTPUT}/optimize.android.jsbundle --sourcemap-output=${BUNDLE_OUTPUT}/optimize.android.jsbundle.map --dev=true`,
  )

  execSync(
    `METRO_TREE_SHAKING_CACHE_ROOT=${METRO_TREE_SHAKING_CACHE_ROOT} react-native bundle --platform=ios --entry-file=${ENTRY_FILE} --bundle-output=${BUNDLE_OUTPUT}/optimize.ios.jsbundle --sourcemap-output=${BUNDLE_OUTPUT}/optimize.ios.jsbundle.map --dev=true`,
  )

  const originContent = fs.readFileSync(
    path.join(OUTPUT_ROOT, 'origin.jsbundle'),
    { encoding: 'utf8' },
  )
  const optimizedAndroidContent = fs.readFileSync(
    path.join(OUTPUT_ROOT, 'optimize.android.jsbundle'),
    { encoding: 'utf8' },
  )
  const optimizedIOSContent = fs.readFileSync(
    path.join(OUTPUT_ROOT, 'optimize.ios.jsbundle'),
    { encoding: 'utf8' },
  )
  const androidDiffs = JSON.stringify(
    diffLines(originContent, optimizedAndroidContent, {
      ignoreWhitespace: true,
    }).filter(item => item.added || item.removed),
    null,
    '\t',
  )
  expect(androidDiffs).toMatchSnapshot()

  const iOSDiffs = JSON.stringify(
    diffLines(originContent, optimizedIOSContent, {
      ignoreWhitespace: true,
    }).filter(item => item.added || item.removed),
    null,
    '\t',
  )
  expect(iOSDiffs).toMatchSnapshot()
})
