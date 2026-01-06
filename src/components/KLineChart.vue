<template>
  <!-- 外层 wrapper 负责在父容器中居中整个图表 -->
  <div class="chart-wrapper">
    <div class="chart-container" :class="{ 'is-dragging': isDragging }" ref="containerRef" @scroll.passive="onScroll"
      @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseLeave"
      @wheel.prevent="onWheel">
      <!-- scroll-content 负责撑开横向滚动宽度，并承载 sticky 的画布层 -->
      <div class="scroll-content" :style="{ width: totalWidth + 'px' }">
        <!-- 画布层：sticky 固定在可视区域左上角，滚动只影响绘制时的 scrollLeft -->
        <div class="canvas-layer" ref="canvasLayerRef">
          <!-- 1) 绘图区：K线 + MA + 网格线（随 scrollLeft 平移） -->
          <canvas class="plot-canvas" ref="plotCanvasRef"></canvas>

          <!-- 2) 右侧价格轴（固定，不随滚动） -->
          <canvas class="y-axis-canvas" ref="yAxisCanvasRef"></canvas>

          <!-- 3) 底部时间轴（随 X 滚动，但画布不移动） -->
          <canvas class="x-axis-canvas" ref="xAxisCanvasRef"></canvas>

          <!-- 悬浮浮窗：放在 sticky 的 canvas-layer 内，避免随 scroll-content 横向滚动而偏移 -->
          <KLineTooltip v-if="hovered" :k="hovered" :index="hoveredIndex" :data="props.data" :pos="tooltipPos"
            :set-el="setTooltipEl" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { KLineData } from '@/types/price'
import KLineTooltip from './KLineTooltip.vue'
import { useKLineRenderer, type MAFlags as RendererMAFlags } from '@/composables/useKLineRenderer'
import { useKLineInteraction } from '@/composables/useKLineInteraction'

type MAFlags = RendererMAFlags

const props = withDefaults(defineProps<{
  data: KLineData[]
  kWidth?: number
  kGap?: number
  yPaddingPx?: number
  showMA?: MAFlags
  autoScrollToRight?: boolean
  minKWidth?: number
  maxKWidth?: number
  /** 右侧价格轴宽度 */
  rightAxisWidth?: number
  /** 底部时间轴高度 */
  bottomAxisHeight?: number
}>(), {
  kWidth: 10,
  kGap: 2,
  yPaddingPx: 40,
  showMA: () => ({ ma5: true, ma10: true, ma20: true }),
  autoScrollToRight: true,
  minKWidth: 2,
  maxKWidth: 50,
  rightAxisWidth: 70,
  bottomAxisHeight: 24,
})

const plotCanvasRef = ref<HTMLCanvasElement | null>(null)
const yAxisCanvasRef = ref<HTMLCanvasElement | null>(null)
const xAxisCanvasRef = ref<HTMLCanvasElement | null>(null)
const canvasLayerRef = ref<HTMLDivElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

// 内部动态K线宽度和间隙
const currentKWidth = ref(props.kWidth)
const currentKGap = ref(props.kGap)

// 计算初始比例
const initialRatio = props.kGap / props.kWidth

const rightAxisWidthRef = computed(() => props.rightAxisWidth)
const bottomAxisHeightRef = computed(() => props.bottomAxisHeight)
const yPaddingPxRef = computed(() => props.yPaddingPx ?? 0)

/* ========== 十字线（鼠标悬停位置） ========== */
const crosshairPos = ref<{ x: number; y: number } | null>(null)
const crosshairIndex = ref<number | null>(null)

const renderer = useKLineRenderer({
  plotCanvasRef,
  yAxisCanvasRef,
  xAxisCanvasRef,
  canvasLayerRef,
  containerRef,
  getData: () => props.data,
  getOption: () => ({
    kWidth: currentKWidth.value,
    kGap: currentKGap.value,
    yPaddingPx: props.yPaddingPx,
  }),
  getShowMA: () => props.showMA,
  rightAxisWidth: rightAxisWidthRef,
  bottomAxisHeight: bottomAxisHeightRef,
  crosshairPos,
  crosshairIndex,
})

const scheduleRender = renderer.scheduleRender

const tooltipRef = ref<HTMLDivElement | null>(null)

function setTooltipEl(el: HTMLDivElement | null) {
  tooltipRef.value = el
}

const interaction = useKLineInteraction({
  containerRef,
  tooltipRef,
  getData: () => props.data,
  crosshairPos,
  crosshairIndex,
  kWidth: currentKWidth,
  kGap: currentKGap,
  minKWidth: props.minKWidth,
  maxKWidth: props.maxKWidth,
  initialRatio,
  rightAxisWidth: rightAxisWidthRef,
  bottomAxisHeight: bottomAxisHeightRef,
  yPaddingPx: yPaddingPxRef,
  scheduleRender,
  getViewport: renderer.getLastViewport,
})

const { isDragging, hoveredIndex, hovered, tooltipPos, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onScroll, onWheel } = interaction

/* 计算总宽度：绑图区域宽度 + 右侧轴宽度 */
const totalWidth = computed(() => {
  const n = props.data?.length ?? 0
  const plotWidth = currentKGap.value + n * (currentKWidth.value + currentKGap.value)
  return plotWidth + props.rightAxisWidth
})

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
  renderer.destroy()
})

watch(
  () => [props.kWidth, props.kGap],
  ([newWidth, newGap]) => {
    if (typeof newWidth === 'number') currentKWidth.value = newWidth
    if (typeof newGap === 'number') currentKGap.value = newGap
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
.chart-wrapper {
  /* 让组件在父容器中居中显示 */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.chart-container {
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
  height: 80%;
  width: 80%;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chart-container::-webkit-scrollbar {
  display: none;
}

.chart-container:hover {
  cursor: grab;
}

.chart-container:active {
  cursor: grabbing;
}

.scroll-content {
  height: 100%;
  min-height: inherit;
  position: relative;
}

/* 关键：sticky 固定在可视区域左上角 */
.canvas-layer {
  position: sticky;
  left: 0;
  top: 0;
  /* width/height 由 JS 在 render() 中设置为视口大小 */
  pointer-events: none;
}

/* 三层 canvas 叠放 */
.plot-canvas {
  position: absolute;
  left: 0;
  top: 0;
  display: block;
}

.y-axis-canvas {
  position: absolute;
  top: 0;
  right: 0;
  display: block;
}

.x-axis-canvas {
  position: absolute;
  left: 0;
  bottom: 0;
  display: block;
}
</style>
