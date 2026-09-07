/** 验证 ChartRenderer 帧内的 viewport DOM 滚动提交。 */

import { describe, expect, it } from 'vitest'

import { commitViewportScroll } from '../render/chartRenderer'

describe('commitViewportScroll', () => {
  it('writes the latest viewport position once before canvas paint', () => {
    const writes: number[] = []
    let scrollLeft = 0
    const container = {
      get scrollLeft() {
        return scrollLeft
      },
      set scrollLeft(value: number) {
        writes.push(value)
        scrollLeft = value
      },
    } as unknown as HTMLElement

    commitViewportScroll(container, 160)

    expect(writes).toEqual([160])
    expect(container.scrollLeft).toBe(160)
  })

  it('skips the native write when the container already matches state', () => {
    const writes: number[] = []
    let scrollLeft = 160
    const container = {
      get scrollLeft() {
        return scrollLeft
      },
      set scrollLeft(value: number) {
        writes.push(value)
        scrollLeft = value
      },
    } as unknown as HTMLElement

    commitViewportScroll(container, 160)

    expect(writes).toEqual([])
    expect(container.scrollLeft).toBe(160)
  })
})
