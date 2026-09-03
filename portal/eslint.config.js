import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'public/vendor/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }]
    }
  },
  {
    files: ['server/**/*.mjs'],
    languageOptions: { globals: { AbortSignal: 'readonly', Buffer: 'readonly', console: 'readonly', fetch: 'readonly', process: 'readonly', setInterval: 'readonly', TextDecoder: 'readonly', URL: 'readonly' } },
    rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] }
  },
  {
    files: ['tests/e2e/**/*.mjs'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        console: 'readonly',
        crypto: 'readonly',
        document: 'readonly',
        Events: 'readonly',
        location: 'readonly',
        Node: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        SharedArrayBuffer: 'readonly',
        URL: 'readonly',
        window: 'readonly'
      }
    }
  }
);
