import type { Ref } from 'vue'
import { shallowRef } from 'vue'
import type { KLineData } from '@/types/price'
import { kLineDraw } from '@/utils/kLineDraw/kLine'
import { drawMA10Line, drawMA20Line, drawMA5Line, MA10_COLOR, MA20_COLOR, MA5_COLOR } from '@/utils/kLineDraw/MA'
import {
    drawCrosshairPriceLabel,
    drawCrosshairTimeLabel,
    drawLastPriceDashedLine,
    drawPriceAxis,
    drawTimeAxis,
} from '@/utils/kLineDraw/axis'
import { priceToY } from '@/utils/priceToY'
import { createHorizontalLineRect, createVerticalLineRect } from '@/utils/kLineDraw/pixelAlign'
import { calcMAAtIndex } from '@/utils/kline/ma'
import { getVisiblePriceRange, getVisibleRange, type PriceRange } from '@/utils/kline/viewport'

export type MAFlags = {
    ma5?: boolean
    ma10?: boolean
    ma20?: boolean
}

export type CrosshairPos = { x: number; y: number } | null

export type KLineOption = {
    kWidth: number
    kGap: number
    yPaddingPx?: number
}

export type KLineViewport = {
    viewWidth: number
    viewHeight: number
    plotWidth: number
    plotHeight: number
    rightAxisWidth: number
    bottomAxisHeight: number
    scrollLeft: number
    start: number
    end: number
    priceRange: PriceRange
    dpr: number
}

function drawPlotGrid(
    ctx: CanvasRenderingContext2D,
    opt: KLineOption,
    plotHeight: number,
    dpr: number,
    start: number,
    end: number,
    priceRange: { maxPrice: number; minPrice: number }
): void {
    const unit = opt.kWidth + opt.kGap
    const startX = opt.kGap + start * unit
    const endX = opt.kGap + end * unit

    const wantPad = opt.yPaddingPx ?? 0
    const pad = Math.max(0, Math.min(wantPad, Math.floor(plotHeight / 2) - 1))

    const { maxPrice, minPrice } = priceRange
    const range = maxPrice - minPrice
    const priceTicks = 6

    ctx.save()
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'
    ctx.lineWidth = 1

    const step = range === 0 ? 0 : range / (priceTicks - 1)
    for (let t = 0; t < priceTicks; t++) {
        const p = range === 0 ? maxPrice : maxPrice - step * t
        const y = priceToY(p, maxPrice, minPrice, plotHeight, pad, pad)

        ctx.beginPath()
        ctx.moveTo(startX, Math.round(y) + 0.5)
        ctx.lineTo(endX, Math.round(y) + 0.5)
        ctx.stroke()
    }

    ctx.restore()
}

function drawMALegend(
    ctx: CanvasRenderingContext2D,
    kdata: KLineData[],
    endIndex: number,
    showMA: MAFlags
): void {
    const legendX = 8
    const legendY = 8
    const fontSize = 12
    const gap = 10

    ctx.save()
    ctx.font = `${fontSize}px Arial`
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'

    const lastIndex = Math.min(endIndex - 1, kdata.length - 1)

    const items: Array<{ label: string; color: string; value?: number }> = []
    if (showMA.ma5) items.push({ label: 'MA5', color: MA5_COLOR, value: calcMAAtIndex(kdata, lastIndex, 5) })
    if (showMA.ma10) items.push({ label: 'MA10', color: MA10_COLOR, value: calcMAAtIndex(kdata, lastIndex, 10) })
    if (showMA.ma20) items.push({ label: 'MA20', color: MA20_COLOR, value: calcMAAtIndex(kdata, lastIndex, 20) })

    if (items.length > 0) {
        const paddingX = 8
        const paddingY = 6

        let contentWidth = ctx.measureText('均线').width + gap
        for (const it of items) {
            const valText = typeof it.value === 'number' ? ` ${it.value.toFixed(2)}` : ''
            contentWidth += ctx.measureText(`${it.label}${valText}`).width + gap
        }
        contentWidth -= gap

        const bgW = Math.ceil(contentWidth + paddingX * 2)
        const bgH = Math.ceil(fontSize + paddingY * 2)

        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.fillRect(legendX, legendY, bgW, bgH)

        let x = legendX + paddingX
        const y = legendY + paddingY

        ctx.fillStyle = '#333'
        ctx.fillText('均线', x, y)
        x += ctx.measureText('均线').width + gap

        for (const it of items) {
            const valText = typeof it.value === 'number' ? ` ${it.value.toFixed(2)}` : ''
            const text = `${it.label}${valText}`
            ctx.fillStyle = it.color
            ctx.fillText(text, x, y)
            x += ctx.measureText(text).width + gap
        }
    }

    ctx.restore()
}

export function useKLineRenderer(args: {
    plotCanvasRef: Ref<HTMLCanvasElement | null>
    yAxisCanvasRef: Ref<HTMLCanvasElement | null>
    xAxisCanvasRef: Ref<HTMLCanvasElement | null>
    canvasLayerRef: Ref<HTMLDivElement | null>
    containerRef: Ref<HTMLDivElement | null>

    getData: () => KLineData[]
    getOption: () => KLineOption
    getShowMA: () => MAFlags

    rightAxisWidth: Ref<number>
    bottomAxisHeight: Ref<number>

    crosshairPos: Ref<CrosshairPos>
    crosshairIndex: Ref<number | null>
}): {
    scheduleRender: () => void
    render: () => void
    getLastViewport: () => KLineViewport | null
    destroy: () => void
} {
    let rafId: number | null = null

    const lastViewport = shallowRef<KLineViewport | null>(null)

    function computeViewport(): KLineViewport | null {
        const container = args.containerRef.value
        if (!container) return null

        const data = args.getData()
        if (!data || data.length === 0) return null

        const rect = container.getBoundingClientRect()
        const viewWidth = Math.max(1, Math.round(rect.width))
        const viewHeight = Math.max(1, Math.round(rect.height))
        const scrollLeft = container.scrollLeft

        const rightAxisWidth = args.rightAxisWidth.value
        const bottomAxisHeight = args.bottomAxisHeight.value
        const plotWidth = viewWidth - rightAxisWidth
        const plotHeight = viewHeight - bottomAxisHeight

        let dpr = window.devicePixelRatio || 1
        const MAX_CANVAS_PIXELS = 16 * 1024 * 1024
        const requestedPixels = viewWidth * dpr * (viewHeight * dpr)
        if (requestedPixels > MAX_CANVAS_PIXELS) {
            dpr = Math.sqrt(MAX_CANVAS_PIXELS / (viewWidth * viewHeight))
        }

        const opt = args.getOption()
        const n = data.length
        const { start, end } = getVisibleRange(scrollLeft, plotWidth, opt.kWidth, opt.kGap, n)
        const priceRange = getVisiblePriceRange(data, start, end)

        return {
            viewWidth,
            viewHeight,
            plotWidth,
            plotHeight,
            rightAxisWidth,
            bottomAxisHeight,
            scrollLeft,
            start,
            end,
            priceRange,
            dpr,
        }
    }

    function render(): void {
        const plotCanvas = args.plotCanvasRef.value
        const yAxisCanvas = args.yAxisCanvasRef.value
        const xAxisCanvas = args.xAxisCanvasRef.value
        const container = args.containerRef.value
        const canvasLayer = args.canvasLayerRef.value
        if (!plotCanvas || !yAxisCanvas || !xAxisCanvas || !container || !canvasLayer) return

        const data = args.getData()
        if (!data || data.length === 0) return

        const plotCtx = plotCanvas.getContext('2d')
        const yAxisCtx = yAxisCanvas.getContext('2d')
        const xAxisCtx = xAxisCanvas.getContext('2d')
        if (!plotCtx || !yAxisCtx || !xAxisCtx) return

        const vp = computeViewport()
        if (!vp) return
        lastViewport.value = vp

        // 让 canvas-layer 始终覆盖视口区域
        canvasLayer.style.width = `${vp.viewWidth}px`
        canvasLayer.style.height = `${vp.viewHeight}px`

        const opt = args.getOption()
        const showMA = args.getShowMA()

        // ===== 设置三层 canvas 尺寸 =====
        plotCanvas.style.width = `${vp.plotWidth}px`
        plotCanvas.style.height = `${vp.plotHeight}px`
        plotCanvas.width = Math.round(vp.plotWidth * vp.dpr)
        plotCanvas.height = Math.round(vp.plotHeight * vp.dpr)

        yAxisCanvas.style.width = `${vp.rightAxisWidth}px`
        yAxisCanvas.style.height = `${vp.plotHeight}px`
        yAxisCanvas.width = Math.round(vp.rightAxisWidth * vp.dpr)
        yAxisCanvas.height = Math.round(vp.plotHeight * vp.dpr)

        xAxisCanvas.style.width = `${vp.plotWidth}px`
        xAxisCanvas.style.height = `${vp.bottomAxisHeight}px`
        xAxisCanvas.width = Math.round(vp.plotWidth * vp.dpr)
        xAxisCanvas.height = Math.round(vp.bottomAxisHeight * vp.dpr)

        // ===== 1) 绘图区（plotCanvas） =====
        plotCtx.setTransform(1, 0, 0, 1, 0, 0)
        plotCtx.scale(vp.dpr, vp.dpr)
        plotCtx.clearRect(0, 0, vp.plotWidth, vp.plotHeight)

        // K线/MA/网格裁剪
        plotCtx.save()
        plotCtx.beginPath()
        plotCtx.rect(0, 0, vp.plotWidth, vp.plotHeight)
        plotCtx.clip()
        plotCtx.translate(-vp.scrollLeft, 0)

        const lastIdx = Math.min(vp.end - 1, data.length - 1)
        const last = data[lastIdx]
        if (last) {
            drawLastPriceDashedLine(plotCtx, {
                plotWidth: vp.plotWidth,
                plotHeight: vp.plotHeight,
                scrollLeft: vp.scrollLeft,
                startIndex: vp.start,
                endIndex: vp.end,
                kWidth: opt.kWidth,
                kGap: opt.kGap,
                priceRange: vp.priceRange,
                lastPrice: last.close,
                yPaddingPx: opt.yPaddingPx,
                dpr: vp.dpr,
            })
        }

        drawPlotGrid(plotCtx, opt, vp.plotHeight, vp.dpr, vp.start, vp.end, vp.priceRange)

        kLineDraw(plotCtx, data, opt, vp.plotHeight, vp.dpr, vp.start, vp.end, vp.priceRange)
        if (showMA.ma5) drawMA5Line(plotCtx, data, opt, vp.plotHeight, vp.dpr, vp.start, vp.end, vp.priceRange)
        if (showMA.ma10) drawMA10Line(plotCtx, data, opt, vp.plotHeight, vp.dpr, vp.start, vp.end, vp.priceRange)
        if (showMA.ma20) drawMA20Line(plotCtx, data, opt, vp.plotHeight, vp.dpr, vp.start, vp.end, vp.priceRange)

        plotCtx.restore()

        // 十字线（屏幕坐标）
        if (args.crosshairPos.value) {
            plotCtx.save()
            plotCtx.beginPath()
            plotCtx.rect(0, 0, vp.plotWidth, vp.plotHeight)
            plotCtx.clip()

            const color = 'rgba(0,0,0,0.28)'
            plotCtx.fillStyle = color

            const v = createVerticalLineRect(args.crosshairPos.value.x, 0, vp.plotHeight, vp.dpr)
            if (v) plotCtx.fillRect(v.x, v.y, v.width, v.height)

            const h = createHorizontalLineRect(0, vp.plotWidth, args.crosshairPos.value.y, vp.dpr)
            if (h) plotCtx.fillRect(h.x, h.y, h.width, h.height)

            plotCtx.restore()
        }

        // ===== 2) 右侧价格轴 =====
        yAxisCtx.setTransform(1, 0, 0, 1, 0, 0)
        yAxisCtx.scale(vp.dpr, vp.dpr)
        yAxisCtx.clearRect(0, 0, vp.rightAxisWidth, vp.plotHeight)
        drawPriceAxis(yAxisCtx, {
            x: 0,
            y: 0,
            width: vp.rightAxisWidth,
            height: vp.plotHeight,
            priceRange: vp.priceRange,
            yPaddingPx: opt.yPaddingPx,
            dpr: vp.dpr,
            ticks: 10,
        })

        if (args.crosshairPos.value) {
            drawCrosshairPriceLabel(yAxisCtx, {
                x: 0,
                y: 0,
                width: vp.rightAxisWidth,
                height: vp.plotHeight,
                crosshairY: args.crosshairPos.value.y,
                priceRange: vp.priceRange,
                yPaddingPx: opt.yPaddingPx,
                dpr: vp.dpr,
            })
        }

        // ===== 3) 底部时间轴 =====
        xAxisCtx.setTransform(1, 0, 0, 1, 0, 0)
        xAxisCtx.scale(vp.dpr, vp.dpr)
        xAxisCtx.clearRect(0, 0, vp.plotWidth, vp.bottomAxisHeight)
        drawTimeAxis(xAxisCtx, {
            x: 0,
            y: 0,
            width: vp.plotWidth,
            height: vp.bottomAxisHeight,
            data,
            scrollLeft: vp.scrollLeft,
            kWidth: opt.kWidth,
            kGap: opt.kGap,
            startIndex: vp.start,
            endIndex: vp.end,
            dpr: vp.dpr,
        })

        if (args.crosshairPos.value && typeof args.crosshairIndex.value === 'number') {
            const k = data[args.crosshairIndex.value]
            if (k) {
                drawCrosshairTimeLabel(xAxisCtx, {
                    x: 0,
                    y: 0,
                    width: vp.plotWidth,
                    height: vp.bottomAxisHeight,
                    crosshairX: args.crosshairPos.value.x,
                    timestamp: k.timestamp,
                    dpr: vp.dpr,
                })
            }
        }

        // ===== 4) MA 图注 =====
        drawMALegend(plotCtx, data, vp.end, showMA)
    }

    function scheduleRender(): void {
        if (rafId !== null) cancelAnimationFrame(rafId)
        rafId = requestAnimationFrame(() => {
            rafId = null
            render()
        })
    }

    function getLastViewport(): KLineViewport | null {
        return lastViewport.value
    }

    function destroy(): void {
        if (rafId !== null) cancelAnimationFrame(rafId)
        rafId = null
        lastViewport.value = null
    }

    return { scheduleRender, render, getLastViewport, destroy }
}

