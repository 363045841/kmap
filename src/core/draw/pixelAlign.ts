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
 * 所有坐标都对齐到物理像素边界，避免亚像素模糊
 * 
 * @param x1 - 水平线起始点的 X 坐标（逻辑像素）
 * @param x2 - 水平线结束点的 X 坐标（逻辑像素）
 * @param centerY - 水平线中心 Y 坐标（逻辑像素）
 * @param dpr - 设备像素比，用于将逻辑像素转换为物理像素
 * @returns 返回对齐到物理像素的矩形信息，如果 x1 和 x2 相等则返回 null
 *          返回对象包含 x, y, width, height 属性，单位均为逻辑像素
 *          高度(height)始终为 1/dpr（即 1 物理像素的高度）
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

/**
 * 创建对齐的K线实体和影线（TradingView级别稳定）
 * 
 * 核心原则：统一在物理像素空间计算，避免二次round和浮点累积误差
 * 
 * 修复的问题：
 * - ✅ 细节A：避免二次round，直接在物理空间一次计算
 * - ✅ 细节B：先决定宽度，再推右边界，避免round差异
 * - ✅ 细节C：使用fillRect绘制1物理像素宽矩形（当前实现正确）
 * - ✅ 细节D改进1：直接用整数px累加，避免浮点误差
 * - ✅ 细节D改进2：全局统一的奇数化kWidthPx
 * 
 * 使用说明：
 * - 调用方应确保 leftPx 是通过整数步进计算的：leftPx = startXPx + i * unitPx
 * - widthPx 应该是全局统一的奇数化值
 * - 这样所有K线的物理位置都是整数，无浮点误差
 * 
 * @param rectX - 实体左边界 X 坐标（逻辑像素，应来自整数步进）
 * @param rectY - 实体顶部 Y 坐标（逻辑像素）
 * @param kWidth - 实体宽度（逻辑像素）
 * @param height - 实体高度（逻辑像素）
 * @param dpr - 设备像素比
 * @returns 返回对齐后的实体和影线信息
 */
export function createAlignedKLine(
    rectX: number,
    rectY: number,
    kWidth: number,
    height: number,
    dpr: number
): {
    bodyRect: { x: number; y: number; width: number; height: number }
    physBodyLeft: number
    physBodyRight: number
    physBodyWidth: number
    physBodyCenter: number
    physWickX: number
    wickRect: { x: number; width: number }
    isPerfectlyAligned: boolean  // 影线是否完美等分（物理实体宽度为奇数）
} {
    // ============================================================
    // 1. 统一在物理像素空间计算，避免二次round（修复细节A）
    // ============================================================
    
    // 1.1 左边界：round到整数像素列
    const leftPx = Math.round(rectX * dpr)
    
    // 1.2 宽度：round到整数，并确保是奇数（zoomAt已保证，但这里也强制）
    let widthPx = Math.round(kWidth * dpr)
    if (widthPx % 2 === 0) {
        widthPx += 1  // 确保奇数，让影线完美居中
    }
    widthPx = Math.max(1, widthPx)  // 最小1px
    
    // 1.3 右边界：由左边界+宽度决定（修复细节B：避免round差异）
    const rightPx = leftPx + widthPx
    
    // 1.4 物理宽度：严格等于widthPx，无round差异
    const physBodyWidth = widthPx
    
    // ============================================================
    // 2. Y轴对齐（保持原有逻辑）
    // ============================================================
    
    const topPx = Math.round(rectY * dpr)
    const bottomPx = Math.round((rectY + height) * dpr)
    const heightPx = Math.max(1, bottomPx - topPx)
    
    // ============================================================
    // 3. 计算物理中心和影线位置（优化：更直观的语义）
    // ============================================================
    
    // 3.1 影线位置：leftPx + (widthPx - 1) / 2
    // 语义：影线落在实体中间那一列像素（因为widthPx是奇数，(widthPx-1)/2是整数）
    const physWickX = leftPx + (widthPx - 1) / 2
    
    // 3.2 物理中心（与影线位置一致）
    const physBodyCenter = physWickX
    
    // 3.3 判断是否完美等分
    const isPerfectlyAligned = physBodyWidth % 2 === 1
    
    // ============================================================
    // 4. 返回逻辑像素坐标（转回逻辑空间供fillRect使用）
    // ============================================================
    
    return {
        bodyRect: {
            x: leftPx / dpr,
            y: topPx / dpr,
            width: widthPx / dpr,
            height: heightPx / dpr,
        },
        physBodyLeft: leftPx,
        physBodyRight: rightPx,
        physBodyWidth,
        physBodyCenter,
        physWickX,
        wickRect: {
            x: physWickX / dpr,
            width: 1 / dpr,  // 1物理像素宽
        },
        isPerfectlyAligned,
    }
}

/**
 * 创建对齐的K线实体和影线（TradingView级别稳定 - 物理像素直接版）
 * 
 * 改进：直接使用物理像素的leftPx和widthPx，避免重复round和浮点误差
 * 
 * 使用场景：
 * - 调用方已经计算好物理像素的leftPx和widthPx
 * - leftPx 是通过整数步进计算的：leftPx = startXPx + i * unitPx
 * - widthPx 是全局统一的奇数化值
 * - 这样"整数步进"就变成严格意义的整数，不受浮点误差影响
 * 
 * @param leftPx - 实体左边界物理像素坐标（整数，来自整数步进）
 * @param rectY - 实体顶部 Y 坐标（逻辑像素）
 * @param widthPx - 实体宽度物理像素（奇数，全局统一）
 * @param height - 实体高度（逻辑像素）
 * @param dpr - 设备像素比
 * @returns 返回对齐后的实体和影线信息
 */
export function createAlignedKLineFromPx(
    leftPx: number,
    rectY: number,
    widthPx: number,
    height: number,
    dpr: number
): {
    bodyRect: { x: number; y: number; width: number; height: number }
    physBodyLeft: number
    physBodyRight: number
    physBodyWidth: number
    physBodyCenter: number
    physWickX: number
    wickRect: { x: number; width: number }
    isPerfectlyAligned: boolean
} {
    // ============================================================
    // 1. 物理像素空间（leftPx和widthPx已经是整数，无需round）
    // ============================================================
    
    // 1.1 左边界：直接使用传入的整数（改进1：避免浮点乘除）
    // 1.2 宽度：直接使用传入的奇数（改进2：全局统一）
    // 1.3 右边界：由左边界+宽度决定
    const rightPx = leftPx + widthPx
    const physBodyWidth = widthPx
    
    // ============================================================
    // 2. Y轴对齐（保持原有逻辑）
    // ============================================================
    
    const topPx = Math.round(rectY * dpr)
    const bottomPx = Math.round((rectY + height) * dpr)
    const heightPx = Math.max(1, bottomPx - topPx)
    
    // ============================================================
    // 3. 计算影线位置（优化：更直观的语义）
    // ============================================================
    
    // 影线位置：leftPx + (widthPx - 1) / 2
    // 语义：影线落在实体中间那一列像素（因为widthPx是奇数，(widthPx-1)/2是整数）
    const physWickX = leftPx + (widthPx - 1) / 2
    const physBodyCenter = physWickX
    
    // 判断是否完美等分
    const isPerfectlyAligned = physBodyWidth % 2 === 1
    
    // ============================================================
    // 4. 返回逻辑像素坐标（只在最后除回去）
    // ============================================================
    
    return {
        bodyRect: {
            x: leftPx / dpr,
            y: topPx / dpr,
            width: widthPx / dpr,
            height: heightPx / dpr,
        },
        physBodyLeft: leftPx,
        physBodyRight: rightPx,
        physBodyWidth,
        physBodyCenter,
        physWickX,
        wickRect: {
            x: physWickX / dpr,
            width: 1 / dpr,
        },
        isPerfectlyAligned,
    }
}
