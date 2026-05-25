module.exports = function (api) {
  api.cache(true);
  let plugins = [
    require('react-native-css-interop/dist/babel-plugin').default,
    [
      '@babel/plugin-transform-react-jsx',
      {
        runtime: 'automatic',
        importSource: 'react-native-css-interop',
      },
    ],
    'react-native-worklets/plugin',
  ];

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'nativewind',
          reanimated: false,
          worklets: false,
        },
      ],
    ],
    // IMPORTANT: Worklets/Reanimated plugin must be listed last.
    plugins,
  };
};
