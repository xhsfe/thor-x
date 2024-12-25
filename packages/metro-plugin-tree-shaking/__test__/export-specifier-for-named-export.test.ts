import { execSync } from 'child_process'
import 'colors'
import fs from 'fs'
import path from 'path'
import { diffLines } from 'diff'

test('import export specifier from lib', () => {
  const METRO_TREE_SHAKING_CACHE_ROOT = path.join(
    __dirname,
    '../.optimize/export-specifier-for-named-export',
  )
  const OUTPUT_ROOT = path.join(
    __dirname,
    '../dist/export-specifier-for-named-export',
  )
  const ENTRY_FILE = './__test__/export-specifier-for-named-export.ts'
  const BUNDLE_OUTPUT = './dist/export-specifier-for-named-export'

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

  const originContent = fs.readFileSync(
    path.join(OUTPUT_ROOT, 'origin.jsbundle'),
    { encoding: 'utf8' },
  )
  const optimizedContent = fs.readFileSync(
    path.join(OUTPUT_ROOT, 'optimize.jsbundle'),
    { encoding: 'utf8' },
  )
  const diffs = JSON.stringify(
    diffLines(originContent, optimizedContent, {
      ignoreWhitespace: true,
    }).filter(item => item.added || item.removed),
    null,
    '\t',
  )
  expect(diffs).toMatchSnapshot()
})
