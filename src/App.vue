<template>
  <kMap></kMap>
</template>

<script setup lang='ts' name=''>
import { ref, reactive, onMounted } from 'vue'
import kMap from './components/KLineChart.vue';
import { tagLog } from './utils/logger';
import { getKlineDataDongCai } from './api/data/kLine';

onMounted(async () => {
  tagLog("info", "测试行情数据", await getKlineDataDongCai({
    symbol: "601360",
    period: "daily",
    start_date: "20251201",
    end_date: "20251229",
    adjust: "qfq",
  }))
})

</script>
<style scoped></style>