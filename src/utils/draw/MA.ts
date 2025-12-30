import type { KLineData } from "@/types/price";
import type { drawOption } from "./kLine";
import { priceToY } from "../priceToY";

/**
 * 计算 MA x 均线价格（输出长度 n-x+1，对齐到第 x 根K线）
 */
function calcMAx(data: KLineData[], x: number): number[] {
    const arr = [...data].sort((a, b) => a.timestamp - b.timestamp);
    const n = arr.length;
    if (x <= 0) throw new Error("x must be > 0");
    if (n < x) return [];

    let windowSum = 0;
    for (let i = 0; i < x; i++) windowSum += arr[i]!.close;

    const out: number[] = new Array(n - x + 1);
    out[0] = windowSum / x;

    for (let i = x; i < n; i++) {
        windowSum += arr[i]!.close - arr[i - x]!.close;
        out[i - x + 1] = windowSum / x;
    }
    return out;
}

function drawMALine(
    ctx: CanvasRenderingContext2D,
    data: KLineData[],
    option: drawOption,
    logicHeight: number,
    period: number,
    color: string,
    dpr: number = 1
) {
    if (data.length === 0) return;

    const arr = [...data].sort((a, b) => a.timestamp - b.timestamp);
    const ma = calcMAx(arr, period);
    if (ma.length === 0) return;

    // padding（和 kLineDraw 保持一致）
    const height = logicHeight;
    const wantPad = option.yPaddingPx ?? 0;
    const pad = Math.max(0, Math.min(wantPad, Math.floor(height / 2) - 1));
    const paddingTop = pad;
    const paddingBottom = pad;

    // 全局价格范围（和K线对齐）
    const maxPrice = arr.reduce((acc, cur) => Math.max(acc, cur.high), -Infinity);
    const minPrice = arr.reduce((acc, cur) => Math.min(acc, cur.low), Infinity);
    if (!Number.isFinite(maxPrice) || !Number.isFinite(minPrice) || maxPrice <= minPrice) return;

    // 先转 y 数组
    const yPoints: number[] = new Array(ma.length);
    for (let i = 0; i < ma.length; i++) {
        yPoints[i] = priceToY(ma[i]!, maxPrice, minPrice, height, paddingTop, paddingBottom);
    }

    // 再绘制
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 / dpr;
    ctx.beginPath();

    let started = false;

    for (let i = 0; i < yPoints.length; i++) {
        const y = yPoints[i];
        if (!Number.isFinite(y)) continue;

        // MA 第 i 个点对齐到 K 线索引 i + (period - 1)
        const kIndex = i + (period - 1);
        const rectX = option.kGap + kIndex * (option.kWidth + option.kGap);
        const x = rectX + option.kWidth / 2;

        if (!started) {
            ctx.moveTo(x, y);
            started = true;
        } else {
            ctx.lineTo(x, y);
        }
    }

    if (started) ctx.stroke();
}

// --- 具体 MA10 / MA20 ---

export function drawMA10Line(
    ctx: CanvasRenderingContext2D,
    data: KLineData[],
    option: drawOption,
    logicHeight: number,
    dpr: number = 1
) {
    // 颜色你可以自行调整
    drawMALine(ctx, data, option, logicHeight, 10, "rgba(190, 131, 12, 1)", dpr);
}

export function drawMA20Line(
    ctx: CanvasRenderingContext2D,
    data: KLineData[],
    option: drawOption,
    logicHeight: number,
    dpr: number = 1
) {
    drawMALine(ctx, data, option, logicHeight, 20, "rgba(69, 112, 249, 1)", dpr);
}

export function drawMA5Line(
    ctx: CanvasRenderingContext2D,
    data: KLineData[],
    option: drawOption,
    logicHeight: number,
    dpr: number = 1,
) {
    drawMALine(ctx, data, option, logicHeight, 5, "rgba(251, 186, 62, 1)", dpr);
}