import type { PaneRenderer } from '@/core/layout/pane'
import { getKLineTrend, type kLineTrend } from '@/types/kLine'
import { alignRect, createVerticalLineRect } from '@/core/draw/pixelAlign'
import { PRICE_COLORS } from '@/core/theme/colors'

/**
 * 最小 Candle 渲染器：依赖 pane.yAxis 做 price->y。
 */
export const CandleRenderer: PaneRenderer = {
    draw({ ctx, pane, data, range, scrollLeft, kWidth, kGap, dpr, paneWidth: _paneWidth }) {
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
            const color = trend === 'up' ? PRICE_COLORS.UP : PRICE_COLORS.DOWN

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
