/**
 * K线数据源统一入口
 *
 * 推荐使用方式：
 * ```ts
 * import { fetchKLineData, type KLineDataSourceConfig } from '@/api/data'
 *
 * const config: KLineDataSourceConfig = {
 *   symbol: '600000',
 *   startDate: '2024-01-01',
 *   endDate: '2024-12-31',
 *   period: 'daily',
 *   adjust: 'qfq',
 * }
 *
 * // 使用 BaoStock（推荐）
 * const data = await fetchKLineData('baostock', config)
 *
 * // 或使用东财
 * const data = await fetchKLineData('dongcai', config)
 * ```
 */

export { fetchKLineData, DataSourceFactory } from './unified'
export type {
  KLineDataSourceConfig,
  DataSourceType,
  IKLineDataSource,
} from './unified'

// 保留原有的独立导出，便于特殊场景直接使用
export { getKlineDataBaoStock, queryKlineDataBaoStock } from './baostock'
export { getKlineDataDongCai } from './kLine'
