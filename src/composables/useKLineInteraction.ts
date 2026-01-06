import type { ComputedRef, Ref } from 'vue'
import { computed, nextTick, ref, watch } from 'vue'
import type { KLineData } from '@/types/price'
import { priceToY } from '@/utils/priceToY'
import type { KLineViewport } from './useKLineRenderer'

export type TooltipSize = { width: number; height: number }
export type TooltipPos = { x: number; y: number }

export function useKLineInteraction(args: {
    containerRef: Ref<HTMLDivElement | null>
    tooltipRef: Ref<HTMLDivElement | null>
    getData: () => KLineData[]

    // 可缩放配置
    kWidth: Ref<number>
    kGap: Ref<number>
    minKWidth: number
    maxKWidth: number
    initialRatio: number

    // 布局配置
    rightAxisWidth: Ref<number>
    bottomAxisHeight: Ref<number>
    yPaddingPx: Ref<number>

    // 渲染回调
    scheduleRender: () => void

    // renderer 计算出的最新 viewport，用于 hover 命中一致性
    getViewport: () => KLineViewport | null

    // 可选：使用外部 crosshair refs（与 renderer 共用，避免十字线状态分裂）
    crosshairPos?: Ref<{ x: number; y: number } | null>
    crosshairIndex?: Ref<number | null>
}): {
    isDragging: Ref<boolean>
    hoveredIndex: Ref<number | null>
    hovered: ComputedRef<KLineData | null>
    crosshairPos: Ref<{ x: number; y: number } | null>
    crosshairIndex: Ref<number | null>
    tooltipPos: Ref<TooltipPos>
    tooltipSize: Ref<TooltipSize>
    clearCrosshair: () => void
    clearHover: () => void
    onMouseDown: (e: MouseEvent) => void
    onMouseMove: (e: MouseEvent) => void
    onMouseUp: () => void
    onMouseLeave: () => void
    onScroll: () => void
    onWheel: (e: WheelEvent) => void
} {
    const isDragging = ref(false)
    let dragStartX = 0
    let scrollStartX = 0

    const hoveredIndex = ref<number | null>(null)
    const hovered = computed(() => {
        if (hoveredIndex.value === null) return null
        return args.getData()?.[hoveredIndex.value] ?? null
    })

    const crosshairPos = args.crosshairPos ?? ref<{ x: number; y: number } | null>(null)
    const crosshairIndex = args.crosshairIndex ?? ref<number | null>(null)

    function clearCrosshair(): void {
        crosshairPos.value = null
        crosshairIndex.value = null
    }

    function clearHover(): void {
        hoveredIndex.value = null
    }

    const tooltipPos = ref<TooltipPos>({ x: 0, y: 0 })
    const tooltipSize = ref<TooltipSize>({ width: 220, height: 180 })

    watch(hovered, async () => {
        await nextTick()
        const el = args.tooltipRef.value
        if (!el) return
        const r = el.getBoundingClientRect()
        tooltipSize.value = {
            width: Math.max(180, Math.round(r.width)),
            height: Math.max(80, Math.round(r.height)),
        }
    })

    function updateHover(e: MouseEvent): void {
        const container = args.containerRef.value
        if (!container) return

        const rect = container.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        const viewWidth = Math.max(1, Math.round(rect.width))
        const viewHeight = Math.max(1, Math.round(rect.height))
        const plotWidth = viewWidth - args.rightAxisWidth.value
        const plotHeight = viewHeight - args.bottomAxisHeight.value

        if (mouseX < 0 || mouseY < 0 || mouseX > plotWidth || mouseY > plotHeight) {
            clearCrosshair()
            clearHover()
            return
        }

        const scrollLeft = container.scrollLeft
        const unit = args.kWidth.value + args.kGap.value
        const worldX = scrollLeft + mouseX
        const offset = worldX - args.kGap.value
        if (offset < 0) {
            clearCrosshair()
            clearHover()
            return
        }

        const data = args.getData()
        const idx = Math.floor(offset / unit)
        if (idx < 0 || idx >= (data?.length ?? 0)) {
            clearCrosshair()
            clearHover()
            return
        }

        crosshairIndex.value = idx

        const centerWorldX = args.kGap.value + idx * unit + args.kWidth.value / 2
        const snappedX = centerWorldX - scrollLeft
        crosshairPos.value = {
            x: Math.min(Math.max(snappedX, 0), plotWidth),
            y: Math.min(Math.max(mouseY, 0), plotHeight),
        }

        const k = data[idx]
        if (!k) {
            clearHover()
            return
        }

        const inUnitX = offset - idx * unit
        if (inUnitX < 0 || inUnitX > args.kWidth.value) {
            clearHover()
            return
        }

        // ===== 命中判定使用 renderer 的 viewport（避免和 render 逻辑漂移） =====
        const vp = args.getViewport()
        if (!vp) {
            clearHover()
            return
        }

        const wantPad = args.yPaddingPx.value ?? 0
        const pad = Math.max(0, Math.min(wantPad, Math.floor(plotHeight / 2) - 1))

        const highY = priceToY(k.high, vp.priceRange.maxPrice, vp.priceRange.minPrice, plotHeight, pad, pad)
        const lowY = priceToY(k.low, vp.priceRange.maxPrice, vp.priceRange.minPrice, plotHeight, pad, pad)
        const openY = priceToY(k.open, vp.priceRange.maxPrice, vp.priceRange.minPrice, plotHeight, pad, pad)
        const closeY = priceToY(k.close, vp.priceRange.maxPrice, vp.priceRange.minPrice, plotHeight, pad, pad)
        const bodyTop = Math.min(openY, closeY)
        const bodyBottom = Math.max(openY, closeY)

        const HIT_WICK_HALF = 3
        const cx = args.kWidth.value / 2
        const hitBody = mouseY >= bodyTop && mouseY <= bodyBottom
        const hitWick = Math.abs(inUnitX - cx) <= HIT_WICK_HALF && mouseY >= highY && mouseY <= lowY
        if (!hitBody && !hitWick) {
            clearHover()
            return
        }

        hoveredIndex.value = idx

        // 浮窗定位：跟随鼠标，并做简单防溢出
        const padding = 12
        const preferGap = 14
        const tooltipW = tooltipSize.value.width
        const rightX = mouseX + preferGap
        const leftX = mouseX - preferGap - tooltipW
        const desiredX = rightX + tooltipW + padding <= viewWidth ? rightX : leftX

        const desiredY = mouseY + preferGap
        const maxX = Math.max(padding, viewWidth - tooltipSize.value.width - padding)
        const maxY = Math.max(padding, viewHeight - tooltipSize.value.height - padding)
        tooltipPos.value = {
            x: Math.min(Math.max(desiredX, padding), maxX),
            y: Math.min(Math.max(desiredY, padding), maxY),
        }
    }

    function onMouseDown(e: MouseEvent): void {
        if (e.button !== 0) return
        const container = args.containerRef.value
        if (!container) return
        isDragging.value = true
        clearCrosshair()
        clearHover()
        dragStartX = e.clientX
        scrollStartX = container.scrollLeft
        e.preventDefault()
    }

    function onMouseMove(e: MouseEvent): void {
        const container = args.containerRef.value
        if (!container) return

        if (isDragging.value) {
            const deltaX = dragStartX - e.clientX
            container.scrollLeft = scrollStartX + deltaX
            return
        }

        updateHover(e)
        args.scheduleRender()
    }

    function onMouseUp(): void {
        isDragging.value = false
    }

    function onMouseLeave(): void {
        isDragging.value = false
        clearCrosshair()
        clearHover()
        args.scheduleRender()
    }

    function onScroll(): void {
        clearCrosshair()
        clearHover()
        args.scheduleRender()
    }

    function onWheel(e: WheelEvent): void {
        const container = args.containerRef.value
        if (!container) return

        clearCrosshair()
        clearHover()

        const rect = container.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const scrollLeft = container.scrollLeft
        const oldUnit = args.kWidth.value + args.kGap.value
        const centerIndex = (scrollLeft + mouseX) / oldUnit

        const delta = e.deltaY > 0 ? -1 : 1
        const newKWidth = Math.max(args.minKWidth, Math.min(args.maxKWidth, args.kWidth.value + delta))
        if (newKWidth === args.kWidth.value) return

        const newKGap = Math.max(0.5, newKWidth * args.initialRatio)
        args.kWidth.value = newKWidth
        args.kGap.value = newKGap

        const newUnit = newKWidth + newKGap
        nextTick(() => {
            const newScrollLeft = centerIndex * newUnit - mouseX
            container.scrollLeft = Math.max(0, newScrollLeft)
            args.scheduleRender()
        })
    }

    return {
        isDragging,
        hoveredIndex,
        hovered,
        crosshairPos,
        crosshairIndex,
        tooltipPos,
        tooltipSize,
        clearCrosshair,
        clearHover,
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave,
        onScroll,
        onWheel,
    }
}
