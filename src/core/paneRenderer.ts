import type { KLineData } from '@/types/price'
import { Pane, type VisibleRange } from '@/core/layout/pane'
import { createYAxisRenderer } from '@/core/renderers/yAxis'
import { drawCrosshairPriceLabelForPane } from '@/core/renderers/crosshairLabels'
import { drawPaneTitle } from '@/core/renderers/paneTitle'

export type PaneRendererDom = {
    plotCanvas: HTMLCanvasElement
    yAxisCanvas: HTMLCanvasElement
}

export type PaneRendererOptions = {
    rightAxisWidth: number
    yPaddingPx: number
    priceLabelWidth?: number // 价格标签额外宽度（用于显示涨跌幅）
    isLast?: boolean // 是否是最后一个 pane
}

/**
 * PaneRenderer: 负责单个 Pane 的独立渲染。
 *
 * 职责：
 * - 管理独立的 plotCanvas 和 yAxisCanvas
 * - 调用 Pane 的渲染器链绘制内容
 * - 绘制 Y 轴刻度和十字线价格标签
 * - 绘制 Pane 标题
 * - 绘制 Pane 边框
 */
export class PaneRenderer {
    private dom: PaneRendererDom
    private pane: Pane
    private opt: PaneRendererOptions

    constructor(dom: PaneRendererDom, pane: Pane, opt: PaneRendererOptions) {
        this.dom = dom
        this.pane = pane
        this.opt = {
            ...opt,
            priceLabelWidth: opt.priceLabelWidth || 60, // 默认 60px 用于显示涨跌幅
        }
    }

    /** 获取关联的 Pane 实例 */
    getPane(): Pane {
        return this.pane
    }

    /** 获取 DOM 元素 */
    getDom(): PaneRendererDom {
        return this.dom
    }

    /**
     * 调整 Canvas 尺寸。
     *
     * @param width  pane 宽度（逻辑像素）
     * @param height pane 高度（逻辑像素）
     * @param dpr    设备像素比
     */
    resize(width: number, height: number, dpr: number) {
        const plotCanvas = this.dom.plotCanvas
        const yAxisCanvas = this.dom.yAxisCanvas

        plotCanvas.style.width = `${width}px`
        plotCanvas.style.height = `${height}px`
        plotCanvas.width = Math.round(width * dpr)
        plotCanvas.height = Math.round(height * dpr)

        // yAxisCanvas 宽度 = rightAxisWidth + priceLabelWidth（用于显示涨跌幅）
        const canvasYAxisWidth = this.opt.rightAxisWidth + (this.opt.priceLabelWidth || 60)
        yAxisCanvas.style.width = `${canvasYAxisWidth}px`
        yAxisCanvas.style.height = `${height}px`
        yAxisCanvas.width = Math.round(canvasYAxisWidth * dpr)
        yAxisCanvas.height = Math.round(height * dpr)
    }

    /**
     * 绘制该 Pane 的内容。
     *
     * @param args 绘制参数
     */
    draw(args: {
        data: KLineData[]
        range: VisibleRange
        scrollLeft: number
        kWidth: number
        kGap: number
        dpr: number
        crosshairPos?: { x: number; y: number } | null
        crosshairIndex?: number | null
        title?: string
    }) {
        const { data, range, scrollLeft, kWidth, kGap, dpr, crosshairPos, crosshairIndex, title } = args

        // 获取最新价（最后一根K线的收盘价）
        const lastKLine = data.length > 0 ? data[data.length - 1] : undefined
        const lastPrice = lastKLine?.close

        // 1. 更新 Pane 的价格范围
        this.pane.updateRange(data, range)

        // 2. 获取 Canvas 上下文
        const plotCtx = this.dom.plotCanvas.getContext('2d')
        const yAxisCtx = this.dom.yAxisCanvas.getContext('2d')
        if (!plotCtx || !yAxisCtx) return

        const paneHeight = this.pane.height
        const paneWidth = this.dom.plotCanvas.width / dpr

        // 3. 清空 Canvas + 设置 DPR 缩放
        plotCtx.setTransform(1, 0, 0, 1, 0, 0)
        plotCtx.scale(dpr, dpr)
        // 额外清除 2 逻辑像素，确保像素对齐导致的边缘十字线也能被清除
        plotCtx.clearRect(0, 0, paneWidth, paneHeight + 2 / dpr)

        yAxisCtx.setTransform(1, 0, 0, 1, 0, 0)
        yAxisCtx.scale(dpr, dpr)
        const canvasYAxisWidth = this.opt.rightAxisWidth + (this.opt.priceLabelWidth || 60)
        // 额外清除 2 逻辑像素，确保像素对齐导致的边缘内容也能被清除
        yAxisCtx.clearRect(0, 0, canvasYAxisWidth, paneHeight + 2 / dpr)

        // 4. 绘制 plot 层（渲染器链：网格线 → K线 → MA）
        // 注意：不需要 translate，因为每个 PaneRenderer 有自己独立的 canvas
        plotCtx.save()
        plotCtx.beginPath()
        plotCtx.rect(0, 0, paneWidth, paneHeight)
        plotCtx.clip()
        for (const r of this.pane.renderers) {
            r.draw({
                ctx: plotCtx,
                pane: this.pane,
                data,
                range,
                scrollLeft,
                kWidth,
                kGap,
                dpr,
                paneWidth,
            })
        }
        plotCtx.restore()

        // 5. 绘制 yAxis 刻度
        createYAxisRenderer({
            axisX: 0,
            axisWidth: this.opt.rightAxisWidth, // 刻度仍然在 rightAxisWidth 范围内
            yPaddingPx: this.opt.yPaddingPx,
            ticks: this.pane.id === 'sub' ? 2 : undefined,
        }).draw({
            ctx: yAxisCtx,
            pane: this.pane,
            data,
            range,
            scrollLeft,
            kWidth,
            kGap,
            dpr,
            paneWidth,
        })

        // 6. 绘制十字线价格标签
        if (crosshairPos && crosshairIndex !== null) {
            drawCrosshairPriceLabelForPane({
                ctx: yAxisCtx,
                pane: this.pane,
                axisWidth: this.opt.rightAxisWidth + (this.opt.priceLabelWidth || 60), // 使用扩展后的宽度
                dpr,
                crosshairY: crosshairPos.y - this.pane.top, // 转换为相对于 pane 的 y 坐标
                yPaddingPx: this.opt.yPaddingPx,
                lastPrice,
            })
        }

        // 7. 绘制 Pane 标题
        if (title) {
            drawPaneTitle({
                ctx: plotCtx,
                dpr,
                paneTop: 0,
                title,
            })
        }
    }

    /** 销毁 */
    destroy() {
        // PaneRenderer 没有需要清理的 RAF 资源，此方法为空实现
    }
}
