const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Permite que Metro incluya archivos .tflite como assets
config.resolver.assetExts.push('tflite');

module.exports = config;
