export function priceToY(
    price: number,
    maxPrice: number,
    minPrice: number,
    canvasHeight: number,
    paddingTop: number,
    paddingBottom: number,
): number {
    const range = maxPrice - minPrice || 1
    const ratio = (price - minPrice) / range

    const viewHeight = Math.max(1, canvasHeight - paddingTop - paddingBottom)
    return paddingTop + viewHeight * (1 - ratio)
}