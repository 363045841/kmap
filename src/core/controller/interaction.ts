import type { Chart } from '../chart'

/**
 * 交互控制器：只依赖 Chart 公共 API，不依赖 Vue。
 * 先落地：拖拽滚动 / wheel 缩放。
 * hover/crosshair 后续按同样方式接入。
 */
export class InteractionController {
    private chart: Chart
    private isDragging = false
    private dragStartX = 0
    private scrollStartX = 0

    // ===== 新增：触摸会话标记，避免触摸触发的模拟 mouse 事件干扰 =====
    private isTouchSession = false

    // ===== Crosshair / Hover 状态（给渲染与 Vue tooltip 使用） =====
    crosshairPos: { x: number; y: number } | null = null
    crosshairIndex: number | null = null
    hoveredIndex: number | null = null
    activePaneId: string | null = null
    tooltipPos: { x: number; y: number } = { x: 0, y: 0 }
    tooltipSize: { width: number; height: number } = { width: 220, height: 180 }

    constructor(chart: Chart) {
        this.chart = chart
    }

    /**
     * Pointer 事件：用于移动端/触屏设备。
     * 设计目标：手指一接触屏幕（pointerdown）就立刻更新 crosshair。
     */
    onPointerDown(e: PointerEvent) {
        // 只处理主指针（手指/鼠标主键），避免多指触控时状态混乱
        if (e.isPrimary === false) return

        // 标记触摸会话：触摸设备上 pointer 之后往往还会触发模拟的 mouse 事件
        // 这里记录下来以便在 onMouseXxx 里忽略这些模拟事件
        this.isTouchSession = e.pointerType === 'touch'

        // 手指按下：立即更新十字线位置
        this.isDragging = true
        // 直接更新位置：避免先 clear 再 update 导致闪烁
        this.updateHoverFromPoint(e.clientX, e.clientY)

        const container = this.chart.getDom().container
        this.dragStartX = e.clientX
        this.scrollStartX = container.scrollLeft

        this.chart.scheduleDraw()
        // 不在这里 preventDefault：让容器仍然可以滚动（横向滚动由拖拽逻辑控制）
    }

    onPointerMove(e: PointerEvent) {
        if (e.isPrimary === false) return
        const container = this.chart.getDom().container

        if (this.isDragging) {
            const deltaX = this.dragStartX - e.clientX
            container.scrollLeft = this.scrollStartX + deltaX
            // 拖拽时也更新十字线（可选：让 crosshair 跟随手指）
            this.updateHoverFromPoint(e.clientX, e.clientY)
            this.chart.scheduleDraw()
            return
        }

        this.updateHoverFromPoint(e.clientX, e.clientY)
        this.chart.scheduleDraw()
    }

    onPointerUp(e: PointerEvent) {
        if (e.isPrimary === false) return
        this.isDragging = false

        // 可选：如果希望抬起手指后十字线消失，可启用下面逻辑
        // if (e.pointerType === 'touch') {
        //     this.clearHover()
        //     this.chart.scheduleDraw()
        // }
    }

    onPointerLeave(e: PointerEvent) {
        if (e.isPrimary === false) return
        this.isDragging = false
        this.isTouchSession = false
        this.clearHover()
        this.chart.scheduleDraw()
    }

    onMouseDown(e: MouseEvent) {
        // 触摸会话中忽略模拟的 mouse 事件
        if (this.isTouchSession) return
        if (e.button !== 0) return
        const container = this.chart.getDom().container
        this.isDragging = true
        // 鼠标按下时也更新 hover（保持与 pointer 行为一致）
        this.dragStartX = e.clientX
        this.scrollStartX = container.scrollLeft
        this.updateHoverFromPoint(e.clientX, e.clientY)
        this.chart.scheduleDraw()
        e.preventDefault()
    }

    onMouseMove(e: MouseEvent) {
        if (this.isTouchSession) return
        const container = this.chart.getDom().container
        if (this.isDragging) {
            const deltaX = this.dragStartX - e.clientX
            container.scrollLeft = this.scrollStartX + deltaX
            return
        }

        this.updateHover(e)
        this.chart.scheduleDraw()
    }

    onMouseUp() {
        if (this.isTouchSession) return
        this.isDragging = false
    }

    onMouseLeave() {
        if (this.isTouchSession) return
        this.isDragging = false
        this.clearHover()
        this.chart.scheduleDraw()
    }

    onScroll() {
        this.clearHover()
        this.chart.scheduleDraw()
    }

    onWheel(e: WheelEvent) {
        const container = this.chart.getDom().container
        const rect = container.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const scrollLeft = container.scrollLeft

        this.clearHover()
        this.chart.zoomAt(mouseX, scrollLeft, e.deltaY)
    }

    setTooltipSize(size: { width: number; height: number }) {
        this.tooltipSize = size
    }

    private clearHover() {
        this.crosshairPos = null
        this.crosshairIndex = null
        this.hoveredIndex = null
        this.activePaneId = null
    }

    private updateHover(e: MouseEvent) {
        this.updateHoverFromPoint(e.clientX, e.clientY)
    }

    private updateHoverFromPoint(clientX: number, clientY: number) {
        const container = this.chart.getDom().container
        const rect = container.getBoundingClientRect()
        const mouseX = clientX - rect.left
        const mouseY = clientY - rect.top

        const opt = this.chart.getOption()
        const viewWidth = Math.max(1, Math.round(rect.width))
        const viewHeight = Math.max(1, Math.round(rect.height))
        const plotWidth = viewWidth - opt.rightAxisWidth
        const plotHeight = viewHeight - opt.bottomAxisHeight

        if (mouseX < 0 || mouseY < 0 || mouseX > plotWidth || mouseY > plotHeight) {
            this.clearHover()
            return
        }

        const scrollLeft = container.scrollLeft
        const unit = opt.kWidth + opt.kGap
        const worldX = scrollLeft + mouseX
        const offset = worldX - opt.kGap
        if (offset < 0) {
            this.clearHover()
            return
        }

        const data = this.chart.getData()
        const idx = Math.floor(offset / unit)

        // pane 选择：按鼠标 y 落在哪个 pane（先基于 layout.top/height）
        const paneRenderers = this.chart.getPaneRenderers()
        const renderer = paneRenderers.find((r) => {
            const pane = r.getPane()
            return mouseY >= pane.top && mouseY <= pane.top + pane.height
        })
        const pane = renderer?.getPane() || null
        if (!pane) {
            // 鼠标在 plot 区域但落在 paneGap 上：仍显示 crosshair（不属于任何 pane），但不显示 tooltip/label
            this.activePaneId = null
        } else {
            this.activePaneId = pane.id
        }

        // ===== 十字线：只要在 plot 区域内就显示（不要求命中 K 线） =====
        // X 方向仍吸附到最近 K（如果 idx 有效），否则保持 mouseX。
        if (idx >= 0 && idx < (data?.length ?? 0)) {
            this.crosshairIndex = idx
            const centerWorldX = opt.kGap + idx * unit + opt.kWidth / 2
            const snappedX = centerWorldX - scrollLeft
            this.crosshairPos = {
                x: Math.min(Math.max(snappedX, 0), plotWidth),
                y: Math.min(Math.max(mouseY, 0), plotHeight),
            }
        } else {
            this.crosshairIndex = null
            this.crosshairPos = {
                x: Math.min(Math.max(mouseX, 0), plotWidth),
                y: Math.min(Math.max(mouseY, 0), plotHeight),
            }
        }

        // ===== Tooltip 命中判定：仍要求命中 candle body/wick 才显示 tooltip =====
        const k = typeof this.crosshairIndex === 'number' ? data[this.crosshairIndex] : undefined
        if (!k || !pane) {
            this.hoveredIndex = null
            return
        }

        const localY = mouseY - pane.top
        const openY = pane.yAxis.priceToY(k.open)
        const closeY = pane.yAxis.priceToY(k.close)
        const highY = pane.yAxis.priceToY(k.high)
        const lowY = pane.yAxis.priceToY(k.low)
        const bodyTop = Math.min(openY, closeY)
        const bodyBottom = Math.max(openY, closeY)

        const inUnitX = offset - (this.crosshairIndex as number) * unit
        const HIT_WICK_HALF = 3
        const cx = opt.kWidth / 2
        const hitBody = localY >= bodyTop && localY <= bodyBottom && inUnitX >= 0 && inUnitX <= opt.kWidth
        const hitWick = Math.abs(inUnitX - cx) <= HIT_WICK_HALF && localY >= highY && localY <= lowY

        if (!hitBody && !hitWick) {
            this.hoveredIndex = null
            return
        }

        this.hoveredIndex = this.crosshairIndex

        // tooltip 防溢出定位（复用旧逻辑）
        const padding = 12
        const preferGap = 14
        const tooltipW = this.tooltipSize.width
        const tooltipH = this.tooltipSize.height
        const rightX = mouseX + preferGap
        const leftX = mouseX - preferGap - tooltipW
        const desiredX = rightX + tooltipW + padding <= viewWidth ? rightX : leftX

        const desiredY = mouseY + preferGap
        const maxX = Math.max(padding, viewWidth - tooltipW - padding)
        const maxY = Math.max(padding, viewHeight - tooltipH - padding)
        this.tooltipPos = {
            x: Math.min(Math.max(desiredX, padding), maxX),
            y: Math.min(Math.max(desiredY, padding), maxY),
        }
    }
}
