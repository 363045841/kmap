import axios from 'axios'
import { type KLineDailyDongCaiResponse } from '@/types/price'

interface KLineDailyDongCaiRequest {
  symbol: string
  period: 'daily' | 'weekly' | 'monthly'
  start_date: string
  end_date: string
  adjust?: 'qfq' | 'hfq'
  timeout?: number
}

interface KLineDailyDongCaiResponseChinese {
  日期: string
  股票代码: string
  开盘: number
  收盘: number
  最高: number
  最低: number
  成交量: number
  成交额: number
  振幅: number
  涨跌幅: number
  涨跌额: number
  换手率: number
}


const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080'
const API_PATH = import.meta.env.VITE_API_PATH || '/api/public/stock_zh_a_hist'
const url = `${BASE_URL}${API_PATH}`

function normalizeDateToYMD(dateStr: string): string {
  // 统一成 'YYYY-MM-DD'
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
    return dateStr.slice(0, 10)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  // 兜底：交给 Date 解析，但不保证所有格式都可靠
  const d = new Date(dateStr)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return dateStr
}

/**
 * 将 'YYYY-MM-DD' 转为“上海时区(UTC+8) 当天 00:00:00”的毫秒时间戳
 * 这样无论代码运行在什么时区，都不会把交易日偏移到前/后一天。
 */
function ymdToShanghaiTimestamp(ymd: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!m) throw new Error(`无法解析日期: ${ymd}`)
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])

  // 上海 00:00 相当于 UTC 前一天 16:00
  return Date.UTC(year, month - 1, day, 0 - 8, 0, 0, 0)
}

function mapChineseToEnglish(data: KLineDailyDongCaiResponseChinese): KLineDailyDongCaiResponse {
  const ymd = normalizeDateToYMD(data.日期)
  return {
    timestamp: ymdToShanghaiTimestamp(ymd),
    stockCode: data.股票代码,
    open: data.开盘,
    close: data.收盘,
    high: data.最高,
    low: data.最低,
    volume: data.成交量,
    turnover: data.成交额,
    amplitude: data.振幅,
    changePercent: data.涨跌幅,
    changeAmount: data.涨跌额,
    turnoverRate: data.换手率,
  }
}

export async function getKlineDataDongCai(
  param: KLineDailyDongCaiRequest,
): Promise<KLineDailyDongCaiResponse[]> {
  try {
    const { timeout, ...requestParams } = param
    const response = await axios.get<KLineDailyDongCaiResponseChinese[]>(url, {
      params: requestParams,
      timeout: timeout ? timeout * 1000 : undefined,
    })
    return response.data.map(mapChineseToEnglish)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`获取K线数据失败: ${error.message}`)
    }
    throw error
  }
}

export type { KLineDailyDongCaiResponse }
