const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(path.resolve(__dirname, '../src/components/ui/dialog.tsx'), 'utf8')

// 公共弹框默认受视口高度约束；小屏内容超出时由弹框自身纵向滚动，
// 并阻止滚动链穿透到被锁定的背景页面。
assert.ok(source.includes('max-h-[calc(100dvh-2rem)]'), 'DialogContent 应默认限制最大高度为视口减上下留白')
assert.ok(source.includes('overflow-y-auto'), 'DialogContent 应默认支持纵向滚动')
assert.ok(source.includes('overscroll-contain'), 'DialogContent 应阻止滚动穿透到背景')
console.log('PASS: 公共弹框在小屏视口内约束高度并支持纵向滚动')
