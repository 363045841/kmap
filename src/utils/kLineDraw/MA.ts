import type { KLineData } from '@/types/price'
import { priceToY } from '../priceToY'
import type { drawOption, PriceRange } from './kLine'
import { alignToPhysicalPixelCenter } from './pixelAlign'

const MA5_COLOR = 'rgba(255, 193, 37, 1)'
const MA10_COLOR = 'rgba(190, 131, 12, 1)'
const MA20_COLOR = 'rgba(69, 112, 249, 1)'

/**
 * 通用 MA 线绘制函数 - 逻辑像素坐标系
 */
function drawMALine(
  ctx: CanvasRenderingContext2D,
  data: KLineData[],
  option: drawOption,
  logicHeight: number,
  dpr: number,
  startIndex: number,
  endIndex: number,
  priceRange: PriceRange | undefined,
  period: number,
  color: string
) {
  if (data.length < period) return

  const height = logicHeight

  const wantPad = option.yPaddingPx ?? 0
  const pad = Math.max(0, Math.min(wantPad, Math.floor(height / 2) - 1))
  const paddingTop = pad
  const paddingBottom = pad

  // 计算价格范围
  let maxPrice: number
  let minPrice: number

  if (priceRange) {
    maxPrice = priceRange.maxPrice
    minPrice = priceRange.minPrice
  } else {
    maxPrice = -Infinity
    minPrice = Infinity
    for (let i = startIndex; i < endIndex && i < data.length; i++) {
      const e = data[i]
      if (e.high > maxPrice) maxPrice = e.high
      if (e.low < minPrice) minPrice = e.low
    }
  }

  if (!Number.isFinite(maxPrice) || !Number.isFinite(minPrice)) return

  const unit = option.kWidth + option.kGap

  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()

  let isFirst = true
  const drawStart = Math.max(startIndex, period - 1)

  for (let i = drawStart; i < endIndex && i < data.length; i++) {
    // 计算 MA 值
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close
    }
    const maValue = sum / period

    // 计算逻辑像素坐标并对齐
    const logicX = option.kGap + i * unit + option.kWidth / 2
    const logicY = priceToY(maValue, maxPrice, minPrice, height, paddingTop, paddingBottom)

    const x = alignToPhysicalPixelCenter(logicX, dpr)
    const y = alignToPhysicalPixelCenter(logicY, dpr)

    if (isFirst) {
      ctx.moveTo(x, y)
      isFirst = false
    } else {
      ctx.lineTo(x, y)
    }
  }

  ctx.stroke()
}

export function drawMA5Line(
  ctx: CanvasRenderingContext2D,
  data: KLineData[],
  option: drawOption,
  logicHeight: number,
  dpr: number = 1,
  startIndex: number = 0,
  endIndex: number = data.length,
  priceRange?: PriceRange
) {
  drawMALine(ctx, data, option, logicHeight, dpr, startIndex, endIndex, priceRange, 5, MA5_COLOR)
}

export function drawMA10Line(
  ctx: CanvasRenderingContext2D,
  data: KLineData[],
  option: drawOption,
  logicHeight: number,
  dpr: number = 1,
  startIndex: number = 0,
  endIndex: number = data.length,
  priceRange?: PriceRange
) {
  drawMALine(ctx, data, option, logicHeight, dpr, startIndex, endIndex, priceRange, 10, MA10_COLOR)
}

export function drawMA20Line(
  ctx: CanvasRenderingContext2D,
  data: KLineData[],
  option: drawOption,
  logicHeight: number,
  dpr: number = 1,
  startIndex: number = 0,
  endIndex: number = data.length,
  priceRange?: PriceRange
) {
  drawMALine(ctx, data, option, logicHeight, dpr, startIndex, endIndex, priceRange, 20, MA20_COLOR)
}