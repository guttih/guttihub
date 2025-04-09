// eslint.config.mjs
/* eslint-disable */
import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    // {
    //     rules: {
    //         '@typescript-eslint/naming-convention': [
    //             'error',
    //             { selector: 'default', format: ['camelCase'] },
    //             // { selector: 'variableLike', format: ['camelCase', 'UPPER_CASE'] },
    //             // { selector: 'function', format: ['camelCase'] },
    //             { selector: 'typeLike', format: ['PascalCase'] },
    //             { selector: 'enum', format: ['PascalCase'] },
    //             // { selector: 'enumMember', format: ['UPPER_CASE'], }, 
    //             // {
    //             //     selector: "variable",
    //             //     modifiers: ["global"],
    //             //     format: ["camelCase", "UPPER_CASE"],
    //             //     filter: {
    //             //         regex: "^__streamStore$",
    //             //         match: true,
    //             //     },
    //             // }, 
    //             {
    //                 selector: "function",
    //                 filter: {
    //                     regex: "^(GET|POST|PUT|DELETE|PATCH|OPTIONS)$",
    //                     match: true
    //                 },
    //                 format: null // disables the rule for these
    //             },
    //             {
    //                 // Allow PascalCase for React components
    //                 selector: 'function',
    //                 filter: {
    //                   regex: '^[A-Z]',
    //                   match: true,
    //                 },
    //                 format: ['PascalCase'],
    //               },
    //         ],
    //     },
    // },
];
