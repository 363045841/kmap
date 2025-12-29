import axios from 'axios'

interface KLineDailyDongCaiRequest {
  symbol: string // 股票代码，例如 '603777'
  period: 'daily' | 'weekly' | 'monthly' // K 线周期类型，默认 'daily'
  start_date: string // 查询起始日期，格式 'YYYYMMDD'，例如 '20210301'
  end_date: string // 查询结束日期，格式 'YYYYMMDD'，例如 '20210616'
  adjust?: 'qfq' | 'hfq' // 复权类型：qfq=前复权，hfq=后复权；未传则返回不复权数据
  timeout?: number // 请求超时时间（秒）；未传则不设置超时
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

export interface KLineDailyDongCaiResponse {
  date: string // 交易日期，格式 'YYYY-MM-DD'
  stockCode: string // 股票代码
  open: number // 开盘价
  close: number // 收盘价
  high: number // 最高价
  low: number // 最低价
  volume: number // 成交量
  turnover: number // 成交额
  amplitude: number // 振幅（%）
  changePercent: number // 涨跌幅（%）
  changeAmount: number // 涨跌额
  turnoverRate: number // 换手率（%）
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080'
const API_PATH = import.meta.env.VITE_API_PATH || '/api/public/stock_zh_a_hist'
const url = `${BASE_URL}${API_PATH}`

function formatDate(dateStr: string): string {
  // 兼容多种格式，统一输出 'YYYY-MM-DD'
  if (/^\d{8}$/.test(dateStr)) {
    // YYYYMMDD
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
    // YYYY-MM-DDTHH:mm:ss.sss
    return dateStr.slice(0, 10)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    // YYYY-MM-DD
    return dateStr
  }
  return dateStr
}

function mapChineseToEnglish(data: KLineDailyDongCaiResponseChinese): KLineDailyDongCaiResponse {
  return {
    date: formatDate(data.日期),
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
