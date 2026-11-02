"""一次性脚本：解析 shadmin 的主题预设 CSS，生成 concise-admin 的 theme-presets.ts"""
import re
from pathlib import Path

SRC = Path(r'C:\Users\58202\Downloads\shadmin-main\shadmin-main\src\styles\presets')
OUT = Path(r'E:\project\oneself\concise-admin\src\lib\theme-presets.ts')

# 文件名顺序 + 中文标签
PRESETS = [
    ('tangerine', '橘橙'),
    ('sunset', '落日'),
    ('soft-pop', '柔粉'),
    ('cobalt', '钴蓝'),
    ('mint', '薄荷'),
    ('slate', '石板'),
    ('rose', '玫瑰'),
    ('midnight', '午夜'),
    ('cherry', '樱桃'),
    ('ocean', '海洋'),
    ('lavender', '薰衣草'),
    ('brutalist', '粗野'),
    ('forest', '森林'),
    ('amber', '琥珀'),
]

def parse_block(css: str, selector: str) -> dict:
    m = re.search(re.escape(selector) + r'\s*\{([^}]*)\}', css)
    if not m:
        return {}
    out = {}
    for decl in m.group(1).split(';'):
        decl = decl.strip()
        if not decl.startswith('--'):
            continue
        k, _, v = decl.partition(':')
        k = k.strip()
        if k.startswith('--shadow'):  # 本项目阴影未走 CSS 变量，跳过
            continue
        out[k] = v.strip()
    return out

def fmt_vars(vars_: dict, indent: str) -> str:
    pad = indent + '  '
    lines = [f"{pad}'{k}': '{v}'," for k, v in vars_.items()]
    # 去掉最后一行尾逗号风格统一为无尾逗号
    if lines:
        lines[-1] = lines[-1].rstrip(',')
    return '\n'.join(lines)

entries = []
for name, label in PRESETS:
    css = (SRC / f'{name}.css').read_text(encoding='utf-8')
    light = parse_block(css, f':root[data-theme-preset="{name}"]')
    dark = parse_block(css, f'.dark:root[data-theme-preset="{name}"]')
    assert light and dark, f'{name} 解析失败'
    swatch = light.get('--primary', 'oklch(0.5 0.1 0)')
    entries.append(
        f"""  {{
    name: '{name}',
    label: '{label}',
    swatch: '{swatch}',
    vars: {{
      light: {{
{fmt_vars(light, '      ')}
      }},
      dark: {{
{fmt_vars(dark, '      ')}
      }}
    }}
  }}"""
    )

ts = f"""// 主题预设：客户端（settings-provider）与服务端（vite transformIndexHtml）共用，
// 本文件必须保持零依赖（不能引用 @ 别名 / React）
// 预设来源：shadmin（src/styles/presets），覆盖整套 shadcn 变量（背景/卡片/侧边栏/图表色等）
export interface ThemeColorPreset {{
  name: string
  label: string
  /** 色板展示色 */
  swatch: string
  /** 深色模式下的色板展示色（如默认色在浅色下近黑、深色下近白），不传则与 swatch 一致 */
  swatchDark?: string
  vars: {{
    light: Record<string, string>
    dark: Record<string, string>
  }}
}}

export const THEME_COLORS: ThemeColorPreset[] = [
  {{
    name: 'default',
    label: '默认',
    swatch: 'oklch(0.205 0 0)',
    swatchDark: 'oklch(0.92 0 0)',
    vars: {{ light: {{}}, dark: {{}} }}
  }},
{',\n'.join(entries)}
]

export function getThemeColorPreset(name: string): ThemeColorPreset {{
  return THEME_COLORS.find(p => p.name === name) ?? THEME_COLORS[0]
}}

// 生成覆盖 CSS 变量的 style 内容；default 返回空串（使用默认主题）
export function buildThemeColorCss(name: string): string {{
  const preset = getThemeColorPreset(name)
  if (preset.name === 'default') return ''
  const toRules = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([k, v]) => `${{k}}:${{v}}`)
      .join(';')
  return `:root{{${{toRules(preset.vars.light)}}}}.dark{{${{toRules(preset.vars.dark)}}}}`
}}

// 灰色 / 色弱模式滤镜
export function buildFilterCss(grayscale: boolean, colorWeak: boolean): string {{
  const filters: string[] = []
  if (grayscale) filters.push('grayscale(1)')
  if (colorWeak) filters.push('invert(0.8)')
  return filters.length ? `html{{filter:${{filters.join(' ')}}}}` : ''
}}
"""

OUT.write_text(ts, encoding='utf-8')
print(f'generated {len(entries)} presets -> {OUT}')
