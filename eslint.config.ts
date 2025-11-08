import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import codeComplete from 'eslint-plugin-code-complete'
import importPlugin from 'eslint-plugin-import'
import jestPlugin from 'eslint-plugin-jest'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import pluginPromise from 'eslint-plugin-promise'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import sonarjs from 'eslint-plugin-sonarjs'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'
import unusedImports from 'eslint-plugin-unused-imports'
import globals from 'globals'
import { configs as tsConfigs } from 'typescript-eslint'
import eslintPluginSecurity from 'eslint-plugin-security'
import packageJson from 'eslint-plugin-package-json'
import reactPerfPlugin from 'eslint-plugin-react-perf'

export default defineConfig([
  globalIgnores([
    'dist/**',
    'build/**',
    'node_modules/**',
    'coverage/**',
    'vite.config.ts',
    'tailwind.config.js',
    '.github/**',
    'storybook-static',
    '.storybook',
    'demo/vite.config.ts',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tsConfigs.recommendedTypeChecked,
      ...tsConfigs.strictTypeChecked,
      reactRefresh.configs.vite,
      reactRefresh.configs.recommended,
      eslintPluginUnicorn.configs.all,
      eslintPluginPrettierRecommended,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
      sonarjs.configs.recommended,
      pluginPromise.configs['flat/recommended'],
      jestPlugin.configs['flat/recommended'],
      jsxA11y.flatConfigs.recommended,
      eslintPluginSecurity.configs.recommended,
      packageJson.configs.recommended,
      reactPerfPlugin.configs.flat.all,
    ],
    plugins: {
      'code-complete': codeComplete,
      'react-hooks': reactHooks,
      'unused-imports': unusedImports,
      jest: jestPlugin,
      react: reactPlugin,
      'react-perf': reactPerfPlugin,
    },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
      },
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: ['./tsconfig*.json'],
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    rules: {
      // === UNUSED IMPORTS DETECTION ===
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],

      // === TypeScript CONSISTENT IMPORTS ===
      '@typescript-eslint/no-import-type-side-effects': 'error',

      // === IMPORT ORGANIZATION ===
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'never',
          pathGroups: [
            {
              pattern: 'react',
              group: 'builtin',
              position: 'before',
            },
            {
              pattern: '../types',
              group: 'parent',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': ['error', { 'prefer-inline': false }],
      'import/no-unresolved': 'error',
      'import/no-cycle': 'error',

      // === DISABLE CONFLICTING RULES ===
      '@typescript-eslint/no-unused-vars': 'off', // Use unused-imports plugin
      'no-unused-vars': 'off', // Use unused-imports plugin

      // === UNICORN OVERRIDES ===
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/filename-case': 'off',
      'unicorn/prefer-export-from': 'off',
      'unicorn/no-keyword-prefix': 'off',
      'unicorn/no-useless-undefined': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-null': 'off',
      'unicorn/prefer-string-raw': 'off',
      'unicorn/consistent-destructuring': 'off',

      'sonarjs/no-dead-store': 'error',
      'sonarjs/void-use': 'off',
      'sonarjs/todo-tag': 'off',
      'sonarjs/different-types-comparison': 'off',
      'sonarjs/pseudo-random': 'off',
      'sonarjs/prefer-regexp-exec': 'off',
      'security/detect-object-injection': 'off',

      'code-complete/no-late-argument-usage': 'error',
      'code-complete/low-function-cohesion': 'error',
      'code-complete/enforce-meaningful-names': 'error',
      'code-complete/no-magic-numbers-except-zero-one': 'off',
      'code-complete/no-boolean-params': 'off',

      // Type safety
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'warn',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Performance and best practices
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/prefer-for-of': 'error',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',

      // Consistency
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
        },
      ],
      '@typescript-eslint/member-ordering': 'off',

      // JavaScript base rules (enhanced) - Prettier handles formatting
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-throw-literal': 'error',

      // Code quality rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',

      // Error prevention
      'no-unreachable': 'error',
      'no-useless-return': 'error',
      'no-unused-private-class-members': 'error',
      'require-atomic-updates': 'error',

      // React performance
      'react/jsx-key': 'error',
      'react/no-array-index-key': 'warn',
      'react/no-unused-prop-types': 'error',
      'react/no-unused-state': 'error',
      'react/prefer-stateless-function': 'warn',
      'react/jsx-no-constructed-context-values': 'error',

      // React consistency
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
      'react/jsx-pascal-case': 'error',
      'react/self-closing-comp': 'error',

      // Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',

      // === CODE QUALITY ===
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      'sonarjs/no-nested-conditional': 'off',
    },
  },
  {
    // Test files - more relaxed rules
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/no-null': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      'sonarjs/super-invocation': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'code-complete/enforce-meaningful-names': 'off',
      '@typescript-eslint/require-await': 'off',
      'code-complete/no-magic-numbers-except-zero-one': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'unicorn/prefer-at': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      'unicorn/no-array-sort': 'off',
      'sonarjs/no-alphabetical-sort': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'code-complete/no-boolean-params': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      'unused-imports/no-unused-vars': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      'react-perf/jsx-no-new-array-as-prop': 'off',
      'react-perf/jsx-no-new-function-as-prop': 'off',
      'react-perf/jsx-no-new-object-as-prop': 'off',
    },
  },
])
