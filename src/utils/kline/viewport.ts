import type { KLineData } from '@/types/price'

export type PriceRange = { maxPrice: number; minPrice: number }

export function getVisibleRange(
    scrollLeft: number,
    viewWidth: number,
    kWidth: number,
    kGap: number,
    totalDataCount: number
): { start: number; end: number } {
    const unit = kWidth + kGap
    const start = Math.max(0, Math.floor(scrollLeft / unit) - 1)
    const end = Math.min(totalDataCount, Math.ceil((scrollLeft + viewWidth) / unit) + 1)
    return { start, end }
}

export function getVisiblePriceRange(
    data: KLineData[],
    startIndex: number,
    endIndex: number
): PriceRange {
    let maxPrice = -Infinity
    let minPrice = Infinity

    for (let i = startIndex; i < endIndex && i < data.length; i++) {
        const e = data[i]
        if (!e) continue
        if (e.high > maxPrice) maxPrice = e.high
        if (e.low < minPrice) minPrice = e.low
    }

    if (!Number.isFinite(maxPrice) || !Number.isFinite(minPrice)) {
        return { maxPrice: 100, minPrice: 0 }
    }

    return { maxPrice, minPrice }
}

