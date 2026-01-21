import { createHorizontalLineRect, createVerticalLineRect } from '@/core/draw/pixelAlign'
import { CROSSHAIR_COLORS } from '@/core/theme/colors'

/**
 * 十字线渲染（屏幕坐标系）：
 * - ctx 处于 plotCanvas 的屏幕坐标（不带 translate(-scrollLeft,0)）
 * - x/y 是相对 plot 区域左上角的坐标（即 container 内坐标）
 *
 * @param drawVertical 是否绘制垂直线（默认 true）
 * @param drawHorizontal 是否绘制水平线（默认 true）
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
}) {
    const { ctx, plotWidth, plotHeight, dpr, x, y, drawVertical = true, drawHorizontal = true } = args

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, plotWidth, plotHeight)
    ctx.clip()

    ctx.fillStyle = CROSSHAIR_COLORS.LINE

    if (drawVertical) {
        const v = createVerticalLineRect(x, 0, plotHeight, dpr)
        if (v) ctx.fillRect(v.x, v.y, v.width, v.height)
    }

    if (drawHorizontal) {
        // 限制 y 坐标，确保不绘制在 pane 下边缘
        // 避免因像素对齐导致十字线超出清除范围的问题
        const safeY = Math.min(y, plotHeight - 1 / dpr)
        const h = createHorizontalLineRect(0, plotWidth, safeY, dpr)
        if (h) ctx.fillRect(h.x, h.y, h.width, h.height)
    }

    ctx.restore()
}
