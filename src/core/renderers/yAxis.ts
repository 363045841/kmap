import type { PaneRenderer } from '@/core/layout/pane'
import { drawPriceAxis } from '@/utils/kLineDraw/axis'

/**
 * 右侧轴渲染：每个 pane 各画一段。
 * 说明：目前复用旧的 axis.ts（后续再迁 core 化）。
 */
export function createYAxisRenderer(opts: {
    axisX: number
    axisWidth: number
    yPaddingPx: number
    ticks?: number
}): PaneRenderer {
    return {
        draw({ ctx, pane, dpr }) {
            const ticks = typeof opts.ticks === 'number' ? opts.ticks : Math.max(2, Math.min(8, Math.round(pane.height / 80)))
            drawPriceAxis(ctx, {
                x: opts.axisX,
                y: pane.top,
                width: opts.axisWidth,
                height: pane.height,
                priceRange: pane.priceRange,
                yPaddingPx: opts.yPaddingPx,
                dpr,
                ticks,
                drawLeftBorder: false, // 不绘制左侧边界竖线
                drawTickLines: false, // 不绘制刻度短线
            })
        },
    }
}
