/** 绘图 renderer 的画布层级测试。 */

import { describe, expect, it, vi } from 'vitest'

import type { DrawingPrimitive, RenderContext } from '../../../foundation/plugin/index'
import { createDrawingRendererPlugin } from '../plugin'

describe('createDrawingRendererPlugin', () => {
  /** 绘图必须写入覆盖画布，避免被帧末提交的 GPU K 线覆盖。 */
  it('renders primitives on the overlay canvas when available', () => {
    const mainCtx = {} as CanvasRenderingContext2D
    const overlayCtx = {} as CanvasRenderingContext2D
    const point = vi.fn()
    const plugin = createDrawingRendererPlugin({
      renderers: {
        point,
        line: vi.fn(),
        area: vi.fn(),
        arrow: vi.fn(),
        text: vi.fn(),
      },
    })
    const primitive: DrawingPrimitive = {
      kind: 'point',
      point: { x: 10, y: 20 },
    }

    plugin.draw({
      ctx: mainCtx,
      overlayCtx,
      drawingProjection: {
        primitives: [primitive],
        yAxisLabels: [],
        yAxisRanges: [],
        xAxisLabels: [],
        xAxisRanges: [],
      },
      viewport: { scrollLeft: 0, plotWidth: 800, plotHeight: 400 },
      pane: { height: 400 },
      dpr: 1,
    } as RenderContext)

    expect(point).toHaveBeenCalledWith(overlayCtx, primitive, 1)
  })
})
