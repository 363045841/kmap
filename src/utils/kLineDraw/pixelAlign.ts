/**
 * 像素对齐工具函数 - 逻辑像素空间（配合 ctx.scale(dpr) 使用）
 */

/**
 * 将逻辑坐标对齐到物理像素边界（用于矩形填充）
 */
export function roundToPhysicalPixel(value: number, dpr: number): number {
  return Math.round(value * dpr) / dpr
}

/**
 * 将逻辑坐标对齐到物理像素中心（用于 1px 线条）
 */
export function alignToPhysicalPixelCenter(value: number, dpr: number): number {
  return (Math.floor(value * dpr) + 0.5) / dpr
}

/**
 * 对齐矩形到物理像素边界
 */
export function alignRect(
  x: number,
  y: number,
  width: number,
  height: number,
  dpr: number
): { x: number; y: number; width: number; height: number } {
  const alignedX = roundToPhysicalPixel(x, dpr)
  const alignedY = roundToPhysicalPixel(y, dpr)
  const alignedEndX = roundToPhysicalPixel(x + width, dpr)
  const alignedEndY = roundToPhysicalPixel(y + height, dpr)

  return {
    x: alignedX,
    y: alignedY,
    width: Math.max(1 / dpr, alignedEndX - alignedX),
    height: Math.max(1 / dpr, alignedEndY - alignedY),
  }
}

/**
 * 创建用于绘制垂直线的矩形（1 物理像素宽）
 * 所有坐标都对齐到物理像素边界，避免亚像素模糊
 */
export function createVerticalLineRect(
  centerX: number,
  y1: number,
  y2: number,
  dpr: number
): { x: number; y: number; width: number; height: number } | null {
  if (y1 === y2) return null
  
  const top = Math.min(y1, y2)
  const bottom = Math.max(y1, y2)
  
  // 转换到物理像素空间取整，再转回逻辑像素
  const physX = Math.round(centerX * dpr)
  const physTop = Math.round(top * dpr)
  const physBottom = Math.round(bottom * dpr)
  
  return {
    x: physX / dpr,  // 对齐到物理像素边界
    y: physTop / dpr,
    width: 1 / dpr,  // 恰好 1 物理像素
    height: Math.max(1, physBottom - physTop) / dpr,
  }
}

/**
 * 创建用于绘制水平线的矩形（1 物理像素高）
 */
export function createHorizontalLineRect(
  x1: number,
  x2: number,
  centerY: number,
  dpr: number
): { x: number; y: number; width: number; height: number } | null {
  if (x1 === x2) return null
  
  const left = Math.min(x1, x2)
  const right = Math.max(x1, x2)
  
  const physLeft = Math.round(left * dpr)
  const physRight = Math.round(right * dpr)
  const physY = Math.round(centerY * dpr)
  
  return {
    x: physLeft / dpr,
    y: physY / dpr,
    width: Math.max(1, physRight - physLeft) / dpr,
    height: 1 / dpr,
  }
}