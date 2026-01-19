import type { PaneRenderer } from '@/core/layout/pane'
import { drawGridLayer } from '@/utils/kLineDraw/grid'

/**
 * 网格渲染：按 pane 的局部坐标绘制（ctx 已 translate 到 pane.top）
 * 复用旧的 drawGridLayer（内部要求 ctx 已 translate(-scrollLeft,0)）。
 */
export const GridRenderer: PaneRenderer = {
    draw({ ctx, pane, data, range, scrollLeft, kWidth, kGap, dpr, paneWidth: _paneWidth }) {
        ctx.save()
        ctx.translate(-scrollLeft, 0)
        drawGridLayer(
            ctx,
            data,
            { kWidth, kGap, yPaddingPx: 0 },
            pane.height,
            dpr,
            range.start,
            range.end,
            pane.priceRange,
            // 右侧轴的 worldX（在 translate(-scrollLeft,0) 之后）
            scrollLeft + (ctx.canvas.width / dpr),
        )
        ctx.restore()
    },
}
