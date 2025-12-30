export interface KLineData {
  /* 时间戳（毫秒） */
  timestamp: number

  /* 开盘价 */
  open: number

  /* 最高价 */
  high: number

  /* 最低价 */
  low: number

  /* 收盘价 */
  close: number
}

export interface KLineDailyDongCaiResponse extends KLineData {
  stockCode: string
  volume: number
  turnover: number
  amplitude: number
  changePercent: number
  changeAmount: number
  turnoverRate: number
}


export function toKLineData(arr: KLineDailyDongCaiResponse[]): KLineData[] {
  return arr
    .map((e) => ({
      timestamp: e.timestamp,
      open: e.open,
      high: e.high,
      low: e.low,
      close: e.close,
    }))
    .sort((a, b) => a.timestamp - b.timestamp)
}