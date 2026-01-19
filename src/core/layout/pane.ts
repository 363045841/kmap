import type { KLineData } from '@/types/price'
import { getVisiblePriceRange } from '@/core/viewport/viewport'
import type { PriceRange } from '@/core/scale/price'
import { PriceScale } from '@/core/scale/priceScale'

export type VisibleRange = { start: number; end: number }

/**
 * Pane 级渲染器接口：在单个 pane 的坐标系中绘制内容。
 *
 * 约定：
 * - 调用前 Chart 已经对 `ctx` 做了 `translate(0, pane.top)`，因此 y=0 对应 pane 顶部。
 * - 如需随滚动的 world 坐标，需要 renderer 内部执行 `ctx.translate(-scrollLeft, 0)`。
 */
export interface PaneRenderer {
    draw(args: {
        ctx: CanvasRenderingContext2D
        pane: Pane
        data: KLineData[]
        range: VisibleRange
        scrollLeft: number
        kWidth: number
        kGap: number
        dpr: number
        paneWidth: number
    }): void
}

/**
 * Pane：代表一个“窗口区域”（主图 / 副图）。
 *
 * 负责：
 * - 记录自身布局（top/height）
 * - 维护可视价格范围（priceRange）
 * - 拥有独立的 Y 轴缩放器（PriceScale）
 * - 保存一组渲染器（renderers），在 Chart.draw 中按顺序执行。
 */
export class Pane {
    readonly id: string
    top = 0
    height = 0

    /** 当前 pane 的可视价格范围（用于右侧轴、以及渲染器内部） */
    priceRange: PriceRange = { maxPrice: 100, minPrice: 0 }

    /** pane 独立 Y 轴 */
    readonly yAxis = new PriceScale()

    /** 该 pane 的渲染器列表 */
    readonly renderers: PaneRenderer[] = []

    /**
     * @param id pane 标识符（例如 'main'、'sub'），用于在 Chart/Interaction 中识别 pane。
     */
    constructor(id: string) {
        this.id = id
    }

    /**
     * 设置 pane 的垂直布局。
     *
     * @param top    相对 plotCanvas 顶部的偏移（逻辑像素）
     * @param height pane 高度（逻辑像素）
     */
    setLayout(top: number, height: number) {
        this.top = top
        this.height = Math.max(1, height)
        this.yAxis.setHeight(this.height)
    }

    /**
     * 设置 Y 轴上下 padding（影响 priceToY 映射的上下留白）。
     */
    setPadding(top: number, bottom: number) {
        this.yAxis.setPadding(top, bottom)
    }

    /**
     * 注册一个 pane 级渲染器。
     */
    addRenderer(r: PaneRenderer) {
        this.renderers.push(r)
    }

    /**
     * 根据当前可见索引区间更新 priceRange，并同步到 yAxis。
     *
     * @param data  全量 K 线数据
     * @param range 当前视口可见的索引范围（由 getVisibleRange 计算）
     */
    updateRange(data: KLineData[], range: VisibleRange) {
        this.priceRange = getVisiblePriceRange(data, range.start, range.end)
        this.yAxis.setRange(this.priceRange)
    }
}
