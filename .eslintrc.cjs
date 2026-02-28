module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // React Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Fast Refresh
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

    // TypeScript — keep `any` as warn (gradual migration)
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

    // Console statements — error in production paths
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // Code quality
    'no-debugger': 'error',
    'no-unreachable': 'error',
    'no-duplicate-imports': 'error',
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '.wrangler/',
    '*.config.js',
    '*.config.ts',
    'postcss.config.js',
  ],
};
