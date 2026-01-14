import type { KLineData } from '@/types/price'
import { priceToY } from '../priceToY'
import type { drawOption, PriceRange } from './kLine'
import {
    alignToPhysicalPixelCenter,
    createHorizontalLineRect,
    createVerticalLineRect,
    roundToPhysicalPixel,
} from './pixelAlign'
import { formatMonthOrYear, monthKey } from '@/utils/dateFormat'

export interface GridOption {
    /** 网格线颜色 */
    gridColor?: string
    /** 最新价线颜色 */
    lastPriceColor?: string
    /** 文本颜色 */
    textColor?: string
    /** 文字字号 */
    fontSize?: number
    /** 右侧文字 padding */
    rightTextPadding?: number
    /** 底部日期文字 padding */
    bottomTextPadding?: number

    /** 价格刻度档位数（默认 10） */
    priceTicks?: number
}

/**
 * 价格/日期网格层（绘制在平移后的坐标系：ctx 已 translate(-scrollLeft, 0)）
 * - Y轴：min/max 价格线 + 右侧价格文字
 * - X轴：日期变更处画竖线 + 底部日期文字
 * - 最新价：可视区最后一根 close 在[min,max]内则画横向虚线 + 右侧文字
 */
export function drawGridLayer(
    ctx: CanvasRenderingContext2D,
    data: KLineData[],
    option: drawOption,
    logicHeight: number,
    dpr: number,
    startIndex: number,
    endIndex: number,
    priceRange: PriceRange,
    /**
     * 右侧价格轴所在的“世界坐标X”（在 translate(-scrollLeft, 0) 之后的坐标系里）
     * 通常传入：scrollLeft + viewWidth
     */
    axisRightX: number,
    gridOpt: GridOption = {}
) {
    if (!data.length) return

    const height = logicHeight

    const wantPad = option.yPaddingPx ?? 0
    const pad = Math.max(0, Math.min(wantPad, Math.floor(height / 2) - 1))
    const paddingTop = pad
    const paddingBottom = pad

    const unit = option.kWidth + option.kGap
    const gridColor = gridOpt.gridColor ?? 'rgba(0,0,0,0.08)'
    const lastPriceColor = gridOpt.lastPriceColor ?? 'rgba(0,0,0,0.25)'
    const textColor = gridOpt.textColor ?? 'rgba(0,0,0,0.55)'
    const fontSize = gridOpt.fontSize ?? 12
    const rightTextPadding = gridOpt.rightTextPadding ?? 6
    const bottomTextPadding = gridOpt.bottomTextPadding ?? 4
    const priceTicks = Math.max(2, Math.floor(gridOpt.priceTicks ?? 10))

    const startX = option.kGap + startIndex * unit
    const endX = option.kGap + endIndex * unit

    // 价格文字固定在画布右侧“内部”，不跟随数据区域的 endX 变化
    // 注意：axisRightX 本身就是画布右边界（世界坐标），所以要向内偏移
    const rightTextX = axisRightX - rightTextPadding

    // 预留 X 轴日期文字区域高度：让 y 轴横线不要画到日期区域下面
    const xAxisTextHeight = fontSize + bottomTextPadding + 2
    const plotBottomY = Math.max(0, height - xAxisTextHeight)

    // ===== 价格坐标轴：分 N 档 =====
    ctx.save()
    ctx.fillStyle = gridColor
    ctx.font = `${fontSize}px Arial`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'right'

    const maxPrice = priceRange.maxPrice
    const minPrice = priceRange.minPrice
    const range = maxPrice - minPrice

    // range 为 0 时避免除零
    const step = range === 0 ? 0 : range / (priceTicks - 1)

    for (let t = 0; t < priceTicks; t++) {
        const price = range === 0 ? maxPrice : maxPrice - step * t
        const y = priceToY(price, maxPrice, minPrice, height, paddingTop, paddingBottom)

        // 横线不要画到日期区域之下
        if (y > plotBottomY) continue

        const hLine = createHorizontalLineRect(startX, endX, y, dpr)
        if (hLine) ctx.fillRect(hLine.x, hLine.y, hLine.width, hLine.height)

        // 右侧价格文字
        ctx.fillStyle = textColor
        ctx.fillText(
            price.toFixed(2),
            roundToPhysicalPixel(rightTextX, dpr),
            roundToPhysicalPixel(y, dpr)
        )

        // 恢复网格线颜色
        ctx.fillStyle = gridColor
    }

    // ===== 最新价虚线 =====
    const lastIndex = Math.min(endIndex - 1, data.length - 1)
    const last = data[lastIndex]
    if (last) {
        const lastPrice = last.close
        if (lastPrice >= priceRange.minPrice && lastPrice <= priceRange.maxPrice) {
            const y = priceToY(lastPrice, priceRange.maxPrice, priceRange.minPrice, height, paddingTop, paddingBottom)

            const yAligned = alignToPhysicalPixelCenter(y, dpr)
            const x1 = roundToPhysicalPixel(startX, dpr)
            const x2 = roundToPhysicalPixel(endX, dpr)

            ctx.save()
            ctx.strokeStyle = lastPriceColor
            ctx.lineWidth = 1
            ctx.setLineDash([4, 3])
            ctx.beginPath()
            ctx.moveTo(x1, yAligned)
            ctx.lineTo(x2, yAligned)
            ctx.stroke()
            ctx.setLineDash([])
            ctx.restore()

            ctx.fillStyle = lastPriceColor
            ctx.textBaseline = 'middle'
            ctx.textAlign = 'right'
            ctx.fillText(
                lastPrice.toFixed(2),
                roundToPhysicalPixel(rightTextX, dpr),
                roundToPhysicalPixel(y, dpr)
            )
        }
    }

    // ===== X轴日期分割线（按月） =====
    // 日期文字画在底部 paddingBottom 区域之下，尽量贴近底部
    // 这里的 height 是 plotHeight（绘图区高度），日期轴文字应画在 plotHeight 下面的轴区域
    // 为了不修改函数签名过多：把日期轴文字画在 plotHeight + bottomTextPadding
    const baseY = height + bottomTextPadding
    ctx.fillStyle = textColor
    ctx.textBaseline = 'bottom'
    ctx.textAlign = 'center'

    for (let i = Math.max(startIndex, 1); i < endIndex && i < data.length; i++) {
        const cur = data[i]
        const prev = data[i - 1]
        if (!cur || !prev) continue

        // “间隔一个月画”：当月份变化时画线
        if (monthKey(cur.timestamp) !== monthKey(prev.timestamp)) {
            const x = option.kGap + i * unit
            const cx = x // 分割线在该根K线的左边界
            // 竖线只画到 x 轴日期线以上（不要覆盖日期区域）
            const vRect = createVerticalLineRect(cx, 0, plotBottomY, dpr)
            if (vRect) {
                ctx.fillStyle = gridColor
                ctx.fillRect(vRect.x, vRect.y, vRect.width, vRect.height)
            }

            // 日期文字放在分割线附近
            const textX = roundToPhysicalPixel(cx + 2, dpr)
            const { text, isYear } = formatMonthOrYear(cur.timestamp)
            ctx.fillStyle = textColor
            ctx.font = `${isYear ? 'bold ' : ''}${fontSize}px Arial`
            ctx.fillText(text, textX, roundToPhysicalPixel(baseY, dpr))
        }
    }

    ctx.restore()
}
