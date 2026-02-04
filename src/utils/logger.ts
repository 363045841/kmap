type TagLevel = 'info' | 'success' | 'warn' | 'error'

interface LoggerConfig {
  enabled: boolean
  levels: Record<TagLevel, boolean>
}

const tagStyle: Record<TagLevel, string> = {
  info: 'background:#164586;color:#fff;',
  success: 'background:#389e0d;color:#fff;',
  warn: 'background:#d46b08;color:#fff;',
  error: 'background:#cf1322;color:#fff;',
}

const leftBase = 'padding:4px 8px;font-weight:600;border-radius:6px;'
const rightBase =
  'padding:4px 10px;border:1px solid #d9d9d9;background:#fff;color:#111;border-radius:6px;' +
  'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;'

function isTagLevel(x: unknown): x is TagLevel {
  return x === 'info' || x === 'success' || x === 'warn' || x === 'error'
}

// 静态导入配置文件
import loggerConfig from '../../src/config/logger.config.json'

// 配置缓存
let configCache: LoggerConfig | null = null

// 默认配置
const defaultConfig: LoggerConfig = {
  enabled: true,
  levels: {
    info: true,
    success: true,
    warn: true,
    error: true,
  },
}

// 读取配置
function loadConfig(): LoggerConfig {
  if (configCache) {
    return configCache
  }

  // 使用导入的配置，如果无效则使用默认配置
  configCache = isLoggerConfig(loggerConfig) ? loggerConfig : defaultConfig
  return configCache
}

// 类型守卫
function isLoggerConfig(x: unknown): x is LoggerConfig {
  if (typeof x !== 'object' || x === null) {
    return false
  }
  const config = x as Record<string, unknown>
  if (typeof config.enabled !== 'boolean') {
    return false
  }
  if (typeof config.levels !== 'object' || config.levels === null) {
    return false
  }
  const levels = config.levels as Record<string, unknown>
  return (
    typeof levels.info === 'boolean' &&
    typeof levels.success === 'boolean' &&
    typeof levels.warn === 'boolean' &&
    typeof levels.error === 'boolean'
  )
}

// 检查是否应该输出日志
function shouldLog(level: TagLevel): boolean {
  const config = loadConfig()
  return config.enabled && config.levels[level]
}

// 重新加载配置
export function reloadConfig(): void {
  configCache = null
  loadConfig()
}

export function tagLog(level: TagLevel | string, value: unknown) {
  const lv: TagLevel = isTagLevel(level) ? level : 'info'
  if (!shouldLog(lv)) {
    return
  }
  console.log(`%c${level}%c`, `${leftBase}${tagStyle[lv]}`, rightBase, value)
}

// 节流版 tagLog
const throttleMap = new Map<string, number>()

export function tagLogThrottle(
  level: TagLevel | string,
  value: unknown,
  key: string,
  wait = 1000
) {
  const lv: TagLevel = isTagLevel(level) ? level : 'info'
  if (!shouldLog(lv)) {
    return
  }
  const now = Date.now()
  const last = throttleMap.get(key) ?? 0
  if (now - last < wait) return
  throttleMap.set(key, now)
  tagLog(level, value)
}
