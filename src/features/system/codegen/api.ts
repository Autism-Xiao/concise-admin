import { getApiResult } from '@/lib/http'

/** 代码生成器：把 scripts/gen-module.cjs 的 DSL 变成表单 */

export const CODEGEN_TYPE_OPTIONS = [
  { value: 'string', label: '单行文本', hint: 'VARCHAR(128)' },
  { value: 'text', label: '多行文本', hint: 'TEXT' },
  { value: 'int', label: '整数', hint: 'INT' },
  { value: 'bigint', label: '长整数', hint: 'BIGINT' },
  { value: 'tinyint', label: '小整数', hint: 'TINYINT' },
  { value: 'decimal', label: '金额/小数', hint: 'DECIMAL(14,2)' },
  { value: 'datetime', label: '日期时间', hint: 'DATETIME' },
  { value: 'bool', label: '开关', hint: 'TINYINT(1)' },
  { value: 'enum', label: '枚举', hint: 'TINYINT + 标签映射' }
] as const

export type CodegenFieldType = (typeof CODEGEN_TYPE_OPTIONS)[number]['value']

export interface CodegenMeta {
  enabled: boolean
  production: boolean
  roots: { server: string; admin: string; adminReady: boolean }
  types: Array<{ value: CodegenFieldType; label: string; hint: string }>
  icons: Array<{ value: string; label: string }>
  parents: Array<{ value: string; label: string }>
  fieldTypes: string[]
}

export interface CodegenEnumValue {
  value: number
  label: string
}

export interface CodegenFieldPayload {
  name: string
  type: CodegenFieldType
  comment?: string
  required?: boolean
  unique?: boolean
  query?: boolean
  search?: boolean
  default?: string
  enumValues?: CodegenEnumValue[]
}

export interface CodegenSpecPayload {
  module: string
  label: string
  perms?: string
  table?: string
  menuParent?: string
  sort?: number
  icon?: string
  fields: CodegenFieldPayload[]
}

export interface CodegenFile {
  scope: 'server' | 'admin'
  path: string
  language: string
  bytes: number
  lines: number
  truncated: boolean
  content: string
}

export interface CodegenPreview {
  module: string
  label: string
  table: string
  menuId: string
  files: CodegenFile[]
  touched: string[]
  warnings: string[]
  log: string
}

export interface CodegenGenerateResult {
  module: string
  label: string
  table: string
  menuId: string
  created: string[]
  skipped: string[]
  nextSteps: string[]
  log: string
}

export interface CodegenTableInfo {
  name: string
  comment: string
  columns: number
  hasModule: boolean
}

export interface CodegenIntrospectResult {
  table: string
  label: string
  fields: Array<Required<Pick<CodegenFieldPayload, 'name' | 'type' | 'comment' | 'required' | 'unique' | 'query' | 'search'>> & { default?: string }>
}

export function fetchCodegenMeta() {
  return getApiResult<CodegenMeta>('/backend-api/v1/codegen/meta')
}

export function fetchCodegenTables() {
  return getApiResult<CodegenTableInfo[]>('/backend-api/v1/codegen/tables')
}

export function fetchTableFields(table: string) {
  return getApiResult<CodegenIntrospectResult>(`/backend-api/v1/codegen/tables/${encodeURIComponent(table)}/fields`)
}

export function previewCodegen(payload: CodegenSpecPayload) {
  return getApiResult<CodegenPreview>('/backend-api/v1/codegen/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export function generateCodegen(payload: CodegenSpecPayload & { force?: boolean }) {
  return getApiResult<CodegenGenerateResult>('/backend-api/v1/codegen/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}
