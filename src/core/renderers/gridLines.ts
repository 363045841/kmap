import type { PaneRenderer } from '@/core/layout/pane'
import { createHorizontalLineRect, createVerticalLineRect } from '@/core/draw/pixelAlign'
import { findMonthBoundaries } from '@/utils/dateFormat'
import { GRID_COLORS } from '@/core/theme/colors'

/**
 * 仅绘制网格线（不绘制任何文字刻度）。
 * - 横向：按像素均分（保证永远铺满整个绘图区高度，不受 priceRange 影响）
 * - 纵向：按月分割（使用预计算的月边界，网格线对齐到K线实体中部）
 */
export const GridLinesRenderer: PaneRenderer = {
    draw({ ctx, pane, data, range, scrollLeft, kWidth, kGap, dpr, paneWidth: _paneWidth }) {
        if (!data.length) return

        const unit = kWidth + kGap
        // 根据 pane 类型确定水平网格线数量：主图 6 条，副图 2 条
        const tickCount = pane.id === 'main' ? 6 : 2

        ctx.save()
        ctx.fillStyle = GRID_COLORS.HORIZONTAL

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

        // ========= 竖线：使用预计算的月边界，对齐到K线实体中部 ==========
        const boundaries = findMonthBoundaries(data)

        for (const idx of boundaries) {
            // 只绘制在可视范围内的边界
            if (idx < range.start || idx >= range.end || idx >= data.length) continue

            // 关键修改：加 kWidth/2 使网格线对齐到K线实体中部
            const worldX = kGap + idx * unit + kWidth / 2
            const v = createVerticalLineRect(worldX, 0, pane.height, dpr)
            if (v) ctx.fillRect(v.x, v.y, v.width, v.height)
        }

        ctx.restore()
    },
}
