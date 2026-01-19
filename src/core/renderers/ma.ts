import type { PaneRenderer } from '@/core/layout/pane'
import { drawMA10Line, drawMA20Line, drawMA5Line, drawMA30Line, drawMA60Line } from '@/utils/kLineDraw/MA'

export type MAFlags = {
    ma5?: boolean
    ma10?: boolean
    ma20?: boolean
    ma30?: boolean
    ma60?: boolean
}

/**
 * MA 渲染：复用现有 drawMA*Line（world 坐标绘制：需 translate(-scrollLeft,0)）。
 * 注意：drawMA*Line 内部使用 priceToY + priceRange，因此可直接用 pane.priceRange。
 */
export function createMARenderer(showMA: MAFlags): PaneRenderer {
    return {
        draw({ ctx, pane, data, range, scrollLeft, kWidth, kGap, dpr, paneWidth: _paneWidth }) {
            ctx.save()
            ctx.translate(-scrollLeft, 0)

            const opt = { kWidth, kGap, yPaddingPx: 0 }
            if (showMA.ma5) drawMA5Line(ctx, data, opt, pane.height, dpr, range.start, range.end, pane.priceRange)
            if (showMA.ma10) drawMA10Line(ctx, data, opt, pane.height, dpr, range.start, range.end, pane.priceRange)
            if (showMA.ma20) drawMA20Line(ctx, data, opt, pane.height, dpr, range.start, range.end, pane.priceRange)
            if (showMA.ma30) drawMA30Line(ctx, data, opt, pane.height, dpr, range.start, range.end, pane.priceRange)
            if (showMA.ma60) drawMA60Line(ctx, data, opt, pane.height, dpr, range.start, range.end, pane.priceRange)

            ctx.restore()
        },
    }
}
