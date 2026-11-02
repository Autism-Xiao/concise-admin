import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'src/routeTree.gen.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      // ===== 从旧项目移植的通用规则 =====
      'no-var': 'error', // 要求使用 let 或 const 而不是 var
      'no-multiple-empty-lines': ['error', { max: 1 }], // 不允许多个空行
      'prefer-const': 'off', // 不强制 let 改 const
      'no-use-before-define': 'off', // 允许定义前使用
      'react-refresh/only-export-components': 'off',
      'react-hooks/set-state-in-effect': 'off',

      // ===== TypeScript 规则 =====
      '@typescript-eslint/no-unused-vars': 'error', // 禁止未使用的变量
      '@typescript-eslint/no-empty-function': 'error', // 禁止空函数
      '@typescript-eslint/ban-ts-comment': 'error', // 禁止裸用 @ts-ignore 等注释
      '@typescript-eslint/no-inferrable-types': 'off', // 允许可推断的显式类型
      '@typescript-eslint/no-namespace': 'off', // 允许命名空间
      '@typescript-eslint/no-explicit-any': 'off', // 允许 any
      '@typescript-eslint/no-non-null-assertion': 'off', // 允许 ! 非空断言
      '@typescript-eslint/no-require-imports': 'off' // 允许 require 导入（旧规则的 v8 替代名）
    }
  },
  prettier // 必须放最后：关掉所有与 Prettier 冲突的规则
])
