module.exports =
  process.env.NODE_ENV === "test"
    ? /** jest */
      {
        presets: [
          ["@babel/preset-env", { targets: { node: "18" } }],
          "@babel/preset-typescript",
        ],
      }
    : /** react-native */ {
        presets: [
          ["./tree-shaking-preset"],
          ["module:metro-react-native-babel-preset", {}],
        ],
        env: {
          production: {
            plugins: [["transform-remove-console", { exclude: ["warn"] }]],
          },
        },
        plugins: [
          ["@babel/plugin-proposal-decorators", { legacy: true }],
          "@babel/plugin-proposal-export-namespace-from",
          [
            require("babel-plugin-global-define"),
            {
              "process.env.APP_NAME": process.env.appName,
              "process.env.APP_VERSION": process.env.appVersion,
              "process.env.BUILD_ENV": process.env.buildEnv,
              "process.env.RN_VERSION": "0.72.5",
            },
          ],
        ],
      };
