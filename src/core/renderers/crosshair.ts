import { createHorizontalLineRect, createVerticalLineRect } from '@/core/draw/pixelAlign'
import { CROSSHAIR_COLORS } from '@/core/theme/colors'

/**
 * 绘制十字线
 * ctx 处于 plotCanvas 的屏幕坐标（不带 translate(-scrollLeft,0)），x/y 是相对 plot 区域左上角的坐标
 * @param ctx Canvas 绘图上下文
 * @param plotWidth 绘图区宽度
 * @param plotHeight 绘图区高度
 * @param dpr 设备像素比
 * @param x 十字线横坐标
 * @param y 十字线纵坐标
 * @param drawVertical 是否绘制垂直线
 * @param drawHorizontal 是否绘制水平线
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
        console.log('realX', v!.x)
        if (v) ctx.fillRect(v.x, v.y, v.width, v.height)
    }

    if (drawHorizontal) {
        const safeY = Math.min(y, plotHeight - 1 / dpr)
        const h = createHorizontalLineRect(0, plotWidth, safeY, dpr)
        if (h) ctx.fillRect(h.x, h.y, h.width, h.height)
    }

    ctx.restore()
}
