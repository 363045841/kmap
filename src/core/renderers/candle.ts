import type { PaneRenderer } from '@/core/layout/pane'
import { getKLineTrend, type kLineTrend } from '@/types/kLine'
import { createAlignedKLineFromPx, createVerticalLineRect } from '@/core/draw/pixelAlign'
import { PRICE_COLORS } from '@/core/theme/colors'
import { getPhysicalKLineConfig } from '@/core/chart'

/**
 * Candle 渲染器：在单个 pane 中绘制 K 线蜡烛图
 * 依赖 pane.yAxis 做 price->y 坐标映射，使用物理像素空间计算避免浮点误差
 */
export const CandleRenderer: PaneRenderer = {
    /**
     * 绘制 K 线蜡烛图
     * @param ctx Canvas 绘图上下文，Chart 已执行 translate(0, pane.top)，y=0 对应 pane 顶部
     * @param pane 当前 pane 实例
     * @param data 全量 K 线数据
     * @param range 当前视口可见的索引范围
     * @param scrollLeft 滚动偏移量，renderer 内部如需 world 坐标需执行 ctx.translate(-scrollLeft, 0)
     * @param kWidth K 线宽度
     * @param kGap K 线间隔
     * @param dpr 设备像素比
     * @param _paneWidth pane 宽度（未使用）
     * @param kLinePositions K 线起始 x 坐标数组（由 Chart 统一计算）
     */
    draw({ ctx, pane, data, range, scrollLeft, kWidth, kGap, dpr, paneWidth: _paneWidth, kLinePositions }) {
        if (!data.length) return

        const { kWidthPx } = getPhysicalKLineConfig(kWidth, kGap, dpr)

        ctx.save()
        ctx.translate(-scrollLeft, 0)

        const positions = kLinePositions || []
        const realPos: number[] = []

        for (let i = range.start; i < range.end && i < data.length; i++) {
            const e = data[i]
            if (!e) continue

            const openY = pane.yAxis.priceToY(e.open)
            const closeY = pane.yAxis.priceToY(e.close)
            const highY = pane.yAxis.priceToY(e.high)
            const lowY = pane.yAxis.priceToY(e.low)

            const rawRectY = Math.min(openY, closeY)
            const rawRectH = Math.max(Math.abs(openY - closeY), 1)

            // 使用 Chart 统一计算的 x 坐标
            const leftLogical = positions[i - range.start]
            if (!leftLogical) continue
            const aligned = createAlignedKLineFromPx(
                Math.round(leftLogical * dpr),
                rawRectY,
                kWidthPx,
                rawRectH,
                dpr
            )

            const trend: kLineTrend = getKLineTrend(e)
            const color = trend === 'up' ? PRICE_COLORS.UP : PRICE_COLORS.DOWN

            ctx.fillStyle = color
            ctx.fillRect(aligned.bodyRect.x, aligned.bodyRect.y, aligned.bodyRect.width, aligned.bodyRect.height)
            realPos[i - range.start] = aligned.bodyRect.x
            const wickWidth = aligned.wickRect.width
            const wickX = aligned.wickRect.x
            const bodyTop = aligned.bodyRect.y
            const bodyBottom = aligned.bodyRect.y + aligned.bodyRect.height
            const bodyHigh = Math.max(e.open, e.close)
            const bodyLow = Math.min(e.open, e.close)

            if (e.high > bodyHigh) {
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
