import { alignToPhysicalPixelCenter, roundToPhysicalPixel } from '@/core/draw/pixelAlign'
import { BORDER_COLORS } from '@/core/theme/colors'

export function drawAllPanesBorders(args: {
    ctx: CanvasRenderingContext2D
    dpr: number
    plotWidth: number
    panes: Array<{ top: number; height: number }>
    color?: string
}) {
    const { ctx, dpr, plotWidth, panes, color = BORDER_COLORS.DARK } = args
    if (panes.length === 0) return

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 3

    // 添加内边距，避免 3px 宽的线条被边缘裁剪
    const margin = 1.5 / dpr  // 线宽的一半
    const x1 = alignToPhysicalPixelCenter(margin, dpr)
    const x2 = alignToPhysicalPixelCenter(plotWidth - margin, dpr)

    // 计算整体边界
    let outerTop = Infinity
    let outerBottom = -Infinity
    for (const p of panes) {
        outerTop = Math.min(outerTop, p.top)
        outerBottom = Math.max(outerBottom, p.top + p.height)
    }
    outerTop = Number.isFinite(outerTop) ? outerTop : 0
    outerBottom = Number.isFinite(outerBottom) ? outerBottom : 0

    ctx.beginPath()

    // 绘制顶部边框（仅第一个 pane），向内偏移避免裁剪
    const firstPane = panes[0]!
    const y1 = alignToPhysicalPixelCenter(firstPane.top + margin, dpr)
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y1)

    // 绘制底部边框（仅最后一个 pane，在时间轴上方），向内偏移避免裁剪
    const lastPane = panes[panes.length - 1]!
    const y2 = alignToPhysicalPixelCenter(lastPane.top + lastPane.height - margin, dpr)
    ctx.moveTo(x1, y2)
    ctx.lineTo(x2, y2)

    // 绘制左侧边框（从整体顶部到底部），向内偏移避免裁剪
    const yTop = alignToPhysicalPixelCenter(outerTop + margin, dpr)
    // 左右侧边框也使用 roundToPhysicalPixel 确保在 canvas 内部
    const yBottom = roundToPhysicalPixel(outerBottom - margin, dpr)
    ctx.moveTo(x1, yTop)
    ctx.lineTo(x1, yBottom)

    // 绘制右侧边框（从整体顶部到底部，在 yAxis 左侧）
    ctx.moveTo(x2, yTop)
    ctx.lineTo(x2, yBottom)

    // 绘制 pane 之间的分隔线
    for (let i = 1; i < panes.length; i++) {
        const currentPane = panes[i]!
        const y = alignToPhysicalPixelCenter(currentPane.top, dpr)
        ctx.moveTo(x1, y)
        ctx.lineTo(x2, y)
    }

    ctx.stroke()
    ctx.restore()
}