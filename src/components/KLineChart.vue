<template>
  <div class="chart-container" ref="containerRef" @scroll.passive="scheduleRender">
    <canvas ref="canvasRef" class="chart-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { kLineDraw } from '@/utils/draw/kLine'
import { getKlineDataDongCai, type KLineDailyDongCaiResponse } from '@/api/data/kLine'
import { toKLineData } from '@/types/price'
import { drawMA10Line, drawMA20Line, drawMA5Line } from '@/utils/draw/MA'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

let rafId: number | null = null // 节流

const testDataRef = ref<KLineDailyDongCaiResponse[]>([])

function getOption() {
  return { kWidth: 10, kGap: 2, yPaddingPx: 60 } as const
}

/**
 * 核心渲染函数：支持横向滚动
 */
function render() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return
  if (testDataRef.value.length === 0) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const option = getOption()
  const kdata = toKLineData(testDataRef.value) // 建议：toKLineData 内部要排序

  // 视口尺寸（容器可见区域）
  const rect = container.getBoundingClientRect()
  const viewWidth = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))
  const dpr = window.devicePixelRatio || 1

  // 内容总宽：按K线数量决定（至少不小于视口宽）
  const n = kdata.length
  const contentWidth = Math.max(
    viewWidth,
    option.kGap + n * (option.kWidth + option.kGap),
  )

  // 让容器出现横向滚动条：canvas 的 CSS 宽度设为内容宽
  canvas.style.width = `${contentWidth}px`
  canvas.style.height = `${height}px`

  // 画布物理像素也按内容宽（注意：数据超大时会很耗内存）
  canvas.width = Math.round(contentWidth * dpr)
  canvas.height = Math.round(height * dpr)

  // 当前滚动偏移（CSS px）
  const scrollLeft = container.scrollLeft

  // 清屏 + DPR
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)

  // 清整张“长画布”（逻辑像素）
  ctx.clearRect(0, 0, contentWidth, height)

  // 核心：把坐标系整体左移 scrollLeft，使得“当前视口”对应正确内容区间
  ctx.translate(-scrollLeft, 0)

  // 先画K线
  kLineDraw(ctx, kdata, option, height, dpr)

  // 再画均线
  drawMA5Line(ctx, kdata, option, height, dpr)
  drawMA10Line(ctx, kdata, option, height, dpr)
  drawMA20Line(ctx, kdata, option, height, dpr)
}

/**
 * rAF 节流：合并高频 resize/scroll
 */
function scheduleRender() {
  if (rafId !== null) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    rafId = null
    render()
  })
}

onMounted(async () => {
  // 先绑定 resize（滚动在模板里用 @scroll 绑定了）
  window.addEventListener('resize', scheduleRender, { passive: true })

  // 拉取数据
  const testData = await getKlineDataDongCai({
    symbol: '601360',
    period: 'daily',
    start_date: '20250501',
    end_date: '20251230',
    adjust: 'qfq',
  })
  testDataRef.value = testData

  // 等 DOM 更新后可选：默认滚到最右侧（看最新K线）
  await nextTick()
  const container = containerRef.value
  if (container) {
    container.scrollLeft = container.scrollWidth
  }

  // 画一次
  render()
})

onUnmounted(() => {
  window.removeEventListener('resize', scheduleRender)
  if (rafId !== null) cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 400px;
  background: white;

  /* 关键：支持横向滚动 */
  overflow-x: auto;
  overflow-y: hidden;

  /* 可选：更顺滑的滚动体验（部分浏览器） */
  -webkit-overflow-scrolling: touch;
}

.chart-canvas {
  display: block;
}
</style>