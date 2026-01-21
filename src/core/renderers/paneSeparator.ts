import { createHorizontalLineRect } from '@/core/draw/pixelAlign'
import { BORDER_COLORS } from '@/core/theme/colors'

export function drawPaneSeparators(args: {
    ctx: CanvasRenderingContext2D
    dpr: number
    plotWidth: number
    panes: Array<{ top: number; height: number }>
    color?: string
}) {
    const { ctx, dpr, plotWidth, panes, color = BORDER_COLORS.SEPARATOR } = args
    if (panes.length <= 1) return

    ctx.save()
    ctx.fillStyle = color
    for (let i = 1; i < panes.length; i++) {
        const p = panes[i]
        if (!p) continue
        const y = p.top
        const h = createHorizontalLineRect(0, plotWidth, y, dpr)
        if (h) ctx.fillRect(h.x, h.y, h.width, h.height)
    }
    ctx.restore()
}
