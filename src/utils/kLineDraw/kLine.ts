import { getKLineTrend, type kLineTrend } from '@/types/kLine'
import type { KLineData } from '@/types/price'
import { priceToY } from '../priceToY'
import {
  roundToPhysicalPixel,
  alignRect,
  createVerticalLineRect,
  createHorizontalLineRect,
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
  ctx.fillStyle = TEXT_COLORS.NEUTRAL
  ctx.fillText(
    text,
    roundToPhysicalPixel(x + lineLength + padding, dpr),
    roundToPhysicalPixel(y, dpr)
  )
}

/**
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

    // 对齐矩形到物理像素
    const alignedRect = alignRect(rectX, rawRectY, option.kWidth, rawRectHeight, dpr)

    const trend: kLineTrend = getKLineTrend(e)
    const color = trend === 'up' ? PRICE_COLORS.UP : PRICE_COLORS.DOWN

    // ===== 绘制实体 =====
    ctx.fillStyle = color
    ctx.fillRect(alignedRect.x, alignedRect.y, alignedRect.width, alignedRect.height)

    // ===== 绘制影线（使用填充矩形，固定 1 物理像素宽）=====
    const cx = rectX + option.kWidth / 2  // 影线中心 X（逻辑像素）

    // 实体边界
    const bodyTop = alignedRect.y
    const bodyBottom = alignedRect.y + alignedRect.height

    // 用实际价格判断是否存在影线
    const bodyHigh = Math.max(e.open, e.close)
    const bodyLow = Math.min(e.open, e.close)

    // 设置影线颜色（重要！）
    ctx.fillStyle = color

    // 上影线
    if (e.high > bodyHigh) {
      const wickRect = createVerticalLineRect(cx, highY, bodyTop, dpr)
      if (wickRect) {
        ctx.fillRect(wickRect.x, wickRect.y, wickRect.width, wickRect.height)
      }
    }

    // 下影线
    if (e.low < bodyLow) {
      const wickRect = createVerticalLineRect(cx, bodyBottom, lowY, dpr)
      if (wickRect) {
        ctx.fillRect(wickRect.x, wickRect.y, wickRect.width, wickRect.height)
      }
    }

    // 绘制最高价标记
    if (i === maxPriceIndex) {
      drawPriceMarker(ctx, cx, highY, visibleMaxPrice, dpr)
    }

    // 绘制最低价标记
    if (i === minPriceIndex) {
      drawPriceMarker(ctx, cx, lowY, visibleMinPrice, dpr)
    }
  }
}
