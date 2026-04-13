const { ModuleFederationPlugin } = require("webpack").container;
const deps = require("./package.json").dependencies;

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Required for Webpack 5 + CRA
      webpackConfig.output.publicPath = "auto";
      return webpackConfig;
    },
    // 🚀 THE FIX: Inject the plugin using CRACO's native API
    plugins: {
      add: [
        new ModuleFederationPlugin({
          name: "host_app",
          filename: "remoteEntry.js",
          remotes: {
            
          },
          shared: {
            ...deps,
            react: { singleton: true, requiredVersion: deps.react },
            "react-dom": { singleton: true, requiredVersion: deps["react-dom"] },
          },
        }),
      ],
    },
  },
};