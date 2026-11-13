const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const dialogSource = fs.readFileSync(path.resolve(__dirname, '../src/components/ui/dialog.tsx'), 'utf8')
const tenantSource = fs.readFileSync(path.resolve(__dirname, '../src/features/system/tenant/components/tenant-form-dialog.tsx'), 'utf8')
const cssSource = fs.readFileSync(path.resolve(__dirname, '../src/index.css'), 'utf8')

// 固定头尾的弹框只让 DialogBody 滚动，避免标题和底部操作按钮被滚走。
assert.ok(dialogSource.includes('function DialogBody'), '公共弹框应提供 DialogBody 滚动内容区')
assert.ok(dialogSource.includes('data-slot="dialog-body"'), 'DialogBody 应提供稳定的结构标记')
assert.ok(dialogSource.includes('min-h-0 flex-1 overflow-y-auto overscroll-contain'), 'DialogBody 应占满剩余空间并独立纵向滚动')
assert.ok(tenantSource.includes('<DialogBody>'), '租户表单应使用公共 DialogBody')
assert.ok(tenantSource.includes('form="tenant-form"'), '固定底部的保存按钮仍应提交租户表单')

// 弹框滚动区复用后台统一的细窄、悬浮显现滚动条。
assert.ok(dialogSource.includes('data-scroll="dialog"'), '弹框滚动区应标记为 dialog 滚动区')
assert.ok(cssSource.includes("[data-scroll='dialog']"), '全局样式应覆盖弹框滚动条')
console.log('PASS: 弹框支持固定头尾、内容区滚动和统一细滚动条')
