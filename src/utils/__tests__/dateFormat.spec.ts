import { describe, it, expect } from 'vitest'
import {
  formatDateToYYYYMMDDNoDash,
  getCurrentDateYYYYMMDD,
  formatDateToYYYYMMDD,
  formatMonthOrYear,
  monthKey,
  formatShanghaiDate,
  formatYMDShanghai,
  findMonthBoundaries,
} from '../dateFormat'

describe('formatDateToYYYYMMDDNoDash', () => {
  it('应该正确格式化日期为 YYYYMMDD 格式', () => {
    // 2025-01-14 00:00:00 UTC = 1736793600000 ms
    const timestamp = 1736793600000
    expect(formatDateToYYYYMMDDNoDash(timestamp)).toBe('20250114')
  })

  it('应该正确处理不同月份', () => {
    // 2025-01-01 UTC
    expect(formatDateToYYYYMMDDNoDash(1735660800000)).toBe('20250101')
    // 2025-02-01 UTC
    expect(formatDateToYYYYMMDDNoDash(1738387200000)).toBe('20250201')
    // 2024-12-31 UTC
    expect(formatDateToYYYYMMDDNoDash(1735584000000)).toBe('20241231')
  })

  it('应该正确处理闰年', () => {
    // 2024-02-29 UTC (闰年)
    expect(formatDateToYYYYMMDDNoDash(1709164800000)).toBe('20240229')
  })

  it('月份和日期应该补零', () => {
    // 2025-01-01 UTC
    expect(formatDateToYYYYMMDDNoDash(1735660800000)).toBe('20250101')
    // 2025-01-09 UTC
    expect(formatDateToYYYYMMDDNoDash(1736385600000)).toBe('20250109')
  })
})

describe('getCurrentDateYYYYMMDD', () => {
  it('应该返回8位数字格式的当前日期', () => {
    const result = getCurrentDateYYYYMMDD()
    expect(result).toMatch(/^\d{8}$/)
    expect(result.length).toBe(8)
  })
})

describe('formatDateToYYYYMMDD', () => {
  it('应该正确格式化日期为 YYYY-MM-DD 格式（上海时区）', () => {
    // 2025-01-14 00:00:00 UTC
    const timestamp = 1736793600000
    const result = formatDateToYYYYMMDD(timestamp)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('应该使用短横线分隔', () => {
    const timestamp = 1736793600000
    const result = formatDateToYYYYMMDD(timestamp)
    expect(result.split('-')).toHaveLength(3)
  })

  it('应该为月份和日期补零', () => {
    const timestamp = 1735660800000 // 2025-01-01
    const result = formatDateToYYYYMMDD(timestamp)
    const parts = result.split('-')
    expect(parts[1]).toHaveLength(2)
    expect(parts[2]).toHaveLength(2)
  })
})

describe('formatMonthOrYear', () => {
  it('1月应该返回年份', () => {
    // 2024-01-01 UTC
    const timestamp = 1704067200000
    const result = formatMonthOrYear(timestamp)
    expect(result.text).toBe('2024')
    expect(result.isYear).toBe(true)
  })

  it('非1月应该返回月份', () => {
    // 2024-02-01 UTC
    const timestamp = 1706745600000
    const result = formatMonthOrYear(timestamp)
    expect(result.text).toBe('2月')
    expect(result.isYear).toBe(false)
  })

  it('应该正确返回不同月份', () => {
    // 2024-03-01 UTC
    expect(formatMonthOrYear(1709251200000).text).toBe('3月')
    // 2024-06-01 UTC
    expect(formatMonthOrYear(1717200000000).text).toBe('6月')
    // 2024-12-01 UTC
    expect(formatMonthOrYear(1733011200000).text).toBe('12月')
  })

  it('跨年1月应该返回新年份', () => {
    // 2025-01-01 UTC
    const timestamp = 1735660800000
    const result = formatMonthOrYear(timestamp)
    expect(result.text).toBe('2025')
    expect(result.isYear).toBe(true)
  })
})

describe('monthKey', () => {
  it('应该生成正确的月份键值', () => {
    // 2025-01-14 UTC
    expect(monthKey(1736793600000)).toBe('2025-0')
  })

  it('应该区分不同月份', () => {
    const janKey = monthKey(1735660800000) // 2025-01-01
    const febKey = monthKey(1738387200000) // 2025-02-01
    const marKey = monthKey(1740643200000) // 2025-02-01 (需要更新为3月)
    
    expect(janKey).toBe('2025-0')
    expect(febKey).toBe('2025-1')
    // 1740643200000 实际上是2025-02-01，不是3月
    // 使用正确的时间戳: 1743360000000 = 2025-03-01
    const correctMarKey = monthKey(1743360000000) // 2025-03-01
    expect(correctMarKey).toBe('2025-2')
    expect(janKey).not.toBe(febKey)
    expect(febKey).not.toBe(correctMarKey)
  })

  it('应该区分不同年份的相同月份', () => {
    const jan2024 = monthKey(1704067200000) // 2024-01
    const jan2025 = monthKey(1735660800000) // 2025-01
    
    expect(jan2024).toBe('2024-0')
    expect(jan2025).toBe('2025-0')
    expect(jan2024).not.toBe(jan2025)
  })
})

describe('formatShanghaiDate (别名)', () => {
  it('应该是 formatDateToYYYYMMDD 的别名', () => {
    const timestamp = 1736793600000
    expect(formatShanghaiDate(timestamp)).toBe(formatDateToYYYYMMDD(timestamp))
  })
})

describe('formatYMDShanghai (别名)', () => {
  it('应该是 formatDateToYYYYMMDD 的别名', () => {
    const timestamp = 1736793600000
    expect(formatYMDShanghai(timestamp)).toBe(formatDateToYYYYMMDD(timestamp))
  })
})

describe('findMonthBoundaries', () => {
  it('应该返回空数组当数据为空时', () => {
    expect(findMonthBoundaries([])).toEqual([])
  })

  it('应该正确找到每月的第一个K线', () => {
    const data = [
      { timestamp: 1704067200000 }, // 2024-01-01
      { timestamp: 1704153600000 }, // 2024-01-02
      { timestamp: 1706745600000 }, // 2024-02-01
      { timestamp: 1706832000000 }, // 2024-02-02
      { timestamp: 1709251200000 }, // 2024-03-01
    ]
    const result = findMonthBoundaries(data)
    expect(result).toEqual([0, 2, 4])
  })

  it('第一个数据点应该在边界中', () => {
    const data = [
      { timestamp: 1704067200000 }, // 2024-01-01
    ]
    const result = findMonthBoundaries(data)
    expect(result).toEqual([0])
  })

  it('应该跳过 undefined 的数据点', () => {
    const data = [
      { timestamp: 1704067200000 }, // 2024-01-01
      undefined,
      { timestamp: 1706745600000 }, // 2024-02-01
      undefined,
      { timestamp: 1709251200000 }, // 2024-03-01
    ]
    const result = findMonthBoundaries(data)
    expect(result).toEqual([0, 2, 4])
  })

  it('应该正确处理跨年的月份边界', () => {
    const data = [
      { timestamp: 1735689600000 }, // 2025-01-01 (北京时间)
      { timestamp: 1735776000000 }, // 2025-01-02
      { timestamp: 1738387200000 }, // 2025-02-01
    ]
    const result = findMonthBoundaries(data)
    expect(result).toEqual([0, 2])
  })

  it('应该正确处理同一个月的多个数据点', () => {
    const data = [
      { timestamp: 1704067200000 }, // 2024-01-01
      { timestamp: 1704153600000 }, // 2024-01-02
      { timestamp: 1704240000000 }, // 2024-01-03
      { timestamp: 1704326400000 }, // 2024-01-04
      { timestamp: 1704412800000 }, // 2024-01-05
    ]
    const result = findMonthBoundaries(data)
    expect(result).toEqual([0])
  })

  it('应该正确处理只有一个月的数据', () => {
    const data = [
      { timestamp: 1704067200000 }, // 2024-01-01
      { timestamp: 1704153600000 }, // 2024-01-02
      { timestamp: 1704240000000 }, // 2024-01-03
    ]
    const result = findMonthBoundaries(data)
    expect(result).toEqual([0])
  })
})