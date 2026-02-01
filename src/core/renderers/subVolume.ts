import type { PaneRenderer } from '@/core/layout/pane'
import type { KLineData } from '@/types/price'
import { PRICE_COLORS } from '@/core/theme/colors'
import { tagLogThrottle } from '@/utils/logger'

/**
 * 副图成交量渲染器
 */
export const subVolumeRenderer: PaneRenderer = {
    draw({ ctx, pane, data, range, scrollLeft, kWidth, kGap, dpr, paneWidth: _paneWidth, kLinePositions }) {
        if (!data.length) return
        tagLogThrottle('range', range, "range")

        ctx.save()
        ctx.translate(-scrollLeft, 0)

        const { start, end } = range
        const maxVolume =
            data.slice(start, end)
                .reduce((max, e) => {
                    if (e.volume) {
                        return Math.max(max, e.volume)
                    }
                    return max
                }, 0)
        for (let i = start; i < end; i++) {
            const item = data[i]
            if (!item) continue
            const volume = item.volume
            if (!volume) continue
            const color = judgeColor(item)
            const x = kLinePositions[i - start]
            if (!x) continue
            drawVolume(ctx, x, color, volume, maxVolume, kWidth, pane.height)
        }
    }
}

/**
 * 绘制成交量柱
 * @param ctx Canvas 绘图上下文
 * @param x 横坐标
 * @param color 柱子颜色
 * @param volume 成交量
 * @param maxVolume 最大成交量
 * @param width 柱子宽度
 * @param paneHeight pane 高度
 */
function drawVolume(ctx: CanvasRenderingContext2D, x: number, color: string, volume: number, maxVolume: number, width: number, paneHeight: number) {
    const y = volumeToY(volume, maxVolume, paneHeight)
    ctx.fillStyle = color
    ctx.fillRect(x, y, width, paneHeight - y)
}

/**
 * 判断 K 线颜色
 * @param dayData K 线数据
 * @returns 颜色值
 */
function judgeColor(dayData: KLineData) {
    if (dayData.close > dayData.open) {
        return PRICE_COLORS.UP
    } else if (dayData.close < dayData.open) {
        return PRICE_COLORS.DOWN
    } else {
        return PRICE_COLORS.NEUTRAL
    }
}

/**
 * 将成交量转换为 Y 坐标
 * @param volume 成交量
 * @param maxVolume 最大成交量
 * @param paneHeight pane 高度
 * @returns Y 坐标
 */
function volumeToY(volume: number, maxVolume: number, paneHeight: number): number {
    const ratio = paneHeight / maxVolume
    return paneHeight - volume * ratio
}