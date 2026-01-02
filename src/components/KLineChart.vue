<template>
  <div class="chart-container" ref="containerRef" @scroll.passive="scheduleRender">
    <canvas ref="canvasRef" class="chart-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { KLineData } from '@/types/price'
import { kLineDraw } from '@/utils/draw/kLine'
import { drawMA5Line, drawMA10Line, drawMA20Line } from '@/utils/draw/MA'
import { tagLog } from '@/utils/logger'

type MAFlags = {
  ma5?: boolean
  ma10?: boolean
  ma20?: boolean
}

const props = withDefaults(defineProps<{
  data: KLineData[]           // 已经是绘图需要的最小结构（建议父组件先 toKLineData + 排序）
  kWidth?: number
  kGap?: number
  yPaddingPx?: number
  showMA?: MAFlags
  autoScrollToRight?: boolean // 数据更新后是否自动滚到最右看最新
}>(), {
  kWidth: 10,
  kGap: 2,
  yPaddingPx: 60,
  showMA: () => ({ ma5: true, ma10: true, ma20: true }),
  autoScrollToRight: true,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

let rafId: number | null = null

function option() {
  return { kWidth: props.kWidth, kGap: props.kGap, yPaddingPx: props.yPaddingPx }
}

/**
 * 核心渲染：支持横向滚动
 */
function render() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return
  if (!props.data || props.data.length === 0) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 建议：props.data 在父组件已排序；这里为了保险也可以排序一遍（但会增加每帧开销）
  const kdata = props.data

  const rect = container.getBoundingClientRect()
  const viewWidth = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))
  const dpr = window.devicePixelRatio || 1

  const opt = option()
  const n = kdata.length
  const contentWidth = Math.max(viewWidth, (opt.kGap + n * (opt.kWidth + opt.kGap)) / dpr)


  // 让容器能横向滚动：canvas 撑开内容宽度
  canvas.style.width = `${contentWidth}px`
  canvas.style.height = `${height}px`

  canvas.width = Math.round(contentWidth * dpr)
  canvas.height = Math.round(height * dpr)

  const scrollLeft = container.scrollLeft

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, contentWidth, height)

  // 平移坐标系：视口跟随 scrollLeft
  ctx.translate(-scrollLeft, 0)

  // 画 K 线
  kLineDraw(ctx, kdata, opt, height, dpr)

  // 画 MA（可配置开关）
  if (props.showMA.ma5) drawMA5Line(ctx, kdata, opt, height, dpr)
  if (props.showMA.ma10) drawMA10Line(ctx, kdata, opt, height, dpr)
  if (props.showMA.ma20) drawMA20Line(ctx, kdata, opt, height, dpr)
}

/**
 * rAF 节流：scroll/resize/data变化都用它触发
 */
function scheduleRender() {
  if (rafId !== null) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    rafId = null
    render()
  })
}

function scrollToRight() {
  const container = containerRef.value
  if (!container) return
  container.scrollLeft = container.scrollWidth
  scheduleRender()
}

// 暴露给父组件（可选）
defineExpose({ scheduleRender, scrollToRight })

onMounted(() => {
  window.addEventListener('resize', scheduleRender, { passive: true })
  scheduleRender()
})

onUnmounted(() => {
  window.removeEventListener('resize', scheduleRender)
  if (rafId !== null) cancelAnimationFrame(rafId)
})

// 数据或参数变化：重绘
watch(
  () => [props.data, props.kWidth, props.kGap, props.yPaddingPx, props.showMA],
  async () => {
    // 如果要自动滚到最右，等 DOM 更新再滚
    if (props.autoScrollToRight) {
      await nextTick()
      scrollToRight()
    } else {
      scheduleRender()
    }
  },
  { deep: true },
)
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 400px;
  background: white;

  overflow-x: auto;
  overflow-y: hidden;

  -webkit-overflow-scrolling: touch;
}

.chart-canvas {
  display: block;
}
</style>