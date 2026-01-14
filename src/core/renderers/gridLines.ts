import type { PaneRenderer } from '@/core/layout/pane'
import { createHorizontalLineRect, createVerticalLineRect } from '@/utils/kLineDraw/pixelAlign'

/**
 * 仅绘制网格线（不绘制任何文字刻度）。
 * - 横向：按像素均分（保证永远铺满整个绘图区高度，不受 priceRange 影响）
 * - 纵向：按月分割（与时间轴刻度保持同一规则，但不画文字）
 */
export const GridLinesRenderer: PaneRenderer = {
    draw({ ctx, pane, data, range, scrollLeft, kWidth, kGap, dpr }) {
        if (!data.length) return

        const unit = kWidth + kGap
        const gridColor = 'rgba(0,0,0,0.06)'

        // 根据 pane 类型确定网格线数量：主图 6 条，副图 2 条
        const tickCount = pane.id === 'main' ? 6 : 2

        ctx.save()
        ctx.fillStyle = gridColor

        // world 坐标系（跟随滚动）
        ctx.translate(-scrollLeft, 0)

        // 横线：画满整个可视区域宽度
        const plotWidth = ctx.canvas.width / dpr
        const startX = scrollLeft
        const endX = scrollLeft + plotWidth

        // ========= 横线新算法：按像素均分，铺满绘图区高度 =========
        // 绘图区： [paddingTop, pane.height - paddingBottom]
        let pt = pane.yAxis.getPaddingTop()
        let pb = pane.yAxis.getPaddingBottom()

        const yStart = pt
        const yEnd = Math.max(pt, pane.height - pb) // 防止 padding 过大导致反向
        const viewH = Math.max(0, yEnd - yStart)

        for (let i = 0; i < tickCount; i++) {
            const t = tickCount <= 1 ? 0 : i / (tickCount - 1) // 0..1
            const y = Math.round(yStart + t * viewH)

            const h = createHorizontalLineRect(startX, endX, y, dpr)
            if (h) ctx.fillRect(h.x, h.y, h.width, h.height)
        }

        // ========= 竖线：按月份变化画竖线（不画文字）=========
        function monthKey(ts: number): string {
            const d = new Date(ts)
            return `${d.getFullYear()}-${d.getMonth()}`
        }

        for (let i = Math.max(range.start, 1); i < range.end && i < data.length; i++) {
            const cur = data[i]
            const prev = data[i - 1]
            if (!cur || !prev) continue

            if (monthKey(cur.timestamp) !== monthKey(prev.timestamp)) {
                const worldX = kGap + i * unit
                const v = createVerticalLineRect(worldX, 0, pane.height, dpr)
                if (v) ctx.fillRect(v.x, v.y, v.width, v.height)
            }
        }

        ctx.restore()
    },
}