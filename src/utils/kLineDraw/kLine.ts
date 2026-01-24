import { getKLineTrend, type kLineTrend } from '@/types/kLine'
import type { KLineData } from '@/types/price'
import { priceToY } from '../priceToY'
import {
  roundToPhysicalPixel,
  alignRect,
  createVerticalLineRect,
  createHorizontalLineRect,
  createAlignedKLine,
} from '@/core/draw/pixelAlign'
import { PRICE_COLORS, TEXT_COLORS } from '@/core/theme/colors'

export interface drawOption {
  kWidth: number
  kGap: number
  yPaddingPx?: number
}

export interface PriceRange {
  maxPrice: number
  minPrice: number
}

/**
 * 绘制价格标记
 */
function drawPriceMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  price: number,
  dpr: number
) {
  const text = price.toFixed(2)
  const padding = 4
  const lineLength = 30
  const dotRadius = 2

  // 使用填充矩形绘制水平引导线
  const lineRect = createHorizontalLineRect(x, x + lineLength, y, dpr)
  if (lineRect) {
    ctx.fillStyle = TEXT_COLORS.WEAK
    ctx.fillRect(lineRect.x, lineRect.y, lineRect.width, lineRect.height)
  }

  // 绘制线末小圆点
  const endX = roundToPhysicalPixel(x + lineLength, dpr)
  const alignedY = roundToPhysicalPixel(y, dpr)
  ctx.fillStyle = TEXT_COLORS.WEAK
  ctx.beginPath()
  ctx.arc(endX, alignedY, dotRadius, 0, Math.PI * 2)
  ctx.fill()

  // 绘制价格文字
  ctx.font = '12px Arial'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillStyle = TEXT_COLORS.PRIMARY
  ctx.fillText(
    text,
    roundToPhysicalPixel(x + lineLength + padding, dpr),
    roundToPhysicalPixel(y, dpr)
  )
}

/**
 * @deprecated
 * K线图绘制 - 影线固定为 1 物理像素宽
 */
export function kLineDraw(
  ctx: CanvasRenderingContext2D,
  data: KLineData[],
  option: drawOption,
  logicHeight: number,
  dpr: number = 1,
  startIndex: number = 0,
  endIndex: number = data.length,
  priceRange?: PriceRange
) {
  if (data.length === 0) return

  const height = logicHeight

  const wantPad = option.yPaddingPx ?? 0
  const pad = Math.max(0, Math.min(wantPad, Math.floor(height / 2) - 1))
  const paddingTop = pad
  const paddingBottom = pad

  const unit = option.kWidth + option.kGap

  // 计算价格范围和极值索引
  let visibleMaxPrice: number
  let visibleMinPrice: number
  let maxPriceIndex = startIndex
  let minPriceIndex = startIndex

  if (priceRange) {
    visibleMaxPrice = priceRange.maxPrice
    visibleMinPrice = priceRange.minPrice
    for (let i = startIndex; i < endIndex && i < data.length; i++) {
      const e = data[i]
      if (!e) continue
      if (e.high >= visibleMaxPrice) {
        visibleMaxPrice = e.high
        maxPriceIndex = i
      }
      if (e.low <= visibleMinPrice) {
        visibleMinPrice = e.low
        minPriceIndex = i
      }
    }
  } else {
    visibleMaxPrice = -Infinity
    visibleMinPrice = Infinity
    for (let i = startIndex; i < endIndex && i < data.length; i++) {
      const e = data[i]
      if (!e) continue
      if (e.high > visibleMaxPrice) {
        visibleMaxPrice = e.high
        maxPriceIndex = i
      }
      if (e.low < visibleMinPrice) {
        visibleMinPrice = e.low
        minPriceIndex = i
      }
    }
  }

  if (!Number.isFinite(visibleMaxPrice) || !Number.isFinite(visibleMinPrice)) return

  for (let i = startIndex; i < endIndex && i < data.length; i++) {
    const e = data[i]
    if (!e) continue

    // 计算逻辑像素 Y 坐标
    const highY = priceToY(e.high, visibleMaxPrice, visibleMinPrice, height, paddingTop, paddingBottom)
    const lowY = priceToY(e.low, visibleMaxPrice, visibleMinPrice, height, paddingTop, paddingBottom)
    const openY = priceToY(e.open, visibleMaxPrice, visibleMinPrice, height, paddingTop, paddingBottom)
    const closeY = priceToY(e.close, visibleMaxPrice, visibleMinPrice, height, paddingTop, paddingBottom)

    // 计算逻辑像素 X 坐标
    const rectX = option.kGap + i * unit
    const rawRectY = Math.min(openY, closeY)
    const rawRectHeight = Math.max(Math.abs(openY - closeY), 1)

    // ===== 使用新的统一对齐策略 =====
    const aligned = createAlignedKLine(rectX, rawRectY, option.kWidth, rawRectHeight, dpr)

    const trend: kLineTrend = getKLineTrend(e)
    const color = trend === 'up' ? PRICE_COLORS.UP : PRICE_COLORS.DOWN

    // ===== 绘制实体 =====
    ctx.fillStyle = color
    ctx.fillRect(aligned.bodyRect.x, aligned.bodyRect.y, aligned.bodyRect.width, aligned.bodyRect.height)

    // ===== 绘制影线 =====
    // 实体边界
    const bodyTop = aligned.bodyRect.y
    const bodyBottom = aligned.bodyRect.y + aligned.bodyRect.height

    // 用实际价格判断是否存在影线
    const bodyHigh = Math.max(e.open, e.close)
    const bodyLow = Math.min(e.open, e.close)

    // 设置影线颜色
    ctx.fillStyle = color

    // 绘制上影线（使用统一对齐后的影线位置）
    if (e.high > bodyHigh) {
      const wickTopY = Math.min(highY, bodyTop)
      const wickBottomY = Math.max(highY, bodyTop)
      const physTop = Math.round(wickTopY * dpr)
      const physBottom = Math.round(wickBottomY * dpr)

      ctx.fillRect(
        aligned.wickRect.x,
        physTop / dpr,
        aligned.wickRect.width,
        Math.max(1, physBottom - physTop) / dpr
      )
    }

    // 绘制下影线
    if (e.low < bodyLow) {
      const wickTopY = Math.min(lowY, bodyBottom)
      const wickBottomY = Math.max(lowY, bodyBottom)
      const physTop = Math.round(wickTopY * dpr)
      const physBottom = Math.round(wickBottomY * dpr)

      ctx.fillRect(
        aligned.wickRect.x,
        physTop / dpr,
        aligned.wickRect.width,
        Math.max(1, physBottom - physTop) / dpr
      )
    }

    // 绘制最高价标记（使用影线的物理位置）
    if (i === maxPriceIndex) {
      const markerX = aligned.physWickX / dpr
      drawPriceMarker(ctx, markerX, highY, visibleMaxPrice, dpr)
    }

    // 绘制最低价标记
    if (i === minPriceIndex) {
      const markerX = aligned.physWickX / dpr
      drawPriceMarker(ctx, markerX, lowY, visibleMinPrice, dpr)
    }
  }
}
