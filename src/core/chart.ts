import type { KLineData } from '@/types/price'
import { getVisibleRange } from '@/core/viewport/viewport'
import { Pane, type VisibleRange } from '@/core/layout/pane'
import { InteractionController } from '@/core/controller/interaction'
import { PaneRenderer } from '@/core/paneRenderer'
import { drawTimeAxisLayer } from '@/core/renderers/timeAxis'
import { drawCrosshair } from '@/core/renderers/crosshair'
import { drawMALegend } from '@/core/renderers/maLegend'
import { drawAllPanesBorders } from '@/core/renderers/globalBorders'

/**
 * 图表 DOM 元素引用
 * @property container - 图表容器 div
 * @property canvasLayer - Canvas 层容器 div（包含所有绘制 canvas）
 * @property xAxisCanvas - X 轴时间轴 canvas
 * @property borderCanvas - 全局边框 canvas（可选，由 Chart 内部创建）
 */
export type ChartDom = {
    container: HTMLDivElement
    canvasLayer: HTMLDivElement
    xAxisCanvas: HTMLCanvasElement
    borderCanvas?: HTMLCanvasElement
}

/**
 * Pane 面板配置
 * @param id - Pane 标识符
 * @param ratio - Pane 高度占比
 */
export type PaneSpec = { id: string; ratio: number }

export type PaneRendererDom = {
    plotCanvas: HTMLCanvasElement
    yAxisCanvas: HTMLCanvasElement
}

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

    /** 价格标签额外宽度（用于显示涨跌幅，默认 60px） */
    priceLabelWidth?: number
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

    private paneRenderers: PaneRenderer[] = []
    readonly interaction: InteractionController

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


    /** 获取所有 PaneRenderer */
    getPaneRenderers(): PaneRenderer[] {
        return this.paneRenderers
    }

    /**
     * 设置某个 pane 的渲染器链（按顺序执行）。
     *
     * @param paneId pane 标识（例如 'main'/'sub'）
     * @param renderers 渲染器数组；会清空并替换原有列表（保持引用稳定）
     */
    setPaneRenderers(paneId: string, renderers: Pane['renderers']) {
        const renderer = this.paneRenderers.find((r) => r.getPane().id === paneId)
        if (!renderer) return
        const pane = renderer.getPane()
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
     * 规则：kGap + n*(kWidth+kGap) + rightAxisWidth + priceLabelWidth
     */
    getContentWidth(): number {
        const n = this.data?.length ?? 0
        const plotWidth = this.opt.kGap + n * (this.opt.kWidth + this.opt.kGap)
        const yAxisTotalWidth = this.opt.rightAxisWidth + (this.opt.priceLabelWidth || 60)
        return plotWidth + yAxisTotalWidth
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
     * 3) 对每个 PaneRenderer：独立绘制 plotCanvas 和 yAxisCanvas
     * 4) 画 xAxis（xAxisCanvas）
     * 5) 画 overlay（十字线、图例、边框等）
     */
    draw() {
        // 1. 计算视口信息
        const vp = this.computeViewport()
        if (!vp) return

        // 2. 获取 xAxis Canvas 上下文
        const xAxisCtx = this.dom.xAxisCanvas.getContext('2d')
        if (!xAxisCtx) return

        // 3. 清空 xAxis Canvas + 设置 DPR 缩放
        xAxisCtx.setTransform(1, 0, 0, 1, 0, 0)
        xAxisCtx.scale(vp.dpr, vp.dpr)
        xAxisCtx.clearRect(0, 0, vp.plotWidth, this.opt.bottomAxisHeight)

        // 4. 计算可视K线数据范围
        const { start, end } = getVisibleRange(
            vp.scrollLeft,
            vp.plotWidth,
            this.opt.kWidth,
            this.opt.kGap,
            this.data.length
        )

        const range: VisibleRange = { start, end }

        // 5. 遍历所有 PaneRenderer，独立绘制每个 pane
        // 拖拽状态下不传递crosshair信息，避免绘制Y轴标签
        const isDragging = this.interaction.isDraggingState()
        for (const renderer of this.paneRenderers) {
            renderer.draw({
                data: this.data,
                range,
                scrollLeft: vp.scrollLeft,
                kWidth: this.opt.kWidth,
                kGap: this.opt.kGap,
                dpr: vp.dpr,
                crosshairPos: isDragging ? null : this.interaction.crosshairPos,
                crosshairIndex: isDragging ? null : this.interaction.crosshairIndex,
                title: renderer.getPane().id === 'sub' ? '副图(占位)' : undefined,
            })
        }

        // 7. 绘制 xAxis 时间轴（全局，底部一条）
        // 拖拽状态下不绘制X轴时间标签
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
                !isDragging && this.interaction.crosshairPos && typeof this.interaction.crosshairIndex === 'number'
                    ? { x: this.interaction.crosshairPos.x, index: this.interaction.crosshairIndex }
                    : null,
        })

        // 8. 绘制十字线
        // 垂直线在所有 pane 上绘制，水平线只在活跃的 pane 上绘制
        // 拖拽状态下不绘制十字线
        if (!isDragging && this.interaction.crosshairPos) {
            const { x, y } = this.interaction.crosshairPos
            const activePaneId = this.interaction.activePaneId

            for (const renderer of this.paneRenderers) {
                const pane = renderer.getPane()
                const plotCtx = renderer.getDom().plotCanvas.getContext('2d')
                if (!plotCtx) continue

                const isActive = pane.id === activePaneId
                const localY = isActive ? y - pane.top : 0 // 活跃 pane 使用相对 y 坐标

                plotCtx.save()
                drawCrosshair({
                    ctx: plotCtx,
                    plotWidth: vp.plotWidth,
                    plotHeight: pane.height,
                    dpr: vp.dpr,
                    x,
                    y: localY,
                    drawVertical: true,
                    drawHorizontal: isActive,
                })
                plotCtx.restore()
            }
        }

        // 9. 绘制 MA 图例（屏幕坐标系绘制，不参与 scrollLeft）
        const mainRenderer = this.paneRenderers.find((r) => r.getPane().id === 'main')
        if (mainRenderer) {
            const plotCtx = mainRenderer.getDom().plotCanvas.getContext('2d')
            if (plotCtx) {
                // plotCtx.clearRect(0, 0, vp.plotWidth, vp.plotHeight)
                drawMALegend({
                    ctx: plotCtx,
                    data: this.data,
                    yPaddingPx: this.opt.yPaddingPx,
                    endIndex: range.end,
                    showMA: { ma5: true, ma10: true, ma20: true, ma30: true, ma60: true },
                    dpr: vp.dpr,
                })
            }
        }

        // 10. 绘制全局边框
        const borderCanvas = this.dom.borderCanvas
        if (!borderCanvas) return
        const borderCtx = borderCanvas.getContext('2d')
        if (!borderCtx) return

        borderCtx.setTransform(1, 0, 0, 1, 0, 0)
        borderCtx.scale(vp.dpr, vp.dpr)
        borderCtx.clearRect(0, 0, vp.plotWidth, vp.plotHeight)

        drawAllPanesBorders({
            ctx: borderCtx,
            dpr: vp.dpr,
            plotWidth: vp.plotWidth,
            panes: this.paneRenderers.map(r => ({
                top: r.getPane().top,
                height: r.getPane().height
            }))
        })
    }

    /**
     * 在给定 mouseX（相对 container 左侧）处做缩放。
     *
     * 缩放策略：物理像素空间控制
     * - 物理kWidth按2步进（保证奇数，影线完美居中）
     * - 物理kGap固定为3px
     * - 缩放连续平滑，无跳跃
     *
     * @param mouseX 鼠标相对 container 的 x（逻辑像素）
     * @param scrollLeft 当前 container.scrollLeft
     * @param deltaY WheelEvent.deltaY（>0 缩小，<0 放大）
     */
    zoomAt(mouseX: number, scrollLeft: number, deltaY: number) {
        const oldUnit = this.opt.kWidth + this.opt.kGap
        const centerIndex = (scrollLeft + mouseX) / oldUnit

        // 获取当前DPR
        const dpr = this.viewport?.dpr || window.devicePixelRatio || 1

        // 转换到物理像素空间
        const physKWidth = Math.round(this.opt.kWidth * dpr)

        // 物理kWidth按2步进（保证奇数）
        const delta = deltaY > 0 ? -2 : 2
        let newPhysKWidth = physKWidth + delta

        // 确保物理kWidth是奇数（影线完美二等分）
        if (newPhysKWidth % 2 === 0) {
            newPhysKWidth += delta > 0 ? 1 : -1
        }

        // 转换回逻辑像素
        let newKWidth = newPhysKWidth / dpr

        // 固定物理间距为3px，转换回逻辑像素
        const PHYS_K_GAP = 3
        const newKGap = PHYS_K_GAP / dpr

        // 限制在范围内
        newKWidth = Math.max(this.opt.minKWidth, Math.min(this.opt.maxKWidth, newKWidth))

        // 如果没有变化，直接返回
        if (Math.abs(newKWidth - this.opt.kWidth) < 0.01) return

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
        this.paneRenderers.forEach((r) => r.destroy())
        this.paneRenderers = []
        this.onZoomChange = undefined
    }

    /** 根据 opt.panes 重建 PaneRenderer 实例列表 */
    private initPanes() {
        // 为每个 pane 创建独立的 canvas 元素
        this.paneRenderers = this.opt.panes.map((spec, index) => {
            const pane = new Pane(spec.id)

            // 创建独立的 plotCanvas 和 yAxisCanvas
            const plotCanvas = document.createElement('canvas')
            const yAxisCanvas = document.createElement('canvas')

            // 设置 canvas id
            plotCanvas.id = `${spec.id}-plot`
            yAxisCanvas.id = `${spec.id}-yAxis`

            // 设置初始样式
            plotCanvas.style.position = 'absolute'
            plotCanvas.style.left = '0'
            plotCanvas.style.top = '0'

            yAxisCanvas.style.position = 'absolute'
            yAxisCanvas.style.top = '0'
            yAxisCanvas.style.left = '0'  // 将使用 left 定位，跟随 pane 右侧

            // 创建 PaneRenderer
            const renderer = new PaneRenderer(
                { plotCanvas, yAxisCanvas },
                pane,
                {
                    rightAxisWidth: this.opt.rightAxisWidth,
                    yPaddingPx: this.opt.yPaddingPx,
                    priceLabelWidth: this.opt.priceLabelWidth, // 传递价格标签宽度配置
                    isLast: index === this.opt.panes.length - 1, // 最后一个 pane 标记
                }
            )

            return renderer
        })

        // 将 canvas 元素添加到 canvasLayer
        const canvasLayer = this.dom.canvasLayer
        if (canvasLayer) {
            // 先清空 canvasLayer（除了 xAxisCanvas）
            const existingCanvases = canvasLayer.querySelectorAll('canvas:not(.x-axis-canvas)')
            existingCanvases.forEach((canvas) => canvas.remove())

            // 添加新的 canvas 元素
            this.paneRenderers.forEach((renderer) => {
                const dom = renderer.getDom()
                canvasLayer.appendChild(dom.plotCanvas)
                canvasLayer.appendChild(dom.yAxisCanvas)
            })

            // 创建边框 canvas（全局，覆盖所有 pane）
            const borderCanvas = document.createElement('canvas')
            borderCanvas.id = 'border'
            borderCanvas.style.position = 'absolute'
            borderCanvas.style.left = '0'
            borderCanvas.style.top = '0'
            borderCanvas.style.pointerEvents = 'none' // 不阻挡交互
            this.dom.borderCanvas = borderCanvas
            canvasLayer.appendChild(borderCanvas)
        }
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

        const n = Math.min(this.paneRenderers.length, this.opt.panes.length)
        const totalGaps = gap * Math.max(0, n - 1)
        const availableH = Math.max(1, vp.plotHeight - totalGaps)
        for (let i = 0; i < n; i++) {
            const spec = this.opt.panes[i]
            const renderer = this.paneRenderers[i]
            if (!spec || !renderer) continue

            const pane = renderer.getPane()
            const h = i === n - 1 ? availableH - y : Math.round(availableH * (spec.ratio / totalRatio))

            pane.setLayout(y, h)
            pane.setPadding(this.opt.yPaddingPx, this.opt.yPaddingPx)

            // 调整 PaneRenderer 的 canvas 尺寸和位置
            renderer.resize(vp.plotWidth, h, vp.dpr)
            // 设置 canvas 的 top 和 left 位置
            const dom = renderer.getDom()
            dom.plotCanvas.style.top = `${y}px`
            dom.yAxisCanvas.style.top = `${y}px`
            // yAxisCanvas 的 left 使用向下取整，确保贴边
            dom.yAxisCanvas.style.left = `${Math.floor(vp.plotWidth)}px`

            y += h + gap
        }
    }

    /**
     * 计算并应用 viewport：
     * - 读取 container 尺寸
     * - 计算 plot 区域尺寸（扣掉右轴/底轴）
     * - 处理 DPR 以及最大像素限制（避免超大 canvas）
     * - 设置 canvasLayer/xAxisCanvas 的 style 尺寸与实际像素尺寸
     */
    private computeViewport(): Viewport | null {
        const container = this.dom.container
        if (!container) return null

        const rect = container.getBoundingClientRect()
        const viewWidth = Math.max(1, Math.ceil(rect.width))
        const viewHeight = Math.max(1, Math.ceil(rect.height))
        const scrollLeft = container.scrollLeft

        const yAxisTotalWidth = this.opt.rightAxisWidth + (this.opt.priceLabelWidth || 60)
        // plotWidth 和 plotHeight 统一向上取整，确保为整数
        const plotWidth = Math.round(viewWidth - yAxisTotalWidth)
        const plotHeight = Math.round(viewHeight - this.opt.bottomAxisHeight)

        let dpr = window.devicePixelRatio || 1
        const MAX_CANVAS_PIXELS = 16 * 1024 * 1024
        const requestedPixels = viewWidth * dpr * (viewHeight * dpr)
        if (requestedPixels > MAX_CANVAS_PIXELS) {
            dpr = Math.sqrt(MAX_CANVAS_PIXELS / (viewWidth * viewHeight))
        }

        this.dom.canvasLayer.style.width = `${viewWidth}px`
        this.dom.canvasLayer.style.height = `${viewHeight}px`

        this.dom.xAxisCanvas.style.width = `${plotWidth}px`
        this.dom.xAxisCanvas.style.height = `${this.opt.bottomAxisHeight}px`
        // xAxisCanvas 的 top 使用向下取整，确保贴边
        this.dom.xAxisCanvas.style.top = `${Math.floor(plotHeight)}px`
        this.dom.xAxisCanvas.width = Math.round(plotWidth * dpr)
        this.dom.xAxisCanvas.height = Math.round(this.opt.bottomAxisHeight * dpr)

        // 设置边框 canvas 尺寸（如果存在）
        if (this.dom.borderCanvas) {
            this.dom.borderCanvas.style.width = `${plotWidth}px`
            this.dom.borderCanvas.style.height = `${plotHeight}px`
            this.dom.borderCanvas.width = Math.ceil(plotWidth * dpr)
            this.dom.borderCanvas.height = Math.ceil(plotHeight * dpr)
        }

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