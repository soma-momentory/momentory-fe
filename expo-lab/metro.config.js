const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Shared app views, design values and assets also need live reload in the Lab.
config.watchFolders = [...new Set([...config.watchFolders, path.resolve(__dirname, "..")])];

module.exports = config;
