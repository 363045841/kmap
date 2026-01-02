import { getKLineTrend, type kLineTrend } from '@/types/kLine'
import type { KLineData } from '@/types/price'
import { priceToY } from '../priceToY'
import { tagLog } from '../logger'

export interface drawOption {
  kWidth: number
  kGap: number
  yPaddingPx?: number
}

const UP_COLOR = 'rgba(214, 10, 34, 1)'
const DOWN_COLOR = 'rgba(3, 123, 102, 1)'

/**
 * K 线图绘制
 * @param ctx
 * @param data
 * @param option
 * @param logicHeight
 * @param dpr
 * @returns
 */
export function kLineDraw(
  ctx: CanvasRenderingContext2D,
  data: KLineData[],
  option: drawOption,
  logicHeight: number,
  dpr: number = 1,
) {
  if (data.length === 0) return

  const height = logicHeight

  // 1) 处理上下留白像素
  const wantPad = option.yPaddingPx ?? 0
  // 防止留白过大：最多只能用掉高度的一半（否则 viewHeight<=0）
  const pad = Math.max(0, Math.min(wantPad, Math.floor(height / 2) - 1))
  const paddingTop = pad
  const paddingBottom = pad

  // 2) 价格范围（不再扩展，用像素留白来做空间）
  const maxPrice = data.reduce((acc, cur) => Math.max(acc, cur.high), -Infinity)
  const minPrice = data.reduce((acc, cur) => Math.min(acc, cur.low), Infinity)

  ctx.lineWidth = 1 / dpr

  let rectX = option.kGap

  for (let i = 0; i < data.length; i++) {
    const e = data[i]
    if (!e) continue

    const highY = priceToY(e.high, maxPrice, minPrice, height, paddingTop, paddingBottom)
    const lowY = priceToY(e.low, maxPrice, minPrice, height, paddingTop, paddingBottom)
    const openY = priceToY(e.open, maxPrice, minPrice, height, paddingTop, paddingBottom)
    const closeY = priceToY(e.close, maxPrice, minPrice, height, paddingTop, paddingBottom)

    const rectY = Math.min(openY, closeY)
    const rectHeight = Math.max(Math.abs(openY - closeY), 2 / dpr)

    const trend: kLineTrend = getKLineTrend(e)

    const color = trend === 'up' ? UP_COLOR : DOWN_COLOR
    // 实体
    ctx.fillStyle = color
    ctx.fillRect(rectX, rectY, option.kWidth, rectHeight)

    // 影线
    ctx.strokeStyle = color
    ctx.lineWidth = 3 / dpr
    const cx = rectX + option.kWidth / 2

    ctx.beginPath()
    ctx.moveTo(cx, highY)
    ctx.lineTo(cx, rectY)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx, rectY + rectHeight)
    ctx.lineTo(cx, lowY)
    ctx.stroke()

    rectX += option.kWidth + option.kGap
  }
}
