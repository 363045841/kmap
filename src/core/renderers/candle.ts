import type { PaneRenderer } from '@/core/layout/pane'
import { getKLineTrend, type kLineTrend } from '@/types/kLine'
import { createAlignedKLineFromPx, createVerticalLineRect } from '@/core/draw/pixelAlign'
import { PRICE_COLORS } from '@/core/theme/colors'

/**
 * 最小 Candle 渲染器：依赖 pane.yAxis 做 price->y。
 * 
 * TradingView级别稳定实现：
 * - 细节A：避免二次round，统一在物理像素空间计算
 * - 细节B：先决定宽度，再推右边界，避免round差异
 * - 细节C：使用fillRect绘制1物理像素宽影线
 * - 细节D改进1：整数px直接累加，避免浮点误差
 * - 细节D改进2：全局统一的奇数化kWidthPx
 * 
 * 使用说明：
 * - kWidth和kGap应来自zoomAt的物理像素控制
 * - (kWidth * dpr) 和 (kGap * dpr) 都应该是整数
 * - 步进和绘制使用统一的kWidthPxOdd，避免不一致
 */
export const CandleRenderer: PaneRenderer = {
    draw({ ctx, pane, data, range, scrollLeft, kWidth, kGap, dpr, paneWidth: _paneWidth }) {
        if (!data.length) return

        // ============================================================
        // 改进1：物理像素空间整数步进，避免浮点误差
        // ============================================================
        
        // 全局统一的奇数化kWidthPx（改进2）
        let kWidthPx = Math.round(kWidth * dpr)
        if (kWidthPx % 2 === 0) {
            kWidthPx += 1  // 确保奇数，让影线完美居中
        }
        kWidthPx = Math.max(1, kWidthPx)  // 最小1px
        
        const kGapPx = Math.round(kGap * dpr)      // 整数间距
        const unitPx = kWidthPx + kGapPx          // 单元物理宽度（整数）
        const startXPx = kGapPx                   // 起始物理位置（整数）

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

            const rawRectY = Math.min(openY, closeY)
            const rawRectH = Math.max(Math.abs(openY - closeY), 1)

            // ============================================================
            // 改进1：直接用整数px累加，避免浮点误差
            // ============================================================
            const leftPx = startXPx + i * unitPx  // 全程整数，无浮点误差
            const rectX = leftPx / dpr           // 只在最后除回去
            const physKWidth = kWidthPx / dpr      // 统一的逻辑宽度

            // 使用 createAlignedKLine 统一对齐实体和影线
            // 传入统一的kWidthPx，避免重复计算和不一致
            const aligned = createAlignedKLineFromPx(leftPx, rawRectY, kWidthPx, rawRectH, dpr)

            const trend: kLineTrend = getKLineTrend(e)
            const color = trend === 'up' ? PRICE_COLORS.UP : PRICE_COLORS.DOWN

            ctx.fillStyle = color
            // 绘制实体
            ctx.fillRect(aligned.bodyRect.x, aligned.bodyRect.y, aligned.bodyRect.width, aligned.bodyRect.height)

            // 绘制影线（使用统一的对齐坐标）
            const wickWidth = aligned.wickRect.width
            const wickX = aligned.wickRect.x
            const bodyTop = aligned.bodyRect.y
            const bodyBottom = aligned.bodyRect.y + aligned.bodyRect.height
            const bodyHigh = Math.max(e.open, e.close)
            const bodyLow = Math.min(e.open, e.close)

            if (e.high > bodyHigh) {
                // 使用 createVerticalLineRect 确保垂直像素对齐
                const wick = createVerticalLineRect(wickX, highY, bodyTop, dpr)
                if (wick) ctx.fillRect(wick.x, wick.y, wickWidth, wick.height)
            }
            if (e.low < bodyLow) {
                const wick = createVerticalLineRect(wickX, bodyBottom, lowY, dpr)
                if (wick) ctx.fillRect(wick.x, wick.y, wickWidth, wick.height)
            }
        }

        ctx.restore()
    },
}
