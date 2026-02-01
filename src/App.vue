<template>
  <KLineChart
    :data="kdata"
    :kWidth="7"
    :kGap="3"
    :yPaddingPx="24"
    :minKWidth="2"
    :maxKWidth="50"
    :showMA="{ ma5: true, ma10: true, ma20: true, ma30: true, ma60: true }"
    :autoScrollToRight="true"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import KLineChart from '@/components/KLineChart.vue'
import { fetchKLineData, type KLineDataSourceConfig } from '@/api/data'
import type { KLineData } from '@/types/price'
import { getCurrentDateYYYYMMDD } from './utils/dateFormat'
import { cache } from './utils/cache'

const kdata = ref<KLineData[]>([])

// 数据源配置（使用 'baostock' 或 'dongcai'）
const DATA_SOURCE: 'baostock' | 'dongcai' = 'baostock'

onMounted(async () => {
  const nowdate = getCurrentDateYYYYMMDD()

  const config: KLineDataSourceConfig = {
    symbol: '601360',        // 统一格式：纯代码
    startDate: '2024-01-01', // 统一格式：YYYY-MM-DD
    endDate: nowdate,
    period: 'daily',
    adjust: 'qfq',
  }

  // 生成缓存键
  const cacheKey = `kline:${DATA_SOURCE}:${config.symbol}:${config.startDate}:${config.endDate}:${config.period}:${config.adjust}`

  // 先尝试从缓存获取
  const cached = cache.get<KLineData[]>(cacheKey)
  if (cached) {
    kdata.value = cached
    return
  }

  // 缓存未命中，从 API 获取
  const data = await fetchKLineData(DATA_SOURCE, config)
  kdata.value = data

  // 存入缓存（有效期 1 小时）
  cache.set(cacheKey, data)
})
</script>

<style></style>
