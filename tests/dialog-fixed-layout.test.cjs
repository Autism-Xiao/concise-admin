const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const dialogSource = fs.readFileSync(path.resolve(__dirname, '../src/components/ui/dialog.tsx'), 'utf8')
const tenantSource = fs.readFileSync(path.resolve(__dirname, '../src/features/system/tenant/components/tenant-form-dialog.tsx'), 'utf8')
const commandSource = fs.readFileSync(path.resolve(__dirname, '../src/components/command-menu.tsx'), 'utf8')
const cssSource = fs.readFileSync(path.resolve(__dirname, '../src/index.css'), 'utf8')

// DialogContent 默认固定头尾：自动分拣 DialogHeader/DialogFooter，其余内容进独立滚动区，
// 标题与底部操作按钮不随内容滚走。
assert.ok(dialogSource.includes("layout = 'fixed'"), 'DialogContent 应默认采用固定头尾布局')
assert.ok(dialogSource.includes('function splitDialogSlots'), 'DialogContent 应自动分拣头/身/尾插槽')
assert.ok(dialogSource.includes('data-slot="dialog-body"'), '滚动内容区应提供稳定的结构标记')
assert.ok(dialogSource.includes('min-h-0 flex-1 overflow-y-auto overscroll-contain'), '滚动内容区应占满剩余空间并独立纵向滚动')
assert.ok(dialogSource.includes("layout?: 'fixed' | 'free'"), '应保留 layout="free" 供自绘满幅布局豁免')

// 自绘满幅布局（命令面板、登录验证码）不走自动分拣
assert.ok(commandSource.includes('layout="free"'), '命令面板应使用自由布局')

// 弹框滚动区复用后台统一的细窄、悬浮显现滚动条。
assert.ok(dialogSource.includes('data-scroll="dialog"'), '弹框滚动区应标记为 dialog 滚动区')
assert.ok(cssSource.includes("[data-scroll='dialog']"), '全局样式应覆盖弹框滚动条')

// 租户表单是固定头尾的样板：不再手写布局类，交给公共组件接管
assert.ok(!tenantSource.includes('<DialogBody>'), '固定布局已全局默认，租户表单不应再手写 DialogBody')
assert.ok(!tenantSource.includes('overflow-hidden'), '租户表单不应再手写 overflow-hidden 布局类')
assert.ok(tenantSource.includes('form="tenant-form"'), '固定底部的保存按钮仍应提交租户表单')

console.log('PASS: 弹框全局固定头尾、内容区滚动和统一细滚动条')
