module.exports = {
  root: true,
  env: {
    node: true
  },
  globals: {
    L: true,
    ReconnectingWebSocket: true
  },
  extends: [
    'plugin:vue/essential',
    '@vue/airbnb'
  ],
  rules: {
    'no-mixed-operators': 0,
    'max-len': 0,
    'no-plusplus': 0,
    'no-return-assign': 0,
    'arrow-parens': ['error', 'as-needed'],
    'comma-dangle': ['error', 'never'],
    'nonblock-statement-body-position': ['error', 'below'],
    curly: ['error', 'multi'],
    'no-new-require': 0,
    'new-cap': 0,
    semi: 0,
    'no-console': ['error', { allow: ['log', 'error'] }],
    'object-curly-spacing': 0,
    'no-unused-vars': ['error', { varsIgnorePattern: '_' }],
    'no-param-reassign': ['error', { props: false }],
    'consistent-return': 0,
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off'
  },
  parserOptions: {
    parser: 'babel-eslint'
  }
};
