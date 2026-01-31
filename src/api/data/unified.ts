import type { KLineData } from '@/types/price'
import type { KLineDataSourceConfig, IKLineDataSource, DataSourceType } from './types'
import { getKlineDataBaoStock } from './baostock'
import { getKlineDataDongCai } from './kLine'
import { toKLineData } from '@/types/price'

/**
 * BaoStock 数据源统一实现
 */
class BaoStockDataSource implements IKLineDataSource {
  readonly name = 'baostock'

  async fetchKLineData(config: KLineDataSourceConfig): Promise<KLineData[]> {
    // 转换股票代码格式：600000 -> sh.600000 / sz.000001
    const symbolWithPrefix = this.addMarketPrefix(config.symbol)

    // 转换周期格式：5min -> 5
    const periodMap: Record<string, 'daily' | 'weekly' | 'monthly' | '5' | '15' | '30' | '60'> = {
      daily: 'daily',
      weekly: 'weekly',
      monthly: 'monthly',
      '5min': '5',
      '15min': '15',
      '30min': '30',
      '60min': '60',
    }

    return getKlineDataBaoStock({
      symbol: symbolWithPrefix,
      start_date: config.startDate,
      end_date: config.endDate,
      period: periodMap[config.period] || 'daily',
      adjust: config.adjust,
      timeout: config.timeout,
    })
  }

  private addMarketPrefix(symbol: string): string {
    // 沪市：600/601/603/688 开头
    if (/^(6|68)\d{5}$/.test(symbol)) {
      return `sh.${symbol}`
    }
    // 深市：000/001/002/003/300 开头
    if (/^(0|3)\d{5}$/.test(symbol)) {
      return `sz.${symbol}`
    }
    return symbol
  }
}

/**
 * 东财/AKTools 数据源统一实现
 */
class DongCaiDataSource implements IKLineDataSource {
  readonly name = 'dongcai'

  async fetchKLineData(config: KLineDataSourceConfig): Promise<KLineData[]> {
    // 转换日期格式：YYYY-MM-DD -> YYYYMMDD
    const startDate = config.startDate.replace(/-/g, '')
    const endDate = config.endDate.replace(/-/g, '')

    // 转换周期格式：5min -> 不支持（东财只支持日/周/月）
    const periodMap: Record<string, 'daily' | 'weekly' | 'monthly'> = {
      daily: 'daily',
      weekly: 'weekly',
      monthly: 'monthly',
    }

    const period = periodMap[config.period]
    if (!period) {
      throw new Error(`东财数据源不支持周期: ${config.period}`)
    }

    const raw = await getKlineDataDongCai({
      symbol: config.symbol,
      start_date: startDate,
      end_date: endDate,
      period,
      adjust: config.adjust === 'none' ? undefined : config.adjust,
      timeout: config.timeout,
    })

    return toKLineData(raw)
  }
}

/**
 * 数据源工厂
 */
class DataSourceFactory {
  private static instances: Map<DataSourceType, IKLineDataSource> = new Map()

  static create(type: DataSourceType): IKLineDataSource {
    if (!this.instances.has(type)) {
      switch (type) {
        case 'baostock':
          this.instances.set(type, new BaoStockDataSource())
          break
        case 'dongcai':
          this.instances.set(type, new DongCaiDataSource())
          break
        default:
          throw new Error(`未知的数据源类型: ${type}`)
      }
    }
    return this.instances.get(type)!
  }
}

/**
 * 获取 K 线数据（统一入口）
 * @param type 数据源类型
 * @param config 统一配置
 * @returns Promise<KLineData[]>
 *
 * 使用示例：
 * ```ts
 * // 使用 BaoStock
 * const data = await fetchKLineData('baostock', {
 *   symbol: '600000',
 *   startDate: '2024-01-01',
 *   endDate: '2024-12-31',
 *   period: 'daily',
 *   adjust: 'qfq',
 * })
 *
 * // 切换东财只需改第一个参数
 * const data = await fetchKLineData('dongcai', { ... })
 * ```
 */
export async function fetchKLineData(
  type: DataSourceType,
  config: KLineDataSourceConfig,
): Promise<KLineData[]> {
  const dataSource = DataSourceFactory.create(type)
  return dataSource.fetchKLineData(config)
}

export { DataSourceFactory }
export type { KLineDataSourceConfig, DataSourceType, IKLineDataSource }
