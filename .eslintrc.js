/**
 * ESLint Configuration for Heartwood Project
 */

export default {
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'semi': ['error', 'always'],
    'quotes': ['warn', 'single', { allowTemplateLiterals: true }],
    'indent': ['warn', 2],
    'comma-dangle': ['warn', 'never'],
    'arrow-parens': ['warn', 'as-needed']
  }
};
