export const zh = {
  // 侧边栏分组
  'group.general': '通用',
  'group.pages': '页面',
  'group.other': '其他',
  // 导航菜单
  'nav.dashboard': '仪表盘',
  'nav.tasks': '任务',
  'nav.apps': '应用',
  'nav.chats': '聊天',
  'nav.users': '用户',
  'nav.errors': '错误页',
  'nav.errors.401': '401 未授权',
  'nav.errors.403': '403 禁止访问',
  'nav.errors.404': '404 不存在',
  'nav.errors.500': '500 服务器错误',
  'nav.errors.503': '503 维护中',
  'nav.settings': '设置',
  'nav.helpCenter': '帮助中心',
  'nav.search': '搜索',
  // 主题
  'theme.light': '浅色',
  'theme.dark': '深色',
  'theme.system': '跟随系统',
  'theme.toggle': '切换主题',
  // 搜索
  'search.placeholder': '搜索',
  'search.inputPlaceholder': '输入命令或搜索…',
  'search.title': '全局搜索',
  'search.empty': '没有找到相关结果',
  // 头像菜单
  'profile.profile': '个人资料',
  'profile.settings': '设置',
  'profile.logout': '退出登录',
  // 语言
  'language.switch': '切换语言',
  // 登录页
  'login.title': '登录',
  'login.desc': '输入账号密码和验证码登录系统',
  'login.account': '账号',
  'login.accountPlaceholder': '请输入账号',
  'login.password': '密码',
  'login.passwordPlaceholder': '请输入密码',
  'login.forgot': '忘记密码？',
  'login.captcha': '验证码',
  'login.captchaPlaceholder': '请输入验证码',
  'login.captchaRefresh': '点击刷新验证码',
  'login.submit': '登录',
  'login.success': '登录成功',
  'login.captchaError': '验证码错误，请重新输入'
} as const

export type TranslationKey = keyof typeof zh

export const en: Record<TranslationKey, string> = {
  'group.general': 'General',
  'group.pages': 'Pages',
  'group.other': 'Other',
  'nav.dashboard': 'Dashboard',
  'nav.tasks': 'Tasks',
  'nav.apps': 'Apps',
  'nav.chats': 'Chats',
  'nav.users': 'Users',
  'nav.errors': 'Errors',
  'nav.errors.401': '401 Unauthorized',
  'nav.errors.403': '403 Forbidden',
  'nav.errors.404': '404 Not Found',
  'nav.errors.500': '500 Server Error',
  'nav.errors.503': '503 Maintenance',
  'nav.settings': 'Settings',
  'nav.helpCenter': 'Help Center',
  'nav.search': 'Search',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'System',
  'theme.toggle': 'Toggle theme',
  'search.placeholder': 'Search',
  'search.inputPlaceholder': 'Type a command or search…',
  'search.title': 'Command Menu',
  'search.empty': 'No results found',
  'profile.profile': 'Profile',
  'profile.settings': 'Settings',
  'profile.logout': 'Sign out',
  'language.switch': 'Switch language',
  'login.title': 'Sign in to',
  'login.desc': 'Enter your account, password and captcha',
  'login.account': 'Account',
  'login.accountPlaceholder': 'Enter your account',
  'login.password': 'Password',
  'login.passwordPlaceholder': 'Enter your password',
  'login.forgot': 'Forgot password?',
  'login.captcha': 'Captcha',
  'login.captchaPlaceholder': 'Enter captcha',
  'login.captchaRefresh': 'Click to refresh captcha',
  'login.submit': 'Sign in',
  'login.success': 'Signed in successfully',
  'login.captchaError': 'Wrong captcha, please try again'
}

export const dictionaries = { zh, en }
export type Locale = keyof typeof dictionaries
export const localeNames: Record<Locale, string> = { zh: '中文', en: 'English' }
