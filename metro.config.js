const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

// Node < 20 compatibility for Metro dependencies that use toReversed.
if (!Array.prototype.toReversed) {
  Object.defineProperty(Array.prototype, "toReversed", {
    value: function toReversed() {
      return [...this].reverse();
    },
    writable: true,
    configurable: true,
  });
}

const config = getDefaultConfig(__dirname);

// Work around pnpm nested resolution issue for React Native internal import.
config.resolver = config.resolver || {};
const extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
};

try {
  extraNodeModules["@react-native/virtualized-lists"] = path.dirname(
    require.resolve("@react-native/virtualized-lists/package.json"),
  );
} catch {
  // In some install layouts (e.g. non-pnpm hoisting), this package may not be
  // resolvable from the app root. Metro can still resolve it transitively.
}

config.resolver.extraNodeModules = extraNodeModules;

module.exports = config;
