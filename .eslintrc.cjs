module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'vue/multi-word-component-names': 'off',
    // TypeScript resolves ambient DOM types (OscillatorType, etc.) and reports
    // unused bindings via noUnusedLocals — the base rules only false-positive here.
    'no-undef': 'off',
    'no-unused-vars': 'off',
    // The templates are written compactly and consistently; these two are purely
    // cosmetic and would otherwise bury real findings under ~60 warnings.
    'vue/max-attributes-per-line': 'off',
    'vue/singleline-html-element-content-newline': 'off',
  },
  ignorePatterns: ['dist', 'node_modules'],
}
