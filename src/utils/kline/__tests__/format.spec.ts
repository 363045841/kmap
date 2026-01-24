import { describe, it, expect } from 'vitest'
import {
  getUpDownColor,
  formatWanYi,
  formatSignedNumber,
  formatPercent,
  formatSignedPercent,
  calcOpenColor,
  calcCloseColor,
  calcChangeColor,
} from '../format'

describe('getUpDownColor', () => {
  it('应该返回上涨颜色（红涨）', () => {
    expect(getUpDownColor(1)).toBe('rgba(214, 10, 34, 1)') // UP_COLOR
    expect(getUpDownColor(0.1)).toBe('rgba(214, 10, 34, 1)')
    expect(getUpDownColor(100)).toBe('rgba(214, 10, 34, 1)')
  })

  it('应该返回下跌颜色（绿跌）', () => {
    expect(getUpDownColor(-1)).toBe('rgba(3, 123, 102, 1)') // DOWN_COLOR
    expect(getUpDownColor(-0.1)).toBe('rgba(3, 123, 102, 1)')
    expect(getUpDownColor(-100)).toBe('rgba(3, 123, 102, 1)')
  })

  it('应该返回中性颜色', () => {
    expect(getUpDownColor(0)).toBe('rgba(0, 0, 0, 0.78)') // NEUTRAL_COLOR
  })
})

describe('formatWanYi', () => {
  it('应该正确格式化亿级数字', () => {
    expect(formatWanYi(123456789)).toBe('1.23亿')
    expect(formatWanYi(100000000)).toBe('1.00亿')
    expect(formatWanYi(99999999)).toBe('10000.00万') // 99999999/10000 = 9999.9999，toFixed(2) = 10000.00
    expect(formatWanYi(-234567890)).toBe('-2.35亿')
    expect(formatWanYi(-100000000)).toBe('-1.00亿')
  })

  it('应该正确格式化万级数字', () => {
    expect(formatWanYi(12345)).toBe('1.23万')
    expect(formatWanYi(10000)).toBe('1.00万')
    expect(formatWanYi(9999)).toBe('9999')
    expect(formatWanYi(-54321)).toBe('-5.43万')
    expect(formatWanYi(-10000)).toBe('-1.00万')
  })

  it('应该正确处理小数字', () => {
    expect(formatWanYi(9999)).toBe('9999')
    expect(formatWanYi(0)).toBe('0')
    expect(formatWanYi(1)).toBe('1')
    expect(formatWanYi(-1)).toBe('-1')
  })

  it('应该支持自定义小数位数', () => {
    expect(formatWanYi(123456789, 0)).toBe('1亿')
    expect(formatWanYi(123456789, 1)).toBe('1.2亿')
    expect(formatWanYi(123456789, 3)).toBe('1.235亿')
    expect(formatWanYi(12345, 4)).toBe('1.2345万')
  })

  it('应该正确处理边界值', () => {
    expect(formatWanYi(9999.99)).toBe('10000')
    expect(formatWanYi(9999999.99)).toBe('1000.00万') // 不足1亿
    expect(formatWanYi(99999999.99)).toBe('10000.00万') // 99999999.99/10000 = 9999.999999，toFixed(2) = 10000.00
  })
})

describe('formatSignedNumber', () => {
  it('应该为正数添加加号', () => {
    expect(formatSignedNumber(1.23)).toBe('+1.23')
    expect(formatSignedNumber(0.1)).toBe('+0.10')
    expect(formatSignedNumber(100)).toBe('+100.00')
  })

  it('应该为负数保留负号', () => {
    expect(formatSignedNumber(-1.23)).toBe('-1.23')
    expect(formatSignedNumber(-0.1)).toBe('-0.10')
    expect(formatSignedNumber(-100)).toBe('-100.00')
  })

  it('应该正确处理零', () => {
    expect(formatSignedNumber(0)).toBe('0.00')
  })

  it('应该支持自定义小数位数', () => {
    expect(formatSignedNumber(1.2345, 4)).toBe('+1.2345')
    expect(formatSignedNumber(-1.2345, 4)).toBe('-1.2345')
    expect(formatSignedNumber(1.2345, 0)).toBe('+1')
  })
})

describe('formatPercent', () => {
  it('应该正确格式化百分比', () => {
    expect(formatPercent(1.23)).toBe('1.23%')
    expect(formatPercent(0)).toBe('0.00%')
    expect(formatPercent(-1.23)).toBe('-1.23%')
    expect(formatPercent(100)).toBe('100.00%')
  })

  it('应该支持自定义小数位数', () => {
    expect(formatPercent(1.2345, 4)).toBe('1.2345%')
    expect(formatPercent(1.23, 0)).toBe('1%')
  })
})

describe('formatSignedPercent', () => {
  it('应该为正数添加加号', () => {
    expect(formatSignedPercent(1.23)).toBe('+1.23%')
    expect(formatSignedPercent(0.1)).toBe('+0.10%')
    expect(formatSignedPercent(100)).toBe('+100.00%')
  })

  it('应该为负数保留负号', () => {
    expect(formatSignedPercent(-1.23)).toBe('-1.23%')
    expect(formatSignedPercent(-0.1)).toBe('-0.10%')
    expect(formatSignedPercent(-100)).toBe('-100.00%')
  })

  it('应该正确处理零', () => {
    expect(formatSignedPercent(0)).toBe('0.00%')
  })

  it('应该支持自定义小数位数', () => {
    expect(formatSignedPercent(1.2345, 4)).toBe('+1.2345%')
    expect(formatSignedPercent(1.23, 0)).toBe('+1%')
  })
})

describe('calcOpenColor', () => {
  it('应该根据前一日收盘价计算开盘价颜色（红涨）', () => {
    const prevKLine = { close: 100, open: 95, high: 105, low: 90, timestamp: 1 }
    const kLine = { open: 102, close: 105, high: 108, low: 100, timestamp: 2 }
    
    expect(calcOpenColor(kLine, prevKLine)).toBe('rgba(214, 10, 34, 1)') // 102 > 100
  })

  it('当前一日收盘价不存在时使用当前开盘价', () => {
    const kLine = { open: 100, close: 105, high: 108, low: 98, timestamp: 1 }
    
    expect(calcOpenColor(kLine)).toBe('rgba(0, 0, 0, 0.78)') // 100 - 100 = 0
  })

  it('应该正确判断下跌（绿跌）', () => {
    const prevKLine = { close: 100, open: 95, high: 105, low: 90, timestamp: 1 }
    const kLine = { open: 98, close: 95, high: 99, low: 93, timestamp: 2 }
    
    expect(calcOpenColor(kLine, prevKLine)).toBe('rgba(3, 123, 102, 1)') // 98 < 100
  })

  it('应该正确判断平盘', () => {
    const prevKLine = { close: 100, open: 95, high: 105, low: 90, timestamp: 1 }
    const kLine = { open: 100, close: 102, high: 104, low: 99, timestamp: 2 }
    
    expect(calcOpenColor(kLine, prevKLine)).toBe('rgba(0, 0, 0, 0.78)') // 100 = 100
  })
})

describe('calcCloseColor', () => {
  it('应该根据开盘价计算收盘价颜色（红涨）', () => {
    const kLine = { open: 100, close: 105, high: 108, low: 98, timestamp: 1 }
    
    expect(calcCloseColor(kLine)).toBe('rgba(214, 10, 34, 1)') // 105 > 100
  })

  it('应该正确判断下跌（绿跌）', () => {
    const kLine = { open: 100, close: 95, high: 102, low: 93, timestamp: 1 }
    
    expect(calcCloseColor(kLine)).toBe('rgba(3, 123, 102, 1)') // 95 < 100
  })

  it('应该正确判断平盘', () => {
    const kLine = { open: 100, close: 100, high: 102, low: 98, timestamp: 1 }
    
    expect(calcCloseColor(kLine)).toBe('rgba(0, 0, 0, 0.78)') // 100 = 100
  })
})

describe('calcChangeColor', () => {
  it('应该根据涨跌幅计算颜色（红涨）', () => {
    const kLine = { 
      open: 100, 
      close: 105, 
      high: 108, 
      low: 98, 
      timestamp: 1, 
      changePercent: 5 
    }
    
    expect(calcChangeColor(kLine)).toBe('rgba(214, 10, 34, 1)') // 5 > 0
  })

  it('应该根据涨跌额计算颜色（当涨跌幅不存在时，绿跌）', () => {
    const kLine = { 
      open: 100, 
      close: 95, 
      high: 102, 
      low: 93, 
      timestamp: 1, 
      changeAmount: -5 
    }
    
    expect(calcChangeColor(kLine)).toBe('rgba(3, 123, 102, 1)') // -5 < 0
  })

  it('应该优先使用涨跌幅', () => {
    const kLine = { 
      open: 100, 
      close: 105, 
      high: 108, 
      low: 98, 
      timestamp: 1, 
      changePercent: 5,
      changeAmount: -5
    }
    
    expect(calcChangeColor(kLine)).toBe('rgba(214, 10, 34, 1)') // 优先使用 changePercent
  })

  it('当都没有时返回中性色', () => {
    const kLine = { 
      open: 100, 
      close: 105, 
      high: 108, 
      low: 98, 
      timestamp: 1 
    }
    
    expect(calcChangeColor(kLine)).toBe('rgba(0, 0, 0, 0.78)')
  })

  it('应该正确处理零值', () => {
    const kLine1 = { 
      open: 100, 
      close: 100, 
      high: 102, 
      low: 98, 
      timestamp: 1, 
      changePercent: 0 
    }
    expect(calcChangeColor(kLine1)).toBe('rgba(0, 0, 0, 0.78)')
    
    const kLine2 = { 
      open: 100, 
      close: 100, 
      high: 102, 
      low: 98, 
      timestamp: 1, 
      changeAmount: 0 
    }
    expect(calcChangeColor(kLine2)).toBe('rgba(0, 0, 0, 0.78)')
  })
})