<template>
  <div class="chart-container" :class="{ 'is-dragging': isDragging }" ref="containerRef"
    @scroll.passive="scheduleRender" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp"
    @mouseleave="onMouseUp" @wheel.prevent="onWheel">
    <div class="scroll-content" :style="{ width: totalWidth + 'px' }">
      <canvas class="chart-canvas" ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { KLineData } from '@/types/price'
import { kLineDraw } from '@/utils/kLineDraw/kLine'
import { drawMA5Line, drawMA10Line, drawMA20Line } from '@/utils/kLineDraw/MA'

type MAFlags = {
  ma5?: boolean
  ma10?: boolean
  ma20?: boolean
}

const props = withDefaults(defineProps<{
  data: KLineData[]
  kWidth?: number
  kGap?: number
  yPaddingPx?: number
  showMA?: MAFlags
  autoScrollToRight?: boolean
  minKWidth?: number
  maxKWidth?: number
}>(), {
  kWidth: 10,
  kGap: 2,
  yPaddingPx: 60,
  showMA: () => ({ ma5: true, ma10: true, ma20: true }),
  autoScrollToRight: true,
  minKWidth: 2,
  maxKWidth: 50,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

// 内部动态K线宽度和间隙
const currentKWidth = ref(props.kWidth)
const currentKGap = ref(props.kGap)

// 计算初始比例
const initialRatio = props.kGap / props.kWidth

let rafId: number | null = null

/* ========== 拖拽相关 ========== */
const isDragging = ref(false)
let dragStartX = 0
let scrollStartX = 0

function onMouseDown(e: MouseEvent) {
  // 只响应左键
  if (e.button !== 0) return

  const container = containerRef.value
  if (!container) return

  isDragging.value = true
  dragStartX = e.clientX
  scrollStartX = container.scrollLeft

  // 防止选中文字
  e.preventDefault()
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return

  const container = containerRef.value
  if (!container) return

  const deltaX = dragStartX - e.clientX
  container.scrollLeft = scrollStartX + deltaX
}

function onMouseUp() {
  isDragging.value = false
}

/* ========== 滚轮缩放 ========== */
function onWheel(e: WheelEvent) {
  const container = containerRef.value
  if (!container) return

  // 计算鼠标在容器中的相对位置
  const rect = container.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  
  // 计算当前滚动位置对应的K线索引
  const scrollLeft = container.scrollLeft
  const oldUnit = currentKWidth.value + currentKGap.value
  const centerIndex = (scrollLeft + mouseX) / oldUnit

  // 根据滚轮方向调整K线宽度
  const delta = e.deltaY > 0 ? -1 : 1  // 向下滚动缩小，向上滚动放大
  const newKWidth = Math.max(
    props.minKWidth,
    Math.min(props.maxKWidth, currentKWidth.value + delta)
  )

  // 如果宽度没有变化，直接返回
  if (newKWidth === currentKWidth.value) return

  // 按比例调整间隙，保持最小间隙为0.5
  const newKGap = Math.max(0.5, newKWidth * initialRatio)

  currentKWidth.value = newKWidth
  currentKGap.value = newKGap

  // 计算新的单位宽度
  const newUnit = newKWidth + newKGap

  // 调整滚动位置，使鼠标位置对应的K线索引保持不变
  nextTick(() => {
    const newScrollLeft = centerIndex * newUnit - mouseX
    container.scrollLeft = Math.max(0, newScrollLeft)
    scheduleRender()
  })
}

/* 计算总宽度，用于撑开滚动区域 */
const totalWidth = computed(() => {
  const n = props.data?.length ?? 0
  return currentKGap.value + n * (currentKWidth.value + currentKGap.value)
})

function option() {
  return { 
    kWidth: currentKWidth.value, 
    kGap: currentKGap.value, 
    yPaddingPx: props.yPaddingPx 
  }
}

/* 计算可视范围的索引 */
function getVisibleRange(
  scrollLeft: number,
  viewWidth: number,
  kWidth: number,
  kGap: number,
  totalDataCount: number
): { start: number; end: number } {
  const unit = kWidth + kGap
  /* 向下取整找起点，减1防止边缘闪烁 */
  const start = Math.max(0, Math.floor(scrollLeft / unit) - 1)
  /* 向上取整找终点，加1防止边缘闪烁 */
  const end = Math.min(totalDataCount, Math.ceil((scrollLeft + viewWidth) / unit) + 1)
  return { start, end }
}

/* 计算可见区间的价格范围 */
function getVisiblePriceRange(
  data: KLineData[],
  startIndex: number,
  endIndex: number
): { maxPrice: number; minPrice: number } {
  let maxPrice = -Infinity
  let minPrice = Infinity

  for (let i = startIndex; i < endIndex && i < data.length; i++) {
    const e = data[i]
    if (!e) continue
    if (e.high > maxPrice) maxPrice = e.high
    if (e.low < minPrice) minPrice = e.low
  }

  // 如果没有有效数据，返回默认值
  if (!Number.isFinite(maxPrice) || !Number.isFinite(minPrice)) {
    return { maxPrice: 100, minPrice: 0 }
  }

  return { maxPrice, minPrice }
}

/* 核心渲染：仅渲染可视区域 */
function render() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return
  if (!props.data || props.data.length === 0) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const kdata = props.data
  const rect = container.getBoundingClientRect()

  const viewWidth = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))

  let dpr = window.devicePixelRatio || 1

  // 限制 Canvas 总像素数（例如 16M 像素，约等于 4K 分辨率）
  const MAX_CANVAS_PIXELS = 16 * 1024 * 1024
  const requestedPixels = (viewWidth * dpr) * (height * dpr)
  
  if (requestedPixels > MAX_CANVAS_PIXELS) {
    // 动态调整 DPR 以满足像素限制
    dpr = Math.sqrt(MAX_CANVAS_PIXELS / (viewWidth * height))
    console.warn(`DPR reduced to ${dpr.toFixed(2)} to prevent memory issues`)
  }

  const opt = option()
  const n = kdata.length

  canvas.style.width = `${viewWidth}px`
  canvas.style.height = `${height}px`
  canvas.width = Math.round(viewWidth * dpr)
  canvas.height = Math.round(height * dpr)

  const scrollLeft = container.scrollLeft

  const { start, end } = getVisibleRange(scrollLeft, viewWidth, opt.kWidth, opt.kGap, n)
  
  const priceRange = getVisiblePriceRange(kdata, start, end)

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, viewWidth, height)

  ctx.save()
  ctx.translate(-scrollLeft, 0)

  kLineDraw(ctx, kdata, opt, height, dpr, start, end, priceRange)

  if (props.showMA.ma5) {
    drawMA5Line(ctx, kdata, opt, height, dpr, start, end, priceRange)
  }
  if (props.showMA.ma10) {
    drawMA10Line(ctx, kdata, opt, height, dpr, start, end, priceRange)
  }
  if (props.showMA.ma20) {
    drawMA20Line(ctx, kdata, opt, height, dpr, start, end, priceRange)
  }

  ctx.restore()
}

/* rAF节流 */
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

defineExpose({ scheduleRender, scrollToRight })

onMounted(() => {
  window.addEventListener('resize', scheduleRender, { passive: true })
  scheduleRender()
})

onUnmounted(() => {
  window.removeEventListener('resize', scheduleRender)
  if (rafId !== null) cancelAnimationFrame(rafId)
})

// 监听 props 变化，同步到内部状态
watch(
  () => [props.kWidth, props.kGap],
  ([newWidth, newGap]) => {
    currentKWidth.value = newWidth
    currentKGap.value = newGap
  }
)

watch(
  () => [props.data, props.yPaddingPx, props.showMA],
  async () => {
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
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
  /* 隐藏滚动条但保留滚动功能 */
  scrollbar-width: none;
  /* Firefox */
  -ms-overflow-style: none;
  /* IE/Edge */
}

/* Chrome/Safari 隐藏滚动条 */
.chart-container::-webkit-scrollbar {
  display: none;
}

/* 默认显示可拖拽光标 */
.chart-container:hover {
  cursor: grab;
}

/* 拖拽时显示抓取光标 - 写在后面，优先级更高 */
.chart-container:active {
  cursor: grabbing;
}

.scroll-content {
  height: 100%;
  min-height: inherit;
}

.chart-canvas {
  position: sticky;
  left: 0;
  top: 0;
  display: block;
}
</style>