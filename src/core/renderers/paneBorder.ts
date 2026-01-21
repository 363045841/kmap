import { alignToPhysicalPixelCenter } from '@/core/draw/pixelAlign'
import { BORDER_COLORS } from '@/core/theme/colors'

export function drawPaneBorders(args: {
    ctx: CanvasRenderingContext2D
    dpr: number
    width: number
    panes: Array<{ top: number; height: number }>
    color?: string
    omitOuterTop?: boolean
    omitOuterRight?: boolean
    omitOuterBottom?: boolean
    omitOuterLeft?: boolean
}) {
    const {
        ctx,
        dpr,
        width,
        panes,
        color = BORDER_COLORS.DARK,
        omitOuterTop = false,
        omitOuterRight = false,
        omitOuterBottom = false,
        omitOuterLeft = false,
    } = args
    if (!panes.length) return

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 20

    const x1 = alignToPhysicalPixelCenter(0, dpr)
    const x2 = alignToPhysicalPixelCenter(width, dpr)

    // 计算外边界（用于选择性忽略）
    let outerTop = Infinity
    let outerBottom = -Infinity
    for (const p of panes) {
        outerTop = Math.min(outerTop, p.top)
        outerBottom = Math.max(outerBottom, p.top + p.height)
    }
    outerTop = Number.isFinite(outerTop) ? outerTop : 0
    outerBottom = Number.isFinite(outerBottom) ? outerBottom : 0

    for (const p of panes) {
        const y1 = alignToPhysicalPixelCenter(p.top, dpr)
        const y2 = alignToPhysicalPixelCenter(p.top + p.height, dpr)

        const isOuterTop = Math.abs(p.top - outerTop) < 1e-6
        const isOuterBottom = Math.abs(p.top + p.height - outerBottom) < 1e-6

        ctx.beginPath()
        // 上
        if (!(omitOuterTop && isOuterTop)) {
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y1)
        }
        // 右
        if (!omitOuterRight) {
            ctx.moveTo(x2, y1)
            ctx.lineTo(x2, y2)
        }
        // 下
        if (!(omitOuterBottom && isOuterBottom)) {
            ctx.moveTo(x1, y2)
            ctx.lineTo(x2, y2)
        }
        // 左
        if (!omitOuterLeft) {
            ctx.moveTo(x1, y1)
            ctx.lineTo(x1, y2)
        }

        ctx.stroke()
    }

    ctx.restore()
}
