<template>
  <KLineChart
    :data="kdata"
    :kWidth="6"
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
import { getKlineDataDongCai } from '@/api/data/kLine'
import { toKLineData, type KLineData } from '@/types/price'
import { getCurrentDateYYYYMMDD } from './utils/dateFormat'

const kdata = ref<KLineData[]>([])

onMounted(async () => {
  const nowdate = getCurrentDateYYYYMMDD()

  const raw = await getKlineDataDongCai({
    symbol: '601360',
    period: 'daily',
    start_date: '20210101',
    end_date: nowdate,
    adjust: 'qfq',
  })
  kdata.value = toKLineData(raw)
})
</script>

<style></style>
