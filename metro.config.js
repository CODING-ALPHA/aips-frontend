const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Force all react/react-dom/react-native imports to resolve from the single
// root copy, preventing expo-router's bundled React 18 from conflicting
// with the project's React 19.
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver?.extraNodeModules,
    react: path.resolve(__dirname, "node_modules/react"),
    "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    "react-native": path.resolve(__dirname, "node_modules/react-native"),
  },
};

module.exports = withNativeWind(config, { input: "./global.css" });