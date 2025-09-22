const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const reactHooks = require('eslint-plugin-react-hooks');

module.exports = [
  // Base rules for app code (exclude tests)
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: [
      'docs/.vitepress/**',
      'coverage/**',
      'config/**',
      'constants/**',
      'contracts/**',
      'agents/**',
      'infra/**',
      'indexers/**',
      'lib/**',
      'relayer/**',
      'schemas/**',
      'scripts/**',
      'contexts/**',
      'types/**',
      'utils/**',
      'web/**',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/\\(tabs\\)/]",
          message: "Avoid using the tabs route group; use root-relative '/' paths instead.",
        },
        {
          selector: "TemplateElement[value.raw=/\\(tabs\\)/]",
          message: "Avoid using the tabs route group; use root-relative '/' paths instead.",
        },
        {
          selector:
            "Property[key.name='tabBarStyle'] > ObjectExpression > Property[key.name='display'] > Literal[value='none']",
          message: "Avoid hiding the tab bar with tabBarStyle.display 'none'.",
        },
        {
          selector: "CallExpression[callee.name='useRouter']",
          message: "useAppRouter hook must be used instead of useRouter.",
        },
        {
          selector: "MemberExpression[object.name='router']",
          message: "Do not use router directly; use useAppRouter().",
        },
        {
          selector: "Literal[value^='/']",
          message: 'Use routes helper functions instead of hard-coded paths.',
        },
        {
          selector: "TemplateElement[value.raw^='/']",
          message: 'Use routes helper functions instead of hard-coded paths.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: ['../src/**', '../../src/**'],
        },
      ],
    },
  },
  {
    files: ['docs/.vitepress/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
  },
];
