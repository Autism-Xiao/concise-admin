// 主题色预设：客户端（settings-provider）与服务端（vite transformIndexHtml）共用，
// 本文件必须保持零依赖（不能引用 @ 别名 / React）
export interface ThemeColorPreset {
  name: string
  label: string
  /** 色板展示色 */
  swatch: string
  /** 深色模式下的色板展示色（如默认色在浅色下近黑、深色下近白），不传则与 swatch 一致 */
  swatchDark?: string
  vars: {
    light: Record<string, string>
    dark: Record<string, string>
  }
}

const WHITE = 'oklch(0.985 0 0)'

export const THEME_COLORS: ThemeColorPreset[] = [
  {
    name: 'default',
    label: '默认',
    swatch: 'oklch(0.205 0 0)',
    swatchDark: 'oklch(0.92 0 0)',
    vars: { light: {}, dark: {} }
  },
  {
    name: 'blue',
    label: '蓝色',
    swatch: 'oklch(0.546 0.245 262.881)',
    vars: {
      light: {
        '--primary': 'oklch(0.546 0.245 262.881)',
        '--primary-foreground': WHITE,
        '--ring': 'oklch(0.546 0.245 262.881)',
        '--sidebar-primary': 'oklch(0.546 0.245 262.881)',
        '--sidebar-ring': 'oklch(0.546 0.245 262.881)'
      },
      dark: {
        '--primary': 'oklch(0.623 0.214 259.815)',
        '--primary-foreground': WHITE,
        '--ring': 'oklch(0.623 0.214 259.815)',
        '--sidebar-primary': 'oklch(0.623 0.214 259.815)',
        '--sidebar-ring': 'oklch(0.623 0.214 259.815)'
      }
    }
  },
  {
    name: 'green',
    label: '绿色',
    swatch: 'oklch(0.6 0.17 160)',
    vars: {
      light: {
        '--primary': 'oklch(0.6 0.17 160)',
        '--primary-foreground': WHITE,
        '--ring': 'oklch(0.6 0.17 160)',
        '--sidebar-primary': 'oklch(0.6 0.17 160)',
        '--sidebar-ring': 'oklch(0.6 0.17 160)'
      },
      dark: {
        '--primary': 'oklch(0.696 0.17 162.48)',
        '--primary-foreground': WHITE,
        '--ring': 'oklch(0.696 0.17 162.48)',
        '--sidebar-primary': 'oklch(0.696 0.17 162.48)',
        '--sidebar-ring': 'oklch(0.696 0.17 162.48)'
      }
    }
  },
  {
    name: 'orange',
    label: '橙色',
    swatch: 'oklch(0.646 0.222 41.116)',
    vars: {
      light: {
        '--primary': 'oklch(0.646 0.222 41.116)',
        '--primary-foreground': WHITE,
        '--ring': 'oklch(0.646 0.222 41.116)',
        '--sidebar-primary': 'oklch(0.646 0.222 41.116)',
        '--sidebar-ring': 'oklch(0.646 0.222 41.116)'
      },
      dark: {
        '--primary': 'oklch(0.705 0.213 47.604)',
        '--primary-foreground': WHITE,
        '--ring': 'oklch(0.705 0.213 47.604)',
        '--sidebar-primary': 'oklch(0.705 0.213 47.604)',
        '--sidebar-ring': 'oklch(0.705 0.213 47.604)'
      }
    }
  },
  {
    name: 'red',
    label: '红色',
    swatch: 'oklch(0.577 0.245 27.325)',
    vars: {
      light: {
        '--primary': 'oklch(0.577 0.245 27.325)',
        '--primary-foreground': WHITE,
        '--ring': 'oklch(0.577 0.245 27.325)',
        '--sidebar-primary': 'oklch(0.577 0.245 27.325)',
        '--sidebar-ring': 'oklch(0.577 0.245 27.325)'
      },
      dark: {
        '--primary': 'oklch(0.637 0.237 25.331)',
        '--primary-foreground': WHITE,
        '--ring': 'oklch(0.637 0.237 25.331)',
        '--sidebar-primary': 'oklch(0.637 0.237 25.331)',
        '--sidebar-ring': 'oklch(0.637 0.237 25.331)'
      }
    }
  },
  {
    name: 'violet',
    label: '紫色',
    swatch: 'oklch(0.541 0.281 293.009)',
    vars: {
      light: {
        '--primary': 'oklch(0.541 0.281 293.009)',
        '--primary-foreground': WHITE,
        '--ring': 'oklch(0.541 0.281 293.009)',
        '--sidebar-primary': 'oklch(0.541 0.281 293.009)',
        '--sidebar-ring': 'oklch(0.541 0.281 293.009)'
      },
      dark: {
        '--primary': 'oklch(0.606 0.25 292.717)',
        '--primary-foreground': WHITE,
        '--ring': 'oklch(0.606 0.25 292.717)',
        '--sidebar-primary': 'oklch(0.606 0.25 292.717)',
        '--sidebar-ring': 'oklch(0.606 0.25 292.717)'
      }
    }
  },
  {
    name: 'teal',
    label: '青色',
    swatch: 'oklch(0.6 0.118 184.704)',
    vars: {
      light: {
        '--primary': 'oklch(0.6 0.118 184.704)',
        '--primary-foreground': WHITE,
        '--ring': 'oklch(0.6 0.118 184.704)',
        '--sidebar-primary': 'oklch(0.6 0.118 184.704)',
        '--sidebar-ring': 'oklch(0.6 0.118 184.704)'
      },
      dark: {
        '--primary': 'oklch(0.696 0.145 184)',
        '--primary-foreground': WHITE,
        '--ring': 'oklch(0.696 0.145 184)',
        '--sidebar-primary': 'oklch(0.696 0.145 184)',
        '--sidebar-ring': 'oklch(0.696 0.145 184)'
      }
    }
  }
]

export function getThemeColorPreset(name: string): ThemeColorPreset {
  return THEME_COLORS.find(p => p.name === name) ?? THEME_COLORS[0]
}

// 生成覆盖 CSS 变量的 style 内容；default 返回空串（使用默认主题）
export function buildThemeColorCss(name: string): string {
  const preset = getThemeColorPreset(name)
  if (preset.name === 'default') return ''
  const toRules = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([k, v]) => `${k}:${v}`)
      .join(';')
  return `:root{${toRules(preset.vars.light)}}.dark{${toRules(preset.vars.dark)}}`
}

// 灰色 / 色弱模式滤镜
export function buildFilterCss(grayscale: boolean, colorWeak: boolean): string {
  const filters: string[] = []
  if (grayscale) filters.push('grayscale(1)')
  if (colorWeak) filters.push('invert(0.8)')
  return filters.length ? `html{filter:${filters.join(' ')}}` : ''
}
