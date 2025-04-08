// eslint.config.mjs
import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
        rules: {
            '@typescript-eslint/naming-convention': [
                'error',
                { selector: 'default', format: ['camelCase'] },
                { selector: 'variableLike', format: ['camelCase'] },
                { selector: 'function', format: ['camelCase'] },
                { selector: 'typeLike', format: ['PascalCase'] },
                { selector: 'enum', format: ['PascalCase'] },
            ],
        },
    },
];
