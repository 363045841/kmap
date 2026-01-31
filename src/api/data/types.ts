import type { KLineData } from '@/types/price'

/**
 * 统一的数据源配置
 */
export interface KLineDataSourceConfig {
  /** 股票代码（统一格式，如 600000、000001，不带市场前缀） */
  symbol: string
  /** 开始日期（YYYY-MM-DD） */
  startDate: string
  /** 结束日期（YYYY-MM-DD） */
  endDate: string
  /** 数据周期 */
  period: 'daily' | 'weekly' | 'monthly' | '5min' | '15min' | '30min' | '60min'
  /** 复权方式 */
  adjust: 'qfq' | 'hfq' | 'none'
  /** 超时时间（秒） */
  timeout?: number
}

/**
 * K线数据源统一接口
 * 所有数据源实现此接口，调用方无感知切换
 */
export interface IKLineDataSource {
  readonly name: string
  fetchKLineData(config: KLineDataSourceConfig): Promise<KLineData[]>
}

/**
 * 数据源工厂
 */
export type DataSourceType = 'baostock' | 'dongcai'

export interface IDataSourceFactory {
  create(type: DataSourceType): IKLineDataSource
}
