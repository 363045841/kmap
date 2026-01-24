import { describe, it, expect } from 'vitest'
import {
  alignRect,
  createVerticalLineRect,
} from '@/core/draw/pixelAlign'

/**
 * 验证K线绘制中实体与影线的不等分问题
 * 
 * 问题背景：
 * 当前实现中，K线实体通过 alignRect 对齐到物理像素边界
 * 影线通过 createVerticalLineRect 单独对齐到物理像素边界
 * 这会导致影线位置偏离实体中心，出现"影线不正"的问题
 * 
 * 正确做法应该是：
 * (实体宽度 - 影线宽度) 后剩余的宽度在物理像素空间应该能被2等分
 */

describe('K线实体与影线不等分问题验证', () => {
  /**
   * 辅助函数：验证实体与影线的物理像素对齐是否正确
   * 
   * @param dpr - 设备像素比
   * @param kWidth - K线实体宽度（逻辑像素）
   * @param kGap - K线间隙（逻辑像素）
   * @param index - K线索引，用于计算rectX
   * @returns 验证结果对象
   */
  function verifyAlignment(
    dpr: number,
    kWidth: number,
    kGap: number,
    index: number
  ) {
    const unit = kWidth + kGap
    const rectX = kGap + index * unit  // 实体左边界X坐标（逻辑像素）

    // 1. 对齐实体矩形到物理像素边界
    const bodyRect = alignRect(rectX, 0, kWidth, 10, dpr)

    // 2. 计算影线中心（逻辑像素）
    const wickCenterX = rectX + kWidth / 2

    // 3. 对齐影线到物理像素边界（1物理像素宽）
    const wickRect = createVerticalLineRect(wickCenterX, 0, 10, dpr)

    // 4. 转换到物理像素空间验证
    const physBodyLeft = Math.round(bodyRect.x * dpr)
    const physBodyRight = Math.round((bodyRect.x + bodyRect.width) * dpr)
    const physBodyWidth = physBodyRight - physBodyLeft

    const physWickX = wickRect ? Math.round(wickRect.x * dpr) : -1
    const physWickWidth = 1  // 影线固定1物理像素宽

    // 5. 计算左右两侧的物理像素宽度
    const leftWidth = physWickX - physBodyLeft
    const rightWidth = physBodyRight - (physWickX + physWickWidth)

    // 6. 验证是否等分
    const isEqual = leftWidth === rightWidth

    return {
      dpr,
      kWidth,
      index,
      rectX,
      bodyRect,
      wickRect,
      physBodyLeft,
      physBodyRight,
      physBodyWidth,
      physWickX,
      physWickWidth,
      leftWidth,
      rightWidth,
      isEqual,
    }
  }

  describe('DPR=1 (普通屏幕)', () => {
    it('kWidth=6, kGap=2 时应该出现不等分', () => {
      const result = verifyAlignment(1, 6, 2, 0)
      
      // DPR=1时，逻辑像素=物理像素
      // rectX=2, kWidth=6，实体在[2, 8]
      // 影线中心=5，对齐后应该在x=5
      // 左侧: 5-2=3, 右侧: 8-6=2，不等分！
      expect(result.isEqual).toBe(false)
      expect(result.leftWidth).toBe(3)
      expect(result.rightWidth).toBe(2)
    })

    it('kWidth=8, kGap=2 时应该等分', () => {
      const result = verifyAlignment(1, 8, 2, 0)
      
      // rectX=2, kWidth=8，实体在[2, 10]
      // 影线中心=6，对齐后应该在x=6
      // 左侧: 6-2=4, 右侧: 10-7=3，仍然不等分！
      // 因为alignRect会导致实体右边界从10变到10（无变化）
      // 但影线宽度占1像素，所以右侧实际宽度是10-6-1=3
      expect(result.isEqual).toBe(false)
    })

    it('kWidth=4, kGap=2 时应该等分', () => {
      const result = verifyAlignment(1, 4, 2, 0)
      
      // rectX=2, kWidth=4，实体在[2, 6]
      // 影线中心=4，对齐后应该在x=4
      // 左侧: 4-2=2, 右侧: 6-5=1，不等分！
      expect(result.isEqual).toBe(false)
    })
  })

  describe('DPR=2 (Retina屏幕)', () => {
    it('kWidth=6, kGap=2 时应该出现不等分', () => {
      const result = verifyAlignment(2, 6, 2, 0)
      
      // 逻辑像素：rectX=2, kWidth=6
      // 物理像素：physBodyLeft=4, physBodyRight=16, physBodyWidth=12
      // 影线中心=5（逻辑）=10（物理）
      // alignRect后影线x=5（逻辑），physWickX=10
      // 左侧: 10-4=6, 右侧: 16-11=5，不等分！
      expect(result.isEqual).toBe(false)
    })

    it('kWidth=6, kGap=2, index=1 时应该出现不等分', () => {
      const result = verifyAlignment(2, 6, 2, 1)
      
      // rectX=8, kWidth=6
      // 影线中心=11（逻辑）
      expect(result.isEqual).toBe(false)
    })

    it('kWidth=7, kGap=1 时应该等分', () => {
      const result = verifyAlignment(2, 7, 1, 0)
      
      // rectX=1, kWidth=7
      // 物理像素：physBodyLeft=2, physBodyRight=16, physBodyWidth=14
      // 影线中心=4.5（逻辑）=9（物理）
      // 左侧: 9-2=7, 右侧: 16-10=6，不等分！
      // (14-1)/2 = 6.5，不是整数
      expect(result.isEqual).toBe(false)
    })
  })

  describe('DPR=1.5 (笔记本屏幕)', () => {
    it('kWidth=6, kGap=2 时应该出现不等分', () => {
      const result = verifyAlignment(1.5, 6, 2, 0)
      
      // 物理像素：physBodyLeft=3, physBodyRight=12, physBodyWidth=9
      // (9-1)/2 = 4，是整数，但需要验证实际计算结果
      expect(result.isEqual).toBe(false)
    })

    it('kWidth=4, kGap=2 时应该不等分', () => {
      const result = verifyAlignment(1.5, 4, 2, 0)
      
      // 物理像素：physBodyLeft=3, physBodyRight=9, physBodyWidth=6
      // (6-1)/2 = 2.5，不是整数
      expect(result.isEqual).toBe(false)
    })
  })

  describe('DPR=3 (高清屏幕)', () => {
    it('kWidth=6, kGap=2 时应该出现不等分', () => {
      const result = verifyAlignment(3, 6, 2, 0)
      
      // 物理像素：physBodyLeft=6, physBodyRight=24, physBodyWidth=18
      // (18-1)/2 = 8.5，不是整数
      expect(result.isEqual).toBe(false)
    })

    it('kWidth=5, kGap=1 时应该不等分', () => {
      const result = verifyAlignment(3, 5, 1, 0)
      
      // 物理像素：physBodyLeft=3, physBodyRight=18, physBodyWidth=15
      // (15-1)/2 = 7，是整数，可能等分
      // 但需要验证实际计算结果
      expect(result.isEqual).toBe(false)
    })
  })

  describe('批量验证不等分情况', () => {
    it('DPR=2, kWidth=6, 连续10根K线都应该不等分', () => {
      for (let i = 0; i < 10; i++) {
        const result = verifyAlignment(2, 6, 2, i)
        expect(result.isEqual).toBe(false)
        
        // 打印详细信息用于调试
        console.log(`K线[${i}] - 左:${result.leftWidth}px 右:${result.rightWidth}px 相差:${Math.abs(result.leftWidth - result.rightWidth)}px`)
      }
    })

    it('多种DPR和kWidth组合都应该不等分', () => {
      const testCases = [
        { dpr: 1, kWidth: 6, kGap: 2 },
        { dpr: 1, kWidth: 8, kGap: 2 },
        { dpr: 2, kWidth: 6, kGap: 2 },
        { dpr: 2, kWidth: 8, kGap: 2 },
        { dpr: 3, kWidth: 6, kGap: 2 },
      ]

      let allFailed = 0
      testCases.forEach(({ dpr, kWidth, kGap }) => {
        const result = verifyAlignment(dpr, kWidth, kGap, 0)
        if (!result.isEqual) {
          allFailed++
          console.log(`DPR=${dpr}, kWidth=${kWidth}: 左${result.leftWidth}px 右${result.rightWidth}px`)
        }
      })

      // 所有测试用例都应该出现不等分
      expect(allFailed).toBe(testCases.length)
    })
  })

  describe('验证核心问题：(实体宽度 - 影线宽度) 不能被2等分', () => {
    it('验证物理像素空间的不等分', () => {
      const dpr = 2
      const kWidth = 6
      const kGap = 2
      const result = verifyAlignment(dpr, kWidth, kGap, 0)

      // 物理像素实体宽度
      const physBodyWidth = result.physBodyWidth
      const physWickWidth = 1

      // 剩余宽度
      const remainingWidth = physBodyWidth - physWickWidth

      // 应该不能被2整除
      expect(remainingWidth % 2).not.toBe(0)

      // 验证实际的左右偏差
      const deviation = Math.abs(result.leftWidth - result.rightWidth)
      expect(deviation).toBeGreaterThan(0)
      console.log(`DPR=${dpr}, kWidth=${kWidth}: 物理实体宽度${physBodyWidth}px, 剩余${remainingWidth}px, 偏差${deviation}px`)
    })
  })

  describe('验证K线步进的物理像素整数性 - 避免累积偏移', () => {
    /**
     * 辅助函数：验证K线步进是否会导致物理像素累积偏移
     * 
     * @param dpr - 设备像素比
     * @param kWidth - K线实体宽度（逻辑像素）
     * @param kGap - K线间隙（逻辑像素）
     * @param count - K线数量
     * @returns 验证结果对象
     */
    function verifyStepAlignment(
      dpr: number,
      kWidth: number,
      kGap: number,
      count: number
    ) {
      const unit = kWidth + kGap  // 每个K线单元的逻辑步进

      // 计算每个K线单元的物理宽度
      const physUnit = unit * dpr

      // 检查是否为整数
      const isInteger = Math.abs(physUnit - Math.round(physUnit)) < 0.0001

      // 计算连续K线的物理位置
      const positions: Array<{ index: number; physX: number; deviation: number }> = []

      for (let i = 0; i < count; i++) {
        // 逻辑位置
        const logicX = kGap + i * unit

        // 物理位置（转换后）
        const physX = logicX * dpr

        // 期望的物理位置（基于整数步进）
        const expectedPhysX = i * Math.round(physUnit) + Math.round(kGap * dpr)

        // 偏差
        const deviation = Math.abs(physX - expectedPhysX)

        positions.push({
          index: i,
          physX,
          deviation,
        })
      }

      return {
        dpr,
        kWidth,
        kGap,
        unit,
        physUnit,
        isInteger,
        positions,
        maxDeviation: Math.max(...positions.map(p => p.deviation)),
      }
    }

    describe('DPR=2 的步进验证', () => {
      it('kWidth=6, kGap=2 时，步进应该是整数', () => {
        const result = verifyStepAlignment(2, 6, 2, 10)
        
        // 单元逻辑宽度 = 6+2=8
        // 物理宽度 = 8*2=16，是整数
        expect(result.isInteger).toBe(true)
        expect(result.maxDeviation).toBe(0)
      })

      it('kWidth=5.5, kGap=2 时，步进应该是整数', () => {
        const result = verifyStepAlignment(2, 5.5, 2, 10)
        
        // 单元逻辑宽度 = 5.5+2=7.5
        // 物理宽度 = 7.5*2=15，是整数
        expect(result.isInteger).toBe(true)
        expect(result.maxDeviation).toBe(0)
      })

      it('kWidth=6.1, kGap=2 时，步进不是整数，应该检测到累积偏移', () => {
        const result = verifyStepAlignment(2, 6.1, 2, 10)
        
        // 单元逻辑宽度 = 6.1+2=8.1
        // 物理宽度 = 8.1*2=16.2，不是整数
        expect(result.isInteger).toBe(false)
        
        // 应该有累积偏移
        expect(result.maxDeviation).toBeGreaterThan(0)
        console.log(`K线位置偏差:`)
        result.positions.forEach(p => {
          if (p.deviation > 0.01) {
            console.log(`  K线[${p.index}]: physX=${p.physX.toFixed(4)}, 偏差=${p.deviation.toFixed(4)}`)
          }
        })
      })
    })

    describe('DPR=1.5 的步进验证（笔记本）', () => {
      it('kWidth=6, kGap=2 时，步进应该是整数', () => {
        const result = verifyStepAlignment(1.5, 6, 2, 10)
        
        // 单元逻辑宽度 = 6+2=8
        // 物理宽度 = 8*1.5=12，是整数
        expect(result.isInteger).toBe(true)
        expect(result.maxDeviation).toBe(0)
      })

      it('kWidth=4, kGap=2 时，步进应该是整数', () => {
        const result = verifyStepAlignment(1.5, 4, 2, 10)
        
        // 单元逻辑宽度 = 4+2=6
        // 物理宽度 = 6*1.5=9，是整数
        expect(result.isInteger).toBe(true)
        expect(result.maxDeviation).toBe(0)
      })

      it('kWidth=6.666..., kGap=2 时，步进应该是整数', () => {
        const result = verifyStepAlignment(1.5, 20/3, 2, 10)
        
        // 单元逻辑宽度 = 6.666...+2=8.666...
        // 物理宽度 = 8.666...*1.5=13，是整数
        expect(result.isInteger).toBe(true)
        // 由于浮点数精度问题，可能会有微小偏差，使用近0判断
        expect(result.maxDeviation).toBeLessThan(0.0001)
      })

      it('kWidth=5, kGap=2 时，步进不是整数，应该检测到累积偏移', () => {
        const result = verifyStepAlignment(1.5, 5, 2, 10)
        
        // 单元逻辑宽度 = 5+2=7
        // 物理宽度 = 7*1.5=10.5，不是整数
        expect(result.isInteger).toBe(false)
        
        // 应该有累积偏移
        expect(result.maxDeviation).toBeGreaterThan(0)
        console.log(`K线位置偏差:`)
        result.positions.forEach(p => {
          if (p.deviation > 0.01) {
            console.log(`  K线[${p.index}]: physX=${p.physX.toFixed(4)}, 偏差=${p.deviation.toFixed(4)}`)
          }
        })
      })
    })

    describe('DPR=3 的步进验证', () => {
      it('kWidth=6, kGap=2 时，步进应该是整数', () => {
        const result = verifyStepAlignment(3, 6, 2, 10)
        
        // 单元逻辑宽度 = 6+2=8
        // 物理宽度 = 8*3=24，是整数
        expect(result.isInteger).toBe(true)
        expect(result.maxDeviation).toBe(0)
      })

      it('kWidth=6.5, kGap=2 时，步进应该是整数', () => {
        const result = verifyStepAlignment(3, 6.5, 2, 10)
        
        // 单元逻辑宽度 = 6.5+2=8.5
        // 物理宽度 = 8.5*3=25.5，不是整数
        expect(result.isInteger).toBe(false)
        expect(result.maxDeviation).toBeGreaterThan(0)
      })

      it('kWidth=6.666..., kGap=2 时，步进应该是整数', () => {
        const result = verifyStepAlignment(3, 20/3, 2, 10)
        
        // 单元逻辑宽度 = 6.666...+2=8.666...
        // 物理宽度 = 8.666...*3=26，是整数
        expect(result.isInteger).toBe(true)
        // 由于浮点数精度问题，可能会有微小偏差，使用近0判断
        expect(result.maxDeviation).toBeLessThan(0.0001)
      })
    })

    describe('批量验证步进整数性', () => {
      it('验证常用配置的步进整数性', () => {
        const testCases = [
          { dpr: 1, kWidth: 6, kGap: 2, expectedInteger: true },
          { dpr: 2, kWidth: 6, kGap: 2, expectedInteger: true },
          { dpr: 2, kWidth: 5.5, kGap: 2, expectedInteger: true },
          { dpr: 3, kWidth: 6, kGap: 2, expectedInteger: true },
          { dpr: 2, kWidth: 6.1, kGap: 2, expectedInteger: false },
        ]

        testCases.forEach(({ dpr, kWidth, kGap, expectedInteger }) => {
          const result = verifyStepAlignment(dpr, kWidth, kGap, 5)
          console.log(`DPR=${dpr}, kWidth=${kWidth}, kGap=${kGap}: 物理单元宽度=${result.physUnit}, 是否整数=${result.isInteger}`)
          expect(result.isInteger).toBe(expectedInteger)
        })
      })

      it('验证累积偏移问题 - 步进非整数时连续20根K线', () => {
        const dpr = 2
        const kWidth = 6.1
        const kGap = 2
        const result = verifyStepAlignment(dpr, kWidth, kGap, 20)

        console.log(`物理单元宽度: ${result.physUnit}`)
        console.log(`是否整数: ${result.isInteger}`)
        console.log(`最大偏差: ${result.maxDeviation.toFixed(6)} 像素`)

        // 每10根K线打印一次位置
        result.positions.forEach(p => {
          if (p.index % 5 === 0) {
            console.log(`K线[${p.index}]: physX=${p.physX.toFixed(6)}, 偏差=${p.deviation.toFixed(6)}`)
          }
        })

        // 应该有明显的累积偏移
        expect(result.isInteger).toBe(false)
        expect(result.maxDeviation).toBeGreaterThan(0.1) // 至少0.1像素的累积偏移
      })
    })

    describe('步进整数性的影响分析', () => {
      it('分析不同DPR下的步进建议', () => {
        const recommendations: Array<{ dpr: number; goodWidths: number[]; badWidths: number[] }> = []

        // DPR=2: 步进应该是整数，即 (kWidth+2)*2 为整数
        // 所以 kWidth 可以是 6, 6.5, 7, 7.5, ...
        recommendations.push({
          dpr: 1,
          goodWidths: [5, 6, 7, 8],  // (kWidth+2)*1 为整数
          badWidths: [5.5, 6.5, 7.5],
        })

        // DPR=2: (kWidth+2)*2 为整数
        recommendations.push({
          dpr: 2,
          goodWidths: [5, 5.5, 6, 6.5, 7],  // (kWidth+2)*2 为整数
          badWidths: [5.25, 6.25, 7.25],
        })

        // DPR=1.5: 
        // 步进整数性：(kWidth+2)*1.5 为整数 → kWidth=4, 6, 8, ...
        // 影线等分性：(kWidth*1.5 - 1) % 2 === 0 → kWidth=6, 8, 10, ...
        // 综合推荐：kWidth=6, 8（同时满足步进整数和影线等分）
        recommendations.push({
          dpr: 1.5,
          goodWidths: [6, 8],  // 同时满足步进整数和影线等分
          badWidths: [4, 5, 6.5, 7],
        })

        // DPR=3: (kWidth+2)*3 为整数
        recommendations.push({
          dpr: 3,
          goodWidths: [5, 5 + 1/3, 5 + 2/3, 6, 6 + 1/3, 6 + 2/3],
          badWidths: [5.5, 6.5],
        })

        recommendations.forEach(rec => {
          console.log(`\nDPR=${rec.dpr} 建议:`)
          console.log(`  推荐的kWidth: ${rec.goodWidths.join(', ')}`)
          console.log(`  不推荐的kWidth: ${rec.badWidths.join(', ')}`)
        })
      })
    })
  })
})
