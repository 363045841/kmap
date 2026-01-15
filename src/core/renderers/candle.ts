import type { PaneRenderer } from '@/core/layout/pane'
import { getKLineTrend, type kLineTrend } from '@/types/kLine'
import { alignRect, createVerticalLineRect } from '@/utils/kLineDraw/pixelAlign'

const UP_COLOR = 'rgba(214, 10, 34, 1)'
const DOWN_COLOR = 'rgba(3, 123, 102, 1)'

/**
 * 最小 Candle 渲染器：依赖 pane.yAxis 做 price->y。
 * 注意：这里暂时复用现有 pixelAlign 工具（后续可以一起迁到 core/draw）。
 */
export const CandleRenderer: PaneRenderer = {
    draw({ ctx, pane, data, range, scrollLeft, kWidth, kGap, dpr }) {
        if (!data.length) return

        const unit = kWidth + kGap

        ctx.save()
        // world 坐标：平移以实现横向滚动效果
        ctx.translate(-scrollLeft, 0)

        for (let i = range.start; i < range.end && i < data.length; i++) {
            const e = data[i]
            if (!e) continue

            const openY = pane.yAxis.priceToY(e.open)
            const closeY = pane.yAxis.priceToY(e.close)
            const highY = pane.yAxis.priceToY(e.high)
            const lowY = pane.yAxis.priceToY(e.low)

            const rectX = kGap + i * unit
            const rawRectY = Math.min(openY, closeY)
            const rawRectH = Math.max(Math.abs(openY - closeY), 1)
            const alignedRect = alignRect(rectX, rawRectY, kWidth, rawRectH, dpr)

            const trend: kLineTrend = getKLineTrend(e)
            const color = trend === 'up' ? UP_COLOR : DOWN_COLOR

            ctx.fillStyle = color
            ctx.fillRect(alignedRect.x, alignedRect.y, alignedRect.width, alignedRect.height)

            // wick
            const cx = rectX + kWidth / 2
            const bodyTop = alignedRect.y
            const bodyBottom = alignedRect.y + alignedRect.height
            const bodyHigh = Math.max(e.open, e.close)
            const bodyLow = Math.min(e.open, e.close)

            if (e.high > bodyHigh) {
                const wick = createVerticalLineRect(cx, highY, bodyTop, dpr)
                if (wick) ctx.fillRect(wick.x, wick.y, wick.width, wick.height)
            }
            if (e.low < bodyLow) {
                const wick = createVerticalLineRect(cx, bodyBottom, lowY, dpr)
                if (wick) ctx.fillRect(wick.x, wick.y, wick.width, wick.height)
            }
        }

        ctx.restore()
    },
}
