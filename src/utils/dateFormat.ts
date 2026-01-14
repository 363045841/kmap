/**
 * 日期格式化工具函数集合
 * 统一管理项目中所有日期相关的格式化逻辑
 */

/**
 * 将时间戳格式化为 YYYYMMDD 格式（纯数字，无分隔符）
 * @param timestamp - 时间戳（毫秒）
 * @returns 格式化后的日期字符串，例如 "20250114"
 *
 * @example
 * formatDateToYYYYMMDDNoDash(1736793600000) // "20250114"
 */
export function formatDateToYYYYMMDDNoDash(timestamp: number): string {
    const d = new Date(timestamp)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
}

/**
 * 获取当前日期的 YYYYMMDD 格式（纯数字，无分隔符）
 * @returns 当前日期的格式化字符串，例如 "20250114"
 *
 * @example
 * getCurrentDateYYYYMMDD() // "20250114"（根据实际日期）
 */
export function getCurrentDateYYYYMMDD(): string {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
}

/**
 * 将时间戳格式化为 YYYY-MM-DD 格式（上海时区）
 * @param timestamp - 时间戳（毫秒）
 * @returns 格式化后的日期字符串，例如 "2025-01-14"
 *
 * @example
 * formatDateToYYYYMMDD(1736793600000) // "2025-01-14"
 */
export function formatDateToYYYYMMDD(timestamp: number): string {
    const parts = new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    })
        .formatToParts(new Date(timestamp))
        .reduce<Record<string, string>>((acc, p) => {
            if (p.type !== 'literal') acc[p.type] = p.value
            return acc
        }, {})

    return `${parts.year}-${parts.month}-${parts.day}`
}

/**
 * 格式化月份或年份用于显示
 * 当年为 1 月时显示年份，其他月份显示月份号
 * @param timestamp - 时间戳（毫秒）
 * @returns 包含文本和是否为年份的标志
 *
 * @example
 * formatMonthOrYear(1704067200000) // { text: "2024", isYear: true }  (2024年1月)
 * formatMonthOrYear(1706745600000) // { text: "02", isYear: false } (2024年2月)
 */
export function formatMonthOrYear(timestamp: number): { text: string; isYear: boolean } {
    const d = new Date(timestamp)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    // 当年 1 月：直接标注年份；其它月份：标注月份（不带日期）
    if (month === 1) return { text: String(year), isYear: true }
    return { text: String(month).padStart(2, '0'), isYear: false }
}

/**
 * 生成月份键值用于比较（YYYY-M 格式）
 * 注意：月份未补零，用于快速比较月份是否相同
 * @param timestamp - 时间戳（毫秒）
 * @returns 月份键值，例如 "2025-1"
 *
 * @example
 * monthKey(1736793600000) // "2025-1"
 */
export function monthKey(timestamp: number): string {
    const d = new Date(timestamp)
    return `${d.getFullYear()}-${d.getMonth()}`
}

// ========== 便捷别名 ==========

/**
 * formatDateToYYYYMMDD 的别名，保持与历史代码的兼容性
 * timestamp 是"上海时区当天 00:00:00"映射到 UTC 的值；显示时强制按上海时区格式化
 * @param ts - 时间戳（毫秒）
 * @returns 格式化后的日期字符串，例如 "2025-01-14"
 */
export const formatShanghaiDate = formatDateToYYYYMMDD

/**
 * formatDateToYYYYMMDD 的别名，用于十字线日期标签显示
 * 按上海时区格式化，避免不同时区出现日期偏移
 * @param ts - 时间戳（毫秒）
 * @returns 格式化后的日期字符串，例如 "2025-01-14"
 */
export const formatYMDShanghai = formatDateToYYYYMMDD
