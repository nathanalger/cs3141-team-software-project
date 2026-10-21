import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
   globalIgnores(['dist']),
   {
      files: ['**/*.{ts,tsx}'],
      extends: [
         js.configs.recommended,
         tseslint.configs.recommended,
         reactHooks.configs.flat.recommended,
         reactRefresh.configs.vite,
      ],
      languageOptions: {
         globals: globals.browser,
      },
      plugins: {
         'unused-imports': unusedImports,
      },
      rules: {
         // Turn off core and TypeScript unused variable rules to prevent conflicts
         'no-unused-vars': 'off',
         '@typescript-eslint/no-unused-vars': 'off',

         // Automatically report and fix unused imports
         'unused-imports/no-unused-imports': 'error',

         // Safely handle other unused variables (arguments starting with '_' are ignored)
         'unused-imports/no-unused-vars': [
            'warn',
            {
               vars: 'all',
               varsIgnorePattern: '^_',
               args: 'after-used',
               argsIgnorePattern: '^_',
            },
         ],
      },
   },
]);
