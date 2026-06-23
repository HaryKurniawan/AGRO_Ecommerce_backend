import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import security from 'eslint-plugin-security'
import noUnsanitized from 'eslint-plugin-no-unsanitized'
import importPlugin from 'eslint-plugin-import'
import noSecrets from 'eslint-plugin-no-secrets'

export default tseslint.config(
  { ignores: ['dist', 'eslint.config.js', 'node_modules', '__tests__', 'coverage'] },
  {
    files: ['**/*.ts'],
    plugins: {
      'no-secrets': noSecrets,
    },
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      importPlugin.flatConfigs.recommended,
      security.configs.recommended,
      noUnsanitized.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',

      'import/no-unresolved': 'off',
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal'],
          'newlines-between': 'always',
        },
      ],

      'no-secrets/no-secrets': [
        'error',
        {
          tolerance: 5,
          additionalRegexes: {
            'Hardcoded API Key': /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]{8,}['"]/i,
            'Hardcoded Token': /(?:token|secret|jwt)\s*[:=]\s*['"][^'"]{8,}['"]/i,
            'Hardcoded Password': /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{3,}['"]/i,
            'Bearer Token': /Bearer\s+[A-Za-z0-9\-._~+/]+=*/,
            'Private Key': /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
          },
        },
      ],
    },
  }
)
