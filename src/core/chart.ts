import type { KLineData } from '@/types/price'
import { getVisibleRange } from '@/core/viewport/viewport'
import { Pane, type VisibleRange } from '@/core/layout/pane'
import { InteractionController } from '@/core/controller/interaction'
import { createYAxisRenderer } from '@/core/renderers/yAxis'
import { drawTimeAxisLayer } from '@/core/renderers/timeAxis'
import { drawCrosshair } from '@/core/renderers/crosshair'
import { drawCrosshairPriceLabelForPane } from '@/core/renderers/crosshairLabels'
import { drawMALegend } from '@/core/renderers/maLegend'
import { drawPaneTitle } from '@/core/renderers/paneTitle'
import { drawPaneBorders } from '@/core/renderers/paneBorder'

export type ChartDom = {
    container: HTMLDivElement
    canvasLayer: HTMLDivElement
    plotCanvas: HTMLCanvasElement
    yAxisCanvas: HTMLCanvasElement
    xAxisCanvas: HTMLCanvasElement
}

export type PaneSpec = { id: string; ratio: number }

export type ChartOptions = {
    kWidth: number
    kGap: number
    yPaddingPx: number
    rightAxisWidth: number
    bottomAxisHeight: number
    minKWidth: number
    maxKWidth: number
    panes: PaneSpec[]

    /** pane 之间的真实分隔空隙（逻辑像素） */
    paneGap?: number
}

export type Viewport = {
    viewWidth: number
    viewHeight: number
    plotWidth: number
    plotHeight: number
    scrollLeft: number
    dpr: number
}

export class Chart {
    private dom: ChartDom
    private opt: ChartOptions
    private data: KLineData[] = []

    private raf: number | null = null
    private viewport: Viewport | null = null

    private panes: Pane[] = []
    readonly interaction: InteractionController

    // 缩放回调：用于通知外部（Vue）同步 kWidth/kGap 与 scrollLeft
    private onZoomChange?: (kWidth: number, kGap: number, targetScrollLeft: number) => void

    /**
     * 注册缩放回调。
     *
     * 为什么需要它：
     * - `zoomAt()` 会更新 core 内部的 `kWidth/kGap`，但项目的横向滚动范围来自 Vue 层 `.scroll-content` 的宽度。
     * - Vue 需要先用新的 kWidth/kGap 重新计算内容宽度（触发 DOM 更新 scrollWidth），
     *   再设置正确的 scrollLeft，否则会出现“放大后无法拖到最右侧”的问题。
     *
     * @param cb (newKWidth, newKGap, targetScrollLeft) => void
     */
    setOnZoomChange(cb: (kWidth: number, kGap: number, targetScrollLeft: number) => void) {
        this.onZoomChange = cb
    }

    /**
     * 创建图表实例。
     *
     * @param dom 由 Vue 组件传入的 DOM 句柄（container/canvasLayer/三层 canvas）
     * @param opt 初始配置（kWidth/kGap、轴尺寸、pane 配置等）
     */
    constructor(dom: ChartDom, opt: ChartOptions) {
        this.dom = dom
        this.opt = opt
        this.interaction = new InteractionController(this)

        this.initPanes()
    }

    /** 获取所有 pane（包含布局信息与 renderers 列表） */
    getPanes(): Pane[] {
        return this.panes
    }

    /**
     * 设置某个 pane 的渲染器链（按顺序执行）。
     *
     * @param paneId pane 标识（例如 'main'/'sub'）
     * @param renderers 渲染器数组；会清空并替换原有列表（保持引用稳定）
     */
    setPaneRenderers(paneId: string, renderers: Pane['renderers']) {
        const pane = this.panes.find((p) => p.id === paneId)
        if (!pane) return
        // 清空并替换（保持引用稳定）
        pane.renderers.length = 0
        for (const r of renderers) pane.renderers.push(r)
        this.scheduleDraw()
    }

    /** 获取 ChartDom（供 InteractionController 等使用） */
    getDom() {
        return this.dom
    }

    /** 获取当前 ChartOptions（注意：返回的是内部当前快照） */
    getOption() {
        return this.opt
    }

    /**
     * 更新配置并触发布局/重绘。
     * - 更新 panes 时会重建 Pane 实例并重新布局。
     */
    updateOptions(partial: Partial<ChartOptions>) {
        this.opt = { ...this.opt, ...partial }
        // panes 变化需要重建布局
        if (partial.panes) this.initPanes()
        this.resize()
    }

    /**
     * 更新数据并请求重绘。
     * @param data K 线数据数组（null/undefined 会被视为 []）
     */
    updateData(data: KLineData[]) {
        this.data = data ?? []
        this.scheduleDraw()
    }

    /** 获取当前数据源（给 renderers/interaction 使用） */
    getData(): KLineData[] {
        return this.data
    }

    /**
     * 内容总宽度（用于外部 scroll-content 撑开 scrollWidth）
     * 规则：kGap + n*(kWidth+kGap) + rightAxisWidth
     */
    getContentWidth(): number {
        const n = this.data?.length ?? 0
        const plotWidth = this.opt.kGap + n * (this.opt.kWidth + this.opt.kGap)
        return plotWidth + this.opt.rightAxisWidth
    }

    /**
     * 容器尺寸变化时调用：
     * - 重新计算 viewport（DPR/plotWidth/plotHeight）
     * - 重新计算 pane 布局
     * - 请求重绘
     */
    resize() {
        this.computeViewport()
        this.layoutPanes()
        this.scheduleDraw()
    }

    /**
     * 请求下一帧重绘（RAF 合并）。
     * 多次调用只会触发一次 draw，避免频繁重绘。
     */
    scheduleDraw() {
        if (this.raf != null) cancelAnimationFrame(this.raf)
        this.raf = requestAnimationFrame(() => {
            this.raf = null
            this.draw()
        })
    }

    /**
     * 绘制一帧：
     * 1) computeViewport（设置 canvas 尺寸）
     * 2) 计算可视区 range（start/end）
     * 3) 对每个 pane：更新 priceRange -> 执行 renderers（plotCanvas）-> 画 yAxis（yAxisCanvas）
     * 4) 画 xAxis（xAxisCanvas）
     * 5) 画 overlay（十字线、图例、边框等）
     */
    draw() {
        // 1. 计算视口信息
        const vp = this.computeViewport()
        if (!vp) return

        // 2. 获取三层 Canvas 上下文
        const plotCtx = this.dom.plotCanvas.getContext('2d')
        const yAxisCtx = this.dom.yAxisCanvas.getContext('2d')
        const xAxisCtx = this.dom.xAxisCanvas.getContext('2d')
        if (!plotCtx || !yAxisCtx || !xAxisCtx) return

        // 3. 清空 Canvas + 设置 DPR 缩放
        plotCtx.setTransform(1, 0, 0, 1, 0, 0)
        plotCtx.scale(vp.dpr, vp.dpr)
        plotCtx.clearRect(0, 0, vp.plotWidth, vp.plotHeight)

        yAxisCtx.setTransform(1, 0, 0, 1, 0, 0)
        yAxisCtx.scale(vp.dpr, vp.dpr)
        yAxisCtx.clearRect(0, 0, this.opt.rightAxisWidth, vp.plotHeight)

        // 4. 计算可视数据范围
        const { start, end } = getVisibleRange(
            vp.scrollLeft,
            vp.plotWidth,
            this.opt.kWidth,
            this.opt.kGap,
            this.data.length
        )

        const range: VisibleRange = { start, end }

        // 5. 遍历所有 Pane（主图 + 副图）
        for (const p of this.panes) {
            // 5.1 更新 Pane 的价格范围
            p.updateRange(this.data, range)

            // 5.2 绘制 plot 层（渲染器链：网格线 → K线 → MA）
            plotCtx.save()
            plotCtx.beginPath()
            plotCtx.rect(0, p.top, vp.plotWidth, p.height)
            plotCtx.clip()
            plotCtx.translate(0, p.top)
            for (const r of p.renderers) {
                r.draw({
                    ctx: plotCtx,
                    pane: p,
                    data: this.data,
                    range,
                    scrollLeft: vp.scrollLeft,
                    kWidth: this.opt.kWidth,
                    kGap: this.opt.kGap,
                    dpr: vp.dpr,
                })
            }
            plotCtx.restore()

            // 5.3 绘制 yAxis 刻度（每个 Pane 独立绘制一段）
            createYAxisRenderer({
                axisX: 0,
                axisWidth: this.opt.rightAxisWidth,
                yPaddingPx: this.opt.yPaddingPx,
                ticks: p.id === 'sub' ? 2 : undefined,
            }).draw({
                ctx: yAxisCtx,
                pane: p,
                data: this.data,
                range,
                scrollLeft: vp.scrollLeft,
                kWidth: this.opt.kWidth,
                kGap: this.opt.kGap,
                dpr: vp.dpr,
            })

            // 5.4 绘制十字线价格标签（画在 y-axis-canvas，避免 plotCanvas 重复）
            if (this.interaction.crosshairPos && this.interaction.activePaneId === p.id) {
                drawCrosshairPriceLabelForPane({
                    ctx: yAxisCtx,
                    pane: p,
                    axisWidth: this.opt.rightAxisWidth,
                    dpr: vp.dpr,
                    crosshairY: this.interaction.crosshairPos.y,
                    yPaddingPx: this.opt.yPaddingPx,
                })
            }
        }

        // 6. 绘制 Pane 边框（整体外框）
        drawPaneBorders({
            ctx: plotCtx,
            dpr: vp.dpr,
            width: vp.plotWidth,
            panes: [{ top: 0, height: vp.plotHeight }],
        })

        // 7. 绘制副图标题（plot 层）
        const subPane = this.panes.find((p) => p.id === 'sub')
        if (subPane) {
            drawPaneTitle({
                ctx: plotCtx,
                dpr: vp.dpr,
                paneTop: subPane.top,
                title: '副图(占位)',
            })
        }

        // yAxis 区域不绘制边框/分隔线：只保留绘图区域（plot）四周边线

        // 8. 绘制 xAxis 时间轴（全局，底部一条）
        drawTimeAxisLayer({
            ctx: xAxisCtx,
            data: this.data,
            scrollLeft: vp.scrollLeft,
            kWidth: this.opt.kWidth,
            kGap: this.opt.kGap,
            startIndex: range.start,
            endIndex: range.end,
            dpr: vp.dpr,
            crosshair:
                this.interaction.crosshairPos && typeof this.interaction.crosshairIndex === 'number'
                    ? { x: this.interaction.crosshairPos.x, index: this.interaction.crosshairIndex }
                    : null,
        })

        // 9. 绘制十字线（屏幕坐标系绘制在 plotCanvas 最上层）
        if (this.interaction.crosshairPos) {
            plotCtx.save()
            plotCtx.beginPath()
            plotCtx.rect(0, 0, vp.plotWidth, vp.plotHeight)
            plotCtx.clip()
            drawCrosshair({
                ctx: plotCtx,
                plotWidth: vp.plotWidth,
                plotHeight: vp.plotHeight,
                dpr: vp.dpr,
                x: this.interaction.crosshairPos.x,
                y: this.interaction.crosshairPos.y,
            })
            plotCtx.restore()
        }

        // 10. 绘制 MA 图例（屏幕坐标系绘制，不参与 scrollLeft）
        // 先临时读取 main pane 的开关：由外部 renderer 传入 showMA 后，legend 才有意义。
        // 当前 showMA 由 KLineChart.vue 负责决定是否接入 MA renderer，因此这里默认都显示。
        drawMALegend({
            ctx: plotCtx,
            data: this.data,
            yPaddingPx: this.opt.yPaddingPx,
            endIndex: range.end,
            showMA: { ma5: true, ma10: true, ma20: true },
            dpr: vp.dpr,
        })
    }

    /**
     * 在给定 mouseX（相对 container 左侧）处做缩放。
     *
     * 设计目标：缩放后保持 mouseX 指向的“数据索引”尽量稳定（以该点为中心缩放）。
     *
     * @param mouseX 鼠标相对 container 的 x（逻辑像素）
     * @param scrollLeft 当前 container.scrollLeft
     * @param deltaY WheelEvent.deltaY（>0 缩小，<0 放大）
     */
    zoomAt(mouseX: number, scrollLeft: number, deltaY: number) {
        const oldUnit = this.opt.kWidth + this.opt.kGap
        const centerIndex = (scrollLeft + mouseX) / oldUnit

        const delta = deltaY > 0 ? -1 : 1
        const newKWidth = Math.max(this.opt.minKWidth, Math.min(this.opt.maxKWidth, this.opt.kWidth + delta))
        if (newKWidth === this.opt.kWidth) return

        const ratio = this.opt.kGap / this.opt.kWidth
        const newKGap = Math.max(0.5, newKWidth * ratio)

        this.opt = { ...this.opt, kWidth: newKWidth, kGap: newKGap }

        const newUnit = newKWidth + newKGap
        const newScrollLeft = centerIndex * newUnit - mouseX

        // 有回调时交由外部处理：先更新 scroll-content 宽度，再设置 scrollLeft（避免缩放后滚动范围锁死）
        if (this.onZoomChange) {
            this.onZoomChange(newKWidth, newKGap, newScrollLeft)
            return
        }

        // clamp：避免缩放后 scrollLeft 被锁死或越界
        const container = this.dom.container
        // scrollWidth/offsetWidth 依赖外部 scroll-content 的 width 更新，因此这里只能尽量 clamp 到当前可得范围
        const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)
        container.scrollLeft = Math.min(Math.max(0, newScrollLeft), maxScrollLeft)
        this.scheduleDraw()
    }

    /**
     * 销毁 chart：
     * - 取消 RAF
     * - 释放引用，避免内存泄漏
     */
    destroy() {
        if (this.raf != null) cancelAnimationFrame(this.raf)
        this.raf = null
        this.viewport = null
        this.panes = []
        this.onZoomChange = undefined
    }

    /** 根据 opt.panes 重建 Pane 实例列表 */
    private initPanes() {
        this.panes = this.opt.panes.map((p) => new Pane(p.id))
    }

    /**
     * 计算每个 pane 的布局（top/height）。
     * - 按 ratio 分配高度
     * - 支持 paneGap 形成真实留白
     */
    private layoutPanes() {
        const vp = this.viewport
        if (!vp) return

        const totalRatio = this.opt.panes.reduce((s, p) => s + (p.ratio ?? 0), 0) || 1
        const gap = Math.max(0, this.opt.paneGap ?? 0)
        let y = 0

        const n = Math.min(this.panes.length, this.opt.panes.length)
        const totalGaps = gap * Math.max(0, n - 1)
        const availableH = Math.max(1, vp.plotHeight - totalGaps)
        for (let i = 0; i < n; i++) {
            const spec = this.opt.panes[i]
            const pane = this.panes[i]
            if (!spec || !pane) continue

            const h = i === n - 1 ? availableH - y : Math.round(availableH * (spec.ratio / totalRatio))

            pane.setLayout(y, h)
            pane.setPadding(this.opt.yPaddingPx, this.opt.yPaddingPx)
            y += h + gap
        }
    }

    /**
     * 计算并应用 viewport：
     * - 读取 container 尺寸
     * - 计算 plot 区域尺寸（扣掉右轴/底轴）
     * - 处理 DPR 以及最大像素限制（避免超大 canvas）
     * - 设置 canvasLayer/三个 canvas 的 style 尺寸与实际像素尺寸
     */
    private computeViewport(): Viewport | null {
        const container = this.dom.container
        if (!container) return null

        const rect = container.getBoundingClientRect()
        const viewWidth = Math.max(1, Math.round(rect.width))
        const viewHeight = Math.max(1, Math.round(rect.height))
        const scrollLeft = container.scrollLeft

        const plotWidth = viewWidth - this.opt.rightAxisWidth
        const plotHeight = viewHeight - this.opt.bottomAxisHeight

        let dpr = window.devicePixelRatio || 1
        const MAX_CANVAS_PIXELS = 16 * 1024 * 1024
        const requestedPixels = viewWidth * dpr * (viewHeight * dpr)
        if (requestedPixels > MAX_CANVAS_PIXELS) {
            dpr = Math.sqrt(MAX_CANVAS_PIXELS / (viewWidth * viewHeight))
        }

        this.dom.canvasLayer.style.width = `${viewWidth}px`
        this.dom.canvasLayer.style.height = `${viewHeight}px`

        this.dom.plotCanvas.style.width = `${plotWidth}px`
        this.dom.plotCanvas.style.height = `${plotHeight}px`
        this.dom.plotCanvas.width = Math.round(plotWidth * dpr)
        this.dom.plotCanvas.height = Math.round(plotHeight * dpr)

        this.dom.yAxisCanvas.style.width = `${this.opt.rightAxisWidth}px`
        this.dom.yAxisCanvas.style.height = `${plotHeight}px`
        this.dom.yAxisCanvas.width = Math.round(this.opt.rightAxisWidth * dpr)
        this.dom.yAxisCanvas.height = Math.round(plotHeight * dpr)

        this.dom.xAxisCanvas.style.width = `${plotWidth}px`
        this.dom.xAxisCanvas.style.height = `${this.opt.bottomAxisHeight}px`
        this.dom.xAxisCanvas.width = Math.round(plotWidth * dpr)
        this.dom.xAxisCanvas.height = Math.round(this.opt.bottomAxisHeight * dpr)

        const vp: Viewport = {
            viewWidth,
            viewHeight,
            plotWidth,
            plotHeight,
            scrollLeft,
            dpr,
        }
        this.viewport = vp
        return vp
    }
}
