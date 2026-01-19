import { drawCrosshairPriceLabel, drawCrosshairTimeLabel } from '@/utils/kLineDraw/axis'
import type { Pane } from '@/core/layout/pane'
import type { KLineData } from '@/types/price'

export function drawCrosshairPriceLabelForPane(args: {
    ctx: CanvasRenderingContext2D
    pane: Pane
    axisWidth: number
    dpr: number
    crosshairY: number
    yPaddingPx: number
    lastPrice?: number
}) {
    const { ctx, pane, axisWidth, dpr, crosshairY, yPaddingPx, lastPrice } = args
    drawCrosshairPriceLabel(ctx, {
        x: 0,
        y: pane.top,
        width: axisWidth,
        height: pane.height,
        crosshairY,
        priceRange: pane.priceRange,
        yPaddingPx,
        dpr,
        lastPrice,
    })
}

export function drawCrosshairTimeLabelGlobal(args: {
    ctx: CanvasRenderingContext2D
    data: KLineData[]
    dpr: number
    crosshairX: number
    index: number
}) {
    const { ctx, data, dpr, crosshairX, index } = args
    const w = ctx.canvas.width / dpr
    const h = ctx.canvas.height / dpr
    const k = data[index]
    if (!k) return

    drawCrosshairTimeLabel(ctx, {
        x: 0,
        y: 0,
        width: w,
        height: h,
        crosshairX,
        timestamp: k.timestamp,
        dpr,
    })
}
