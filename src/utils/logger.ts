type TagLevel = 'info' | 'success' | 'warn' | 'error'

const tagStyle: Record<TagLevel, string> = {
  info: 'background:#1677ff;color:#fff;border:1px solid #1677ff;',
  success: 'background:#389e0d;color:#fff;border:1px solid #389e0d;',
  warn: 'background:#d46b08;color:#fff;border:1px solid #d46b08;',
  error: 'background:#cf1322;color:#fff;border:1px solid #cf1322;',
}

const leftBase = 'padding:4px 8px;font-weight:600;border-radius:6px;'

const rightBase =
  'padding:4px 10px;border:1px solid #d9d9d9;background:#fff;color:#111;border-radius:6px;' +
  'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;'

export function tagLog(level: TagLevel, tag: string, value: unknown) {
  console.log(`%c${tag}%c`, `${leftBase}${tagStyle[level]}`, rightBase, value)
}
