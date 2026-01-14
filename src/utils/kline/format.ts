import type { KLineData } from '@/types/price'

// 重新导出日期格式化函数以保持向后兼容
export { formatShanghaiDate } from '@/utils/dateFormat'

export const UP_COLOR = 'rgba(214, 10, 34, 1)'
export const DOWN_COLOR = 'rgba(3, 123, 102, 1)'
export const NEUTRAL_COLOR = 'rgba(0, 0, 0, 0.78)'

export function getUpDownColor(delta: number): string {
    if (delta > 0) return UP_COLOR
    if (delta < 0) return DOWN_COLOR
    return NEUTRAL_COLOR
}

/** 成交量/成交额单位换算：万/亿 */
export function formatWanYi(n: number, digits = 2): string {
    const abs = Math.abs(n)
    if (abs >= 1e8) return `${(n / 1e8).toFixed(digits)}亿`
    if (abs >= 1e4) return `${(n / 1e4).toFixed(digits)}万`
    // 小数意义不大，默认取整
    return `${Math.round(n)}`
}

export function formatSignedNumber(n: number, digits = 2): string {
    const sign = n > 0 ? '+' : ''
    return `${sign}${n.toFixed(digits)}`
}

export function formatPercent(n: number, digits = 2): string {
    return `${n.toFixed(digits)}%`
}

export function formatSignedPercent(n: number, digits = 2): string {
    const sign = n > 0 ? '+' : ''
    return `${sign}${n.toFixed(digits)}%`
}

export function calcOpenColor(k: KLineData, prev?: KLineData): string {
    const base = prev?.close ?? k.open
    return getUpDownColor(k.open - base)
}

export function calcCloseColor(k: KLineData): string {
    return getUpDownColor(k.close - k.open)
}

export function calcChangeColor(k: KLineData): string {
    if (typeof k.changePercent === 'number') return getUpDownColor(k.changePercent)
    if (typeof k.changeAmount === 'number') return getUpDownColor(k.changeAmount)
    return NEUTRAL_COLOR
}

