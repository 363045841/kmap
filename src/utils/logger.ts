type TagLevel = 'info' | 'success' | 'warn' | 'error'

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

export function tagLog(level: TagLevel | string, value: unknown) {
  const lv: TagLevel = isTagLevel(level) ? level : 'info'
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
  const now = Date.now()
  const last = throttleMap.get(key) ?? 0
  if (now - last < wait) return
  throttleMap.set(key, now)
  tagLog(level, value)
}