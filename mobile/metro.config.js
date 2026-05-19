// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// ─── react-native-svg-transformer ─────────────────────────────────────────
// Permite importar archivos .svg directamente como componentes React Native.
// Uso: import MiIcono from '../assets/icons/mi-icono.svg'
//      <MiIcono width={24} height={24} fill="white" />
const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
};
// ──────────────────────────────────────────────────────────────────────────

module.exports = config;
