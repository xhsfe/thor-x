// const generate = require('@babel/generator').default
const { join } = require('path')
const process = require('process')
const fs = require('fs')
const { createHash } = require('crypto')

// console.log(`pid: ${process.pid}, ppid: ${process.ppid}`)

const DEFAULT_ROOT = process.env.METRO_TREE_SHAKING_CACHE_ROOT
  || join(process.cwd(), '.optimize/')

/**
 * 1. collect the top level parts, imports, exports of current file
 * 2. build the dependency graph of export -> parts -> imports
 */

/**
 * Data Struct
 * files: Map<SourceIndex, File>
 *
 * interface File
 * {
 *   parts: Array<Part>
 *   exports: Map<string, PartId[]> // mark each export's dependency by partId
 *   exportStar: Map<string, PartId[]> // mark * export dependency by partId
 *   exportAlias: Map<string, string> // get original binding name of exports
 *   exportUse: Map<string, boolean> // mark whether export is used by entryPoint
 *   implicitExportStarUse: boolean // use export name other than explicit
 *   imports: Map<string, PartId[]> // mark each import's references by partId
 *   importAlias: Map<string, string> // get original export name from other modules
 *   importUse: Map<string, boolean> // mark whether import is used by live parts in this file
 *
 *   requireDependencies: Record<string, ExternalDependency> // get external source name & exportName by RequireCallExpression | AsyncImportExpression
 *   importDependencies: Record<string, ExternalDependency> // get external source name & exportName by local import name (* -> ExternalDependency[])
 *   exportDependencies: Record<string, ExternalDependency> // get external source name & exportName by ExportAllDeclaration (* -> ExternalDependency[])
 *
 *   defer: boolean  // whether current file has 'use client' directive at the top
 *   deferrable: boolean // whether current file is deferrable. The file is deferrable when it is only required by the defer files
 *   isLive: boolean // whether current file is visited by entryPoint dependency graph
 *   finalize: boolean // whether current file's metadata is finalized
 *   type: 'module' | 'commonjs' // current file's format
 * }
 *
 * interface Part
 * Part
 * {
 *   InnerDependencies: Map<PartId, Identifier[]>,
 *   IsLive: boolean,                         ( calculated after 2nd pass )
 *   IsImport: boolean                        ( if other parts depends on inner parts contains import statement, it will be transformed to outerDependencies )
 *   Range: [number, number]                  ( [node.start, node.end] )
 * }
 *
 * ExternalDependency
 * {
 *   sourceIndex: string,
 *   exportName: string,
 *   async: boolean (TODO)
 *   isLive: boolean
 * }
 */

const getPartId = (parts, range) => {
  let id = 0
  // continue when
  // 1. id < length
  // 2. part.end is undefined
  // 3. last part.end < range.start
  while (parts[id] && (!parts[id].range[1] || parts[id].range[1] < range.start)) {
    id += 1
  }
  return id
}

/**
 *
 * @param {*} source import name
 * @returns whether the source is a script file (.json, .ttf should be excluded)
 */
const isValidSource = source => !!source
  && !/\.json$/.test(source)
  && !/\.ttf$/.test(source)
  && !/\.png$/.test(source)

const isSecondBuild = !process.env.PRE_BUILD

/**
 * only support 2-pass build currently, first build generate optimize blueprint, second build will make optimize-build by blueprint
 */
let graph = {}

const getDependencyPathFrom = (currentFile, dependencyName, metroGraph) => {
  let result
  const dependencies = metroGraph.dependencies
    .get(currentFile)
    .dependencies.values()
  for (const dependency of dependencies) {
    if (dependency.data.name === dependencyName) {
      result = dependency.absolutePath
      break
    }
  }
  // if (result === undefined) {
  //   console.debug(
  //     `[Tree Shaking] Can't find dependencyPath for ${dependencyName} in ${currentFile}`,
  //   );
  // }
  return result
}

/**
 * get origin export location for import declaration
 *
 * export * from 'xxx' is also concerned.
 *
 * export order is ignored currently.
 *
 * export { a };
 * export * from './A'
 * export * from './B'
 *
 * use visited to prevent cycle export *
 *
 * example:
 * index.ts
 *
 * export * from './sub'
 *
 * sub.ts
 *
 * export * from './index'
 */
const getOriginExportLoc = (
  importedFilePath,
  exportName,
  metroGraph,
  visited = {},
) => {
  if (!visited[importedFilePath]) {
    visited[importedFilePath] = {}
  }

  if (visited[importedFilePath][exportName]) return
  visited[importedFilePath][exportName] = true

  if (!graph[importedFilePath]) {
    return
  }

  /**
   * we treat namedExport priority higher than exportAllDeclaration
   */
  if (graph[importedFilePath].exports[exportName]) {
    return { sourceIndex: importedFilePath, exportName }
  }
  if (graph[importedFilePath].exportDependencies['*'].length > 0) {
    return graph[importedFilePath].exportDependencies['*'].reduce(
      (result, dependencyName) => {
        /**
         * early stop if other star export matched
         */
        if (result) {
          return result
        }
        /**
         * else find first matched * export and mark it as live
         */
        const current = getOriginExportLoc(
          getDependencyPathFrom(importedFilePath, dependencyName, metroGraph),
          exportName,
          metroGraph,
          visited,
        )
        if (current) {
          graph[importedFilePath].parts[
            graph[importedFilePath].exportStar[dependencyName]
          ].isLive = true
          return current
        }
        return undefined
      },
      undefined,
    )
  }
}

  // default exclude patterns
  const defaultExcludePatterns = [
    /react-native-url-polyfill/,
    /polyfills/,
    /@babel\/runtime/,
    /metro-runtime\/src\/modules\/asyncRequire\.js/,
    /@react-native\/asset-registry/,
    /\.cjs(\.js)?$/,
    /react-native\/Libraries\/Image\/AssetRegistry\.js/,
    /jsx-runtime\./,
  ]


module.exports = function plugin(api, options) {
  if (!fs.existsSync(DEFAULT_ROOT)) {
    fs.mkdirSync(DEFAULT_ROOT, { recursive: true })
  }
    // merge user custom exclude patterns
  const {
    excludePatterns = [],
  } = options

  const allExcludePatterns = [...defaultExcludePatterns, ...excludePatterns]
  const excludePattern = allExcludePatterns.join('|')
  const excludeRegex = new RegExp(excludePattern)


    // 检查文件是否应该被排除
    function shouldExclude(filename) {
      return allExcludePatterns.some(pattern => pattern.test(filename));
    }

  return {
    visitor: {
      Program: {
        enter(path, state) {
          if (isSecondBuild) {
            // ignore polyfills & babel runtimes
            if (
              process.env.DISABLE_OPTIMIZE
              || shouldExclude(state.filename)
            ) {
              return
            }
            if (!fs.existsSync(join(DEFAULT_ROOT, state.file.opts.caller.platform))) {
              fs.mkdirSync(join(DEFAULT_ROOT, state.file.opts.caller.platform), { recursive: true })
            }
            if (
              Object.keys(graph).length === 0
              && fs.existsSync(
                join(
                  DEFAULT_ROOT,
                  state.file.opts.caller.platform,
                  'stats.json',
                ),
              )
            ) {
              graph = JSON.parse(
                fs.readFileSync(
                  join(
                    DEFAULT_ROOT,
                    state.file.opts.caller.platform,
                    'stats.json',
                  ),
                  'utf8',
                ),
              )
            }
            path.node.body = path.node.body.filter((part, partId) => {
              if (!graph[state.filename]) {
                return true
              }
              if (graph[state.filename].parts[partId].isLive) {
                return true
              }
              if (part.type === 'ExportNamedDeclaration') {
                // only keep used exports
                part.specifiers = part.specifiers.filter(
                  specifier => graph[state.filename].exportUse[specifier.exported.name],
                )
                return part.specifiers.length > 0
              }
              if (
                part.type === 'ExportAllDeclaration'
                && (graph[state.filename].exportUse['*'] || graph[state.filename].implicitExportStarUse)
              ) {
                /**
                 * TODO: only used export when multi export * appear.
                 */
                return true
              }
              return false
            })
            return
          }
          if (!graph[state.filename]) {
            graph[state.filename] = {
              parts: [],
              exports: {},
              exportStar: {},
              exportAlias: {},
              exportUse: {},
              imports: {},
              importAlias: {},
              importUse: {},
              importDependencies: {},
              requireDependencies: {
                '*': [],
              },
              exportDependencies: {
                '*': [],
              },
              isLive: false,
              defer: false,
              deferrable: true,
            }
          }
          if (path.node.directives.length > 0) {
            const directive = path.node.directives[0]
            if (directive.type === 'Directive' && directive.value.type === 'DirectiveLiteral' && directive.value.value === 'use defer') {
              graph[state.filename].defer = true
            }
          }
          path.node.body.forEach((part, partId) => {
            const currentPart = {
              innerDependencies: {}, // transform to array after part dep analysis
              isLive: false,
              isImport: part.type === 'ImportDeclaration',
              // TODO: pure sideEffect when encounter /** __PURE__ */ flag
              /**
               * mark TSEnumDeclaration because babel scope.bindings don't have these enums, just disable shaking for it now.
               */
              sideEffect:
                part.type.includes('Statement')
                || part.type === 'TSEnumDeclaration', // treat all statement as sideEffect
              range: [part.start, part.end],
            }
            graph[state.filename].parts.push(currentPart)

            // ignore type exports
            // TODO: support cjs module.exports
            if (part.type === 'ExportNamedDeclaration') {
              /**
               * we will keep all type declaration because it won't increase bundle size finally.
               */
              // if (part.exportKind === 'type') {
              //   return;
              // }

              if (part.declaration) {
                if (part.declaration.declarations) {
                  /**
                   * export const SafeAreaFrameContext = React.createContext(null);
                   * export const { Consumer, Provider } = SettingContext
                   * export const { Consumer: C, Provider: P } = SettingContext
                   */
                  part.declaration.declarations.forEach(declaration => {
                    if (declaration.id.name) {
                      graph[state.filename].exports[declaration.id.name] = part.declaration.declarations.length === 1
                        ? [partId]
                        : []
                    } else if (declaration.id.properties.length > 0) {
                      declaration.id.properties.forEach(property => {
                        graph[state.filename].exports[property.value.name] = [partId]
                        graph[state.filename].exportAlias[property.value.name] = property.key.name
                      })
                    }
                  })
                } else {
                  /**
                   * export function custom() {}
                   */
                  graph[state.filename].exports[part.declaration.id.name] = [
                    partId,
                  ]
                  /**
                   * mark TSEnumDeclaration because babel scope.bindings don't have these enums, just disable shaking for it now.
                   * export const enum TabLabelType {
                   *  leftIcon = 'leftIcon'
                   * }
                   */
                  if (part.declaration.type === 'TSEnumDeclaration') {
                    currentPart.sideEffect = true
                  }
                }
              } else if (part.specifiers) {
                /**
                 * export { Color, Header, HermesBadge, ... }
                 * export { foo as bar }
                 * export { foo as bar } from './lib'
                 *
                 * export * as lib from './lib'
                 */
                part.specifiers.forEach(specifier => {
                  const localName = specifier.local
                    ? specifier.local.name
                    : '*'
                  graph[state.filename].exportAlias[specifier.exported.name] = localName ?? '*'
                  graph[state.filename].exports[specifier.exported.name] = part.source ? [partId] : []

                  if (part.source) {
                    graph[state.filename].exportDependencies[
                      specifier.exported.name
                    ] = {
                      sourceIndex: part.source.value,
                      exportName: localName ?? '*',
                    }
                  }
                })
              }
            } else if (part.type === 'ExportDefaultDeclaration') {
              graph[state.filename].exports.default = [partId]
              if (part.declaration.type === 'FunctionDeclaration' && part.declaration.id) {
                /**
                 * export default function toString() {};
                 */
                graph[state.filename].exportAlias.default = part.declaration.id.name
              } else {
                /**
                 * export default mod;
                 * export default function() {};
                 */
                graph[state.filename].exportAlias.default = part.declaration.name
              }
            } else if (part.type === 'ExportAllDeclaration') {
              if (part.exported) {
                /**
                 * export * from 'lib'
                 */
              } else {
                /**
                 * export * as sdk from 'lib'
                 * FIXME:
                 */
                graph[state.filename].exportDependencies['*'].push(
                  part.source.value,
                )
                graph[state.filename].exportStar[part.source.value] = partId
              }
              // graph[state.filename].exportDependencies
            } else if (part.type === 'ImportDeclaration') {
              // if (part.importKind === 'type') {
              //   return;
              // }
              if (part.specifiers) {
                // import declaration without specifiers has sideEffect
                // example:
                // import '../Core/InitializeCore'
                if (part.specifiers.length === 0 && part.source) {
                  currentPart.sideEffect = true
                  graph[state.filename].requireDependencies['*'].push(
                    part.source.value,
                  )
                }
                part.specifiers.forEach(specifier => {
                  if (specifier.type === 'ImportDefaultSpecifier') {
                    /**
                     * import App from './App'
                     */
                    graph[state.filename].imports[specifier.local.name] = []
                    graph[state.filename].importAlias[specifier.local.name] = 'default'
                    graph[state.filename].importDependencies[
                      specifier.local.name
                    ] = {
                      sourceIndex: part.source.value,
                      exportName: 'default',
                    }
                  } else if (specifier.type === 'ImportSpecifier') {
                    /**
                     * import { AppRegistry } from 'react-native';
                     * import { name as appName } from './app.json';
                     */
                    graph[state.filename].imports[specifier.local.name] = []
                    graph[state.filename].importAlias[specifier.local.name] = specifier.imported.name
                    graph[state.filename].importDependencies[
                      specifier.local.name
                    ] = {
                      sourceIndex: part.source.value,
                      exportName: specifier.imported.name,
                    }
                  } else if (specifier.type === 'ImportNamespaceSpecifier') {
                    /**
                     * import * as mod from './mod';
                     */
                    graph[state.filename].imports[specifier.local.name] = []
                    graph[state.filename].importAlias[specifier.local.name] = '*'
                    graph[state.filename].importDependencies[
                      specifier.local.name
                    ] = {
                      sourceIndex: part.source.value,
                      exportName: '*',
                    }
                  } else if (specifier.type === 'ImportAttribute') {
                    throw new Error(
                      'ImportAttribute is not supported in metro-tree-shaking plugin',
                    )
                  }
                })
              }
              // const code = generate(path.node).code
            } else if (
              part.type === 'ExpressionStatement'
              && part.expression.type === 'AssignmentExpression'
            ) {
              /**
               * module.exports = STATEMENT_RIGHT
               *
               * TODO: support var _default = module.exports = STATEMENT_RIGHT
               */
              if (
                part.expression.left.type === 'MemberExpression'
                && part.expression.left.object.name === 'module'
                && part.expression.left.property.name === 'exports'
              ) {
                graph[state.filename].type = 'commonjs'
                graph[state.filename].exports.default = [partId]
                if (part.expression.right.type === 'Identifier') {
                  // module.exports = VAR_NAME
                  graph[state.filename].exportAlias.default = part.expression.right.name
                } else if (part.expression.right.type === 'ObjectExpression') {
                  /**
                   * module.exports = {
                   *   get AppRegistry() {
                   *     return require('./Libraries/Components/AccessibilityInfo/AccessibilityInfo')
                   *   },
                   *   Test
                   * }
                   */
                  part.expression.right.properties.forEach(property => {
                    /**
                     * Libraries/Animated.js
                     *
                     * module.exports = {
                     *  get Image() {
                     *    return require('./components/AnimatedImage')
                     *  },
                     *  ...Animated
                     * }
                     */
                    if (property.type !== 'SpreadElement') {
                      graph[state.filename].exports[property.key.name] = []
                    }
                  })
                }
              }
            }
          })

          const exportAliasReverse = {}

          Object.keys(graph[state.filename].exportAlias).forEach(
            exportName => {
              const referenceName = graph[state.filename].exportAlias[exportName]
              if (exportAliasReverse[referenceName] && Array.isArray(exportAliasReverse[referenceName])) {
                exportAliasReverse[referenceName].push(exportName)
              } else {
                exportAliasReverse[referenceName] = [exportName]
              }
            },
          )

          // const code = generate(path.node).code;
          const topLevelBindings = path.scope.bindings
          Object.entries(topLevelBindings).forEach(([name, binding]) => {
            if (binding.referenced) {
              const bindingPartId = getPartId(
                graph[state.filename].parts,
                binding.identifier,
              )
              const referencePartIds = binding.referencePaths.map(p => getPartId(graph[state.filename].parts, p.node))
              // add dependencies record to references
              referencePartIds.forEach(referencePartId => {
                const referencePart = graph[state.filename].parts[referencePartId]
                if (!referencePart.innerDependencies[bindingPartId]) {
                  referencePart.innerDependencies[bindingPartId] = []
                }
                referencePart.innerDependencies[bindingPartId].push(name)

                // add reference record to import part
                if (graph[state.filename].parts[bindingPartId].isImport) {
                  graph[state.filename].imports[name].push(referencePartId)
                }
              })

              const exportNames = exportAliasReverse[name]
              // update export dependencies records
              if (Array.isArray(exportNames)) {
                exportNames.forEach(exportName => {
                  if (
                    Array.isArray(graph[state.filename].exports[exportName])
                  ) {
                    graph[state.filename].exports[exportName].push(
                      bindingPartId,
                    )
                  }
                })
              }
              // if (graph[state.filename].exportAlias.default === name) {
              //   graph[state.filename].exports.default.push(bindingPartId);
              // }
            } else if (binding.constantViolations) {
              const bindingPartId = getPartId(
                graph[state.filename].parts,
                binding.identifier,
              )
              const constantViolationPartIds = binding.constantViolations.map(p => getPartId(graph[state.filename].parts, p.node))
              // add dependencies record to references
              constantViolationPartIds.forEach(referencePartId => {
                const referencePart = graph[state.filename].parts[referencePartId]
                if (!referencePart.innerDependencies[bindingPartId]) {
                  referencePart.innerDependencies[bindingPartId] = []
                }
                referencePart.innerDependencies[bindingPartId].push(name)

                // add reference record to import part
                if (graph[state.filename].parts[bindingPartId].isImport) {
                  graph[state.filename].imports[name].push(referencePartId)
                }
              })
              const exportNames = exportAliasReverse[name]
              // update export dependencies records
              if (Array.isArray(exportNames)) {
                exportNames.forEach(exportName => {
                  if (
                    Array.isArray(graph[state.filename].exports[exportName])
                  ) {
                    graph[state.filename].exports[exportName].push(
                      bindingPartId,
                    )
                  }
                })
              }
            }
          })

          /**
           * export enum AppLifeCycle {
           *  AppStart = 'appStart'
           * }
           */
          Object.entries(path.scope.globals).forEach(([name, item]) => {
            if (Array.isArray(graph[state.filename].exports[name]) && item.type === 'Identifier') {
              const referencePartId = getPartId(graph[state.filename].parts, item)
              graph[state.filename].exports[name].forEach(bindingPartId => {
                if (!graph[state.filename].parts[referencePartId].innerDependencies[bindingPartId]) {
                  graph[state.filename].parts[referencePartId].innerDependencies[bindingPartId] = []
                }
                graph[state.filename].parts[referencePartId].innerDependencies[bindingPartId].push(name)
              })
            }
          })
        },
        exit(_, state) {
          if (isSecondBuild) {
            return
          }
          graph[state.filename].finalize = true
          /**
           * preserve local data if transform workerFarm is enabled.
           */
          const treeShakingMeta = {
            filename: state.filename,
            // platform: state.file.opts.caller.platform,
            data: graph[state.filename],
          }
          if (!state.file.metadata.treeShakingMeta) {
            state.file.metadata.treeShakingMeta = treeShakingMeta
          }
          const key = state.file.opts.caller.unstable_transformResultKey ?? createHash('md5').update(state.filename).digest('hex')
          if (!fs.existsSync(join(DEFAULT_ROOT, state.file.opts.caller.platform))) {
            fs.mkdirSync(join(DEFAULT_ROOT, state.file.opts.caller.platform), { recursive: true })
          }
          fs.writeFileSync(
            join(DEFAULT_ROOT, state.file.opts.caller.platform, `${key}.json`),
            JSON.stringify(treeShakingMeta),
          )
        },
      },
      MemberExpression: {
        enter(path, state) {
          if (
            !isSecondBuild 
            && !graph[state.filename].finalize
            && path.node.object.name === 'exports'
          ) {
            const partId = getPartId(graph[state.filename].parts, path.node)

            if (path.node.property.name === 'default') {
              if (!graph[state.filename].exports.default) {
                graph[state.filename].exports.default = [partId]
              } else if (!graph[state.filename].exports.default.includes(partId)) {
                graph[state.filename].exports.default.push(partId)
              }
            } else {
              graph[state.filename].parts[partId].sideEffect = true
            }
          }
        },
      },
      CallExpression: {
        enter(path, state) {
          if (
            !isSecondBuild
            && !graph[state.filename].finalize
            && (
              path.node.callee.type === 'Import'
              || (path.node.callee.type === 'Identifier' && path.node.callee.name === 'require')
            )
          ) {
            if (path.node.arguments[0].type !== 'StringLiteral') {
              throw new Error('Unrecognized require')
            } else {
              // We treat async import as require currently, sub-optimize can be done if developer use
              // const { add, sub } = await import('./lib/math')
              // rather than
              // const math = await import('./lib/math')
              graph[state.filename].requireDependencies['*'].push(
                path.node.arguments[0].value,
              )
            }
          }
        },
      },
    },
  }
}

module.exports.serializer = function serializer(
  entryPoint,
  prepend,
  metroGraph,
) {
  const platform = metroGraph.transformOptions.platform
  /**
   * restore file part info if transform workerFarm is enabled
   */
  // console.log(`pid: ${process.pid}, ppid: ${process.ppid}`)
  if (!fs.existsSync(join(DEFAULT_ROOT, platform))) {
    fs.mkdirSync(join(DEFAULT_ROOT, platform), { recursive: true })
  }
  const files = fs.readdirSync(join(DEFAULT_ROOT, platform))
  files.forEach(file => {
    if (!file.startsWith('stats.')) {
      const content = fs.readFileSync(join(DEFAULT_ROOT, platform, file), 'utf8')
      const { filename, data } = JSON.parse(content)
      graph[filename] = data
    }
  })

  const eagerExecuteModules = new Set()
  const eagerExecuteModuleVisitor = []
  /**
   * entryPoints is only deferrable when it contains 'use defer' directive at the top of file
   */
  Array.from(metroGraph.entryPoints.values()).forEach(p => {
    if (graph[p] && !graph[p].defer) {
      eagerExecuteModuleVisitor.push(p)
      eagerExecuteModules.add(p)
      graph[p].deferrable = false
    }
  })

  prepend.forEach(module => {
    if (graph[module.path] && !graph[module.path].defer) {
      eagerExecuteModuleVisitor.push(module.path)
      eagerExecuteModules.add(module.path)
      graph[module.path].deferrable = false
    }
  })

  while (eagerExecuteModuleVisitor.length > 0) {
    const currentPath = eagerExecuteModuleVisitor.pop()
    const current = metroGraph.dependencies.get(currentPath)

    if (current) {
      // eslint-disable-next-line no-loop-func
      Array.from(current.dependencies.values()).forEach(module => {
        const modulePath = module.absolutePath
        if (graph[modulePath] && !graph[modulePath].defer && !eagerExecuteModules.has(modulePath)) {
          eagerExecuteModuleVisitor.push(modulePath)
          eagerExecuteModules.add(modulePath)
          graph[modulePath].deferrable = false
        }
      })
    }
  }

  const nextParts = [{ filePath: entryPoint, exportName: undefined }]
  const visitedFiles = new Set()

  function tryToAddPartFromIdentifier(identifierName, currentFilePath) {
    const currentFile = graph[currentFilePath]
    /**
     * make cross file live propagation when current part has import dependencies.
     */
    const dependency = currentFile.importDependencies[identifierName]

    if (dependency && process.env.TREE_SHAKING_VERBOSE) {
      console.info(
        `[Tree Shaking] Try to import ${identifierName} from '${dependency.sourceIndex}' (${currentFilePath})`,
      )
    }

    if (
      dependency
      && isValidSource(dependency.sourceIndex)
      // identifierName can be toString 😂
      && currentFile.importUse[identifierName] !== true
    ) {
      currentFile.importUse[identifierName] = true
      /**
       * add exportFile & exportName pair to visitQueue if this import hasn't been consumed and paired export hasn't been visited.
       */
      const dependencyExportName = currentFile.importAlias[identifierName] || identifierName

      if (process.env.TREE_SHAKING_VERBOSE) {
        console.info(
          `[Tree Shaking] find ${dependencyExportName} from '${dependency.sourceIndex}' (${currentFilePath})`,
        )
      }

      /**
       * need to split import to direct export & inter exports
       *
       * example:
       *
       * import { AppRegistry } from 'react-native'
       *  ===
       * import 'react-native' (./node_modules/react-native/index.js)
       *  +
       * import AppRegistry from './node_modules/react-native/Libraries/ReactNative/AppRegistry'
       *
       * direct dependency: ./node_modules/react-native/index.js (sideEffect import)
       * real dependency: ./node_modules/react-native/Libraries/ReactNative/AppRegistry.js (named import)
       */
      const directDependencyPath = getDependencyPathFrom(
        currentFilePath,
        dependency.sourceIndex,
        metroGraph,
      )

      /**
       * some file won't output to artifacts (typescript declarations) so metroGraph won't keep it.
       */
      if (!directDependencyPath) {
        return
      }

      const exportLocation = getOriginExportLoc(
        directDependencyPath,
        dependencyExportName,
        metroGraph,
      ) ?? {}

      const {
        sourceIndex: parentDependencyFilePath,
        exportName: parentDependencyExportName,
      } = exportLocation

      // only concern depth=2 currently, consider to support more if required.
      if (
        directDependencyPath !== parentDependencyFilePath
        && isValidSource(directDependencyPath)
      ) {
        if (process.env.TREE_SHAKING_VERBOSE) {
          console.info(
            `[Tree Shaking] add ${directDependencyPath} > ${dependencyExportName}`,
          )
        }

        nextParts.push({
          filePath: directDependencyPath,
          exportName: dependencyExportName,
        })
      }

      if (
      // TODO: remove it when cjs export is supported
      // It sometimes empty because we don't make export name relationship under cjs
        /**
         * bad case
         * module.exports = {
         *   get AppRegistry() {
         *     return require('./Libraries/Components/AccessibilityInfo/AccessibilityInfo')
         *   }
         * }
         */
        isValidSource(parentDependencyFilePath)
        && graph[parentDependencyFilePath]
        && parentDependencyExportName
        && !graph[parentDependencyFilePath].exportUse[parentDependencyExportName]
      ) {
        if (process.env.TREE_SHAKING_VERBOSE) {
          console.info(
            `[Tree Shaking] add ${parentDependencyFilePath} > ${parentDependencyExportName}`,
          )
        }
        nextParts.push({
          filePath: parentDependencyFilePath,
          exportName: parentDependencyExportName,
        })
      }
    } else if (currentFile.exportDependencies['*'].length > 0) {
      /**
        * else find first matched * export and mark it as live
      */
      for (const dependencyName of currentFile.exportDependencies['*']) {
        const current = getOriginExportLoc(
          getDependencyPathFrom(currentFilePath, dependencyName, metroGraph),
          identifierName,
          metroGraph,
        )
        // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
        if (current && current.sourceIndex) {
          nextParts.push({
            filePath: current.sourceIndex,
            exportName: current.exportName,
          })
          break
        }
      }
    }
  }

  /**
   * visit file parts & mark live parts
   */
  while (nextParts.length > 0) {
    const { filePath: currentFilePath, exportName } = nextParts.pop()
    const currentFile = graph[currentFilePath]

    /**
     * .png files will generate register code snippets out of babel transformation
     */
    if (!currentFile) {
      continue
    }

    /**
     * concat to create new array to protect origin exports data
     */
    const nextPartIds = [].concat(
      exportName ? currentFile.exports[exportName] ?? [] : [],
    )
    visitedFiles.add(currentFile)
    if (exportName) {
      currentFile.exportUse[exportName] = true
      // if export statement is undefined, spread it to start export
      if (currentFile.exports[exportName] === undefined) {
        currentFile.implicitExportStarUse = true
      }
    }

    if (!graph[currentFilePath].isLive) {
      /**
       * when the file is first visited, visit the parts with sideEffect.
       */
      nextPartIds.push(
        ...currentFile.parts
          .map((_, idx) => idx)
          .filter(idx => currentFile.parts[idx].sideEffect),
      )
      graph[currentFilePath].requireDependencies['*'].forEach(source => {
        const directDependencyPath = getDependencyPathFrom(
          currentFilePath,
          source,
          metroGraph,
        )
        /**
         * if directDependencyPath is undefined, means it won't appear in artifacts, for example
         *
         * const invariant = require('invariant');
         * if (__DEV__) { invariant() }
         *
         * invariant won't appear in metroGraph
         */
        if (isValidSource(directDependencyPath)) {
          nextParts.push({
            filePath: directDependencyPath,
            exportName: '*', // mark exportName to ** will keep all exports from dependency, make it just work for cjs
          })
        }
      })
    }

    graph[currentFilePath].isLive = true

    if (exportName && exportName !== '*') {
      tryToAddPartFromIdentifier(exportName, currentFilePath)
    }

    /**
     * make cross file live propagation when current exportName has export dependencies.
     */
    const exportDependency = currentFile.exportDependencies[exportName]
      || (currentFile.exportAlias[exportName] && currentFile.importDependencies[currentFile.exportAlias[exportName]])
    if (exportDependency) {
      const directDependencyPath = getDependencyPathFrom(
        currentFilePath,
        exportDependency.sourceIndex,
        metroGraph,
      )
      if (isValidSource(directDependencyPath)) {
        if (process.env.TREE_SHAKING_VERBOSE) {
          console.info(
            `[Tree Shaking] add ${directDependencyPath} > ${exportDependency.exportName}`,
          )
        }

        nextParts.push({
          filePath: directDependencyPath,
          exportName: exportDependency.exportName,
        })
      }
    }

    /**
     * visit all parts with sideEffect.
     */
    while (nextPartIds.length > 0) {
      const idx = nextPartIds.pop()
      const part = currentFile.parts[idx]
      if (part.isLive) {
        continue
      }

      part.isLive = true
      Object.entries(part.innerDependencies).forEach(
        ([partId, identifierNames]) => {
          if (identifierNames.length > 0) {
            identifierNames.forEach(identifierName => {
              if (!currentFile.parts[partId].isLive) {
                nextPartIds.push(partId)
              }

              tryToAddPartFromIdentifier(identifierName, currentFilePath)
            })
          }
        },
      )
    }

    if (exportName === '*') {
      Object.keys(currentFile.exports).forEach(name => {
        nextParts.push({
          filePath: currentFilePath,
          exportName: name,
        })
      })
      Object.keys(currentFile.exportStar).forEach(relativePath => {
        // spread * export name if encounter export * from 'xxx' statements
        const starExportPath = getDependencyPathFrom(
          currentFilePath,
          relativePath,
          metroGraph,
        )
        if (starExportPath) {
          nextParts.push({
            filePath: starExportPath,
            exportName: '*',
          })
        }
      })
      continue
    }
  }

  /**
   * write stat json
   */
  fs.writeFileSync(
    join(DEFAULT_ROOT, platform, 'stats.json'),
    JSON.stringify(graph, null, '\t'),
  )

  console.info('[Tree Shaking] Live part analysis succeed!')
  if (!process.env.THROW_WHEN_SHAKE_ANALYZE_FINISHED) {
    process.exit(0)
  } else {
    throw new Error('Stop PRE_BUILD')
  }
}

/**
 * test case mono
 *
 * entry.js
 *
 * import { a } from './a'
 *
 * a.js
 *
 * export * as a from 'b'
 *
 * b.js
 *
 * export * from 'c'
 */
