import { createHorizontalLineRect, createVerticalLineRect } from '@/utils/kLineDraw/pixelAlign'

/**
 * 十字线渲染（屏幕坐标系）：
 * - ctx 处于 plotCanvas 的屏幕坐标（不带 translate(-scrollLeft,0)）
 * - x/y 是相对 plot 区域左上角的坐标（即 container 内坐标）
 *
 * @param drawVertical 是否绘制垂直线（默认 true）
 * @param drawHorizontal 是否绘制水平线（默认 true）
 * @param horizontalYMin 水平线绘制的最小 y 坐标（不包含），默认 0
 * @param horizontalYMax 水平线绘制的最大 y 坐标（不包含），默认 plotHeight
 */
export function drawCrosshair(args: {
    ctx: CanvasRenderingContext2D
    plotWidth: number
    plotHeight: number
    dpr: number
    x: number
    y: number
    drawVertical?: boolean
    drawHorizontal?: boolean
    horizontalYMin?: number
    horizontalYMax?: number
}) {
    const { ctx, plotWidth, plotHeight, dpr, x, y, drawVertical = true, drawHorizontal = true, horizontalYMin = 0, horizontalYMax = plotHeight } = args

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, plotWidth, plotHeight)
    ctx.clip()

    const color = 'rgba(0,0,0,0.28)'
    ctx.fillStyle = color

    if (drawVertical) {
        const v = createVerticalLineRect(x, 0, plotHeight, dpr)
        if (v) ctx.fillRect(v.x, v.y, v.width, v.height)
    }

    if (drawHorizontal && y >= horizontalYMin && y < horizontalYMax) {
        const h = createHorizontalLineRect(0, plotWidth, y, dpr)
        if (h) ctx.fillRect(h.x, h.y, h.width, h.height)
    }

    ctx.restore()
}

