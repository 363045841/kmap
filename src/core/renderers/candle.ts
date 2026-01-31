import type { PaneRenderer } from '@/core/layout/pane'
import { getKLineTrend, type kLineTrend } from '@/types/kLine'
import { createAlignedKLineFromPx, createVerticalLineRect } from '@/core/draw/pixelAlign'
import { PRICE_COLORS } from '@/core/theme/colors'
import { getPhysicalKLineConfig } from '@/core/chart'

/**
 * Candle 渲染器：在单个 pane 中绘制 K 线蜡烛图
 *
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
     */
    draw({ ctx, pane, data, range, scrollLeft, kWidth, kGap, dpr, paneWidth: _paneWidth }) {
        if (!data.length) return

        // 1. 只取渲染宽度用的物理像素值
        const { kWidthPx } = getPhysicalKLineConfig(kWidth, kGap, dpr)

        ctx.save()
        ctx.translate(-scrollLeft, 0)

        // 2. 位置计算使用原始的 kWidth 和 kGap（与 contentWidth 一致）
        const unit = kWidth + kGap
        const startX = kGap

        for (let i = range.start; i < range.end && i < data.length; i++) {
            const e = data[i]
            if (!e) continue

            const openY = pane.yAxis.priceToY(e.open)
            const closeY = pane.yAxis.priceToY(e.close)
            const highY = pane.yAxis.priceToY(e.high)
            const lowY = pane.yAxis.priceToY(e.low)

            const rawRectY = Math.min(openY, closeY)
            const rawRectH = Math.max(Math.abs(openY - closeY), 1)

            // 3. 使用原始逻辑像素计算位置
            const leftLogical = startX + i * unit

            // 4. 传入物理像素坐标进行对齐
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
            // 4. 绘制实体
            if (i === range.start) {
                console.log('draw', aligned.bodyRect.x - scrollLeft)
            }
            ctx.fillRect(aligned.bodyRect.x, aligned.bodyRect.y, aligned.bodyRect.width, aligned.bodyRect.height)

            // 5. 绘制影线（使用统一的对齐坐标）
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