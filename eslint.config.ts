import eslint from '@eslint/js'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import reactHooksPlugin from 'eslint-plugin-react-hooks'

export default defineConfig([
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'out/**',
      '.superpowers/**',
      'test-results/**',
      'playwright-report/**',
      'coverage/**',
      'scripts/**', // plain node build scripts, outside the tsconfig project

      '.vscode/**',
      '.git/**',
      '.gitignore',
      '.eslintignore',
      '.eslintrc',
      '.prettierrc',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs,jsx,ts,tsx}'],
    plugins: {
      // Register the rules we use; the package's nested legacy presets do not match ESLint 10's config type.
      'react-hooks': { meta: reactHooksPlugin.meta, rules: reactHooksPlugin.rules },
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        projectService: true,
      },
      globals: {
        // Browser globals that should be readonly
        window: 'readonly',
        document: 'readonly',
        location: 'readonly',
        history: 'readonly',
        navigator: 'readonly',

        // Browser globals that can be modified
        console: 'writable',
        localStorage: 'writable',
        sessionStorage: 'writable',

        // Timer functions that can be modified
        setTimeout: 'writable',
        clearTimeout: 'writable',
        setInterval: 'writable',
        clearInterval: 'writable',

        // Node.js globals
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',

        // React globals
        React: 'readonly',
      },
    },
    rules: {
      // React specific rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'off',

      // Global modification rules
      'no-global-assign': [
        'error',
        {
          exceptions: ['console', 'localStorage', 'sessionStorage'],
        },
      ],
    },
  },
  // Add specific configuration for preload files
  {
    files: ['app/**/*.ts', 'lib/**/*.ts', 'app/**/*.tsx', 'lib/**/*.tsx'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        window: 'readonly',
      },
    },
  },
])
