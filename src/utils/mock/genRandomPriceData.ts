import { type KLineData } from '@/types/price'

export function genRandomPriceData(count: number): KLineData[] {
  let data: KLineData[] = []
  for (let i = 0; i < count; i++) {
    const open = parseFloat((Math.random() * 9 + 1).toFixed(2))
    const close = parseFloat((Math.random() * 9 + 1).toFixed(2))
    const randomMaxPriceFlag = Math.random() > 0.5
    const randomMinPriceFlag = Math.random() > 0.5
    let maxPrice = open
    let minPrice = close
    if (randomMaxPriceFlag) {
      maxPrice = open + Math.random() * 10
    }
    if (randomMinPriceFlag) {
      minPrice = close - Math.random() * 10
    }
    data.push({
      timestamp: i,
      open: open,
      high: maxPrice,
      low: minPrice,
      close: close,
    })
  }
  console.log(data)
  return data
}

export function reversalExampleData(): KLineData[] {
  return [
    { timestamp: 0, open: 100, high: 101, low: 97, close: 98 },
    { timestamp: 1, open: 98, high: 99, low: 94, close: 95 },
    { timestamp: 2, open: 95, high: 96, low: 92, close: 94 }, // 低点
    { timestamp: 3, open: 94, high: 97, low: 93, close: 96 }, // 开始反弹
    { timestamp: 4, open: 96, high: 100, low: 95, close: 99 }, // 继续反弹
  ]
}
