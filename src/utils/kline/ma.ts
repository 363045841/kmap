import type { KLineData } from '@/types/price'

export function calcMAAtIndex(
    data: KLineData[],
    index: number,
    period: number
): number | undefined {
    if (index < period - 1) return undefined
    let sum = 0
    for (let j = 0; j < period; j++) {
        const e = data[index - j]
        if (!e) return undefined
        sum += e.close
    }
    return sum / period
}

