<template>
  <HelloWorld></HelloWorld>
</template>

<script setup lang='ts' name=''>
import { ref, reactive, onMounted } from 'vue'
import HelloWorld from './components/kMap.vue';
import { tagLog } from './utils/logger';
import { getKlineDataDongCai } from './api/data/kLine';

onMounted(async () => {
  tagLog("error", "测试行情数据", await getKlineDataDongCai({
    symbol: "601360",
    period: "daily",
    start_date: "20251201",
    end_date: "20251229",
    adjust: "qfq",
  }))
})

</script>
<style scoped></style>