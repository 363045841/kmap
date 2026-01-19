import type { MAFlags } from '@/core/renderers/ma'
import type { KLineData } from '@/types/price'
import { calcMAAtIndex } from '@/utils/kline/ma'
import { MA10_COLOR, MA20_COLOR, MA30_COLOR, MA5_COLOR, MA60_COLOR } from '@/utils/kLineDraw/MA'

export function drawMALegend(args: {
    ctx: CanvasRenderingContext2D
    yPaddingPx: number
    data: KLineData[]
    endIndex: number
    showMA: MAFlags
    dpr: number
}) {
    const { ctx, data, endIndex, showMA } = args
    if (!data.length) return

    const legendX = 12
    const fontSize = 12
    // 垂直居中渲染
    const legendY = (fontSize + args.yPaddingPx) / 2
    const gap = 10

    ctx.save()
    ctx.font = `${fontSize}px Arial`
    ctx.textAlign = 'left'

    const lastIndex = Math.min(endIndex - 1, data.length - 1)

    const items: Array<{ label: string; color: string; value?: number }> = []
    if (showMA.ma5) items.push({ label: 'MA5', color: MA5_COLOR, value: calcMAAtIndex(data, lastIndex, 5) })
    if (showMA.ma10) items.push({ label: 'MA10', color: MA10_COLOR, value: calcMAAtIndex(data, lastIndex, 10) })
    if (showMA.ma20) items.push({ label: 'MA20', color: MA20_COLOR, value: calcMAAtIndex(data, lastIndex, 20) })
    if (showMA.ma30) items.push({ label: 'MA30', color: MA30_COLOR, value: calcMAAtIndex(data, lastIndex, 30) })
    if (showMA.ma60) items.push({ label: 'MA60', color: MA60_COLOR, value: calcMAAtIndex(data, lastIndex, 60) })

    if (items.length > 0) {
        let x = legendX
        const y = legendY

        ctx.fillStyle = '#333'
        ctx.fillText('均线', x, y)
        x += ctx.measureText('均线').width + gap

        for (const it of items) {
            const valText = typeof it.value === 'number' ? ` ${it.value.toFixed(2)}` : ''
            const text = `${it.label}${valText}`
            ctx.fillStyle = it.color
            ctx.fillText(text, x, y)
            x += ctx.measureText(text).width + gap
        }
    }

    ctx.restore()
}
