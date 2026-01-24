import { describe, it, expect } from 'vitest'
import { createAlignedKLine } from '@/core/draw/pixelAlign'

/**
 * 测试物理像素控制下影线的完美居中
 * 
 * 核心验证：
 * - 物理kWidth为奇数时，影线应该能够完美等分实体
 * - 影线X坐标 = (左边界 + 右边界) / 2（物理像素空间）
 */

describe('影线完美居中验证', () => {
    it('DPR=1.5: 物理kWidth为奇数时，影线完美等分', () => {
        const dpr = 1.5
        
        console.log(`\n=== DPR=${dpr}, 物理kWidth为奇数时的影线居中 ===\n`)
        
        // 测试kWidth=6（物理宽度9px，奇数）
        const kWidth = 6
        const rectX = 10
        const rectY = 100
        const height = 50
        
        const aligned = createAlignedKLine(rectX, rectY, kWidth, height, dpr)
        
        console.log(`kWidth: ${kWidth}`)
        console.log(`物理宽度: ${aligned.physBodyWidth}px`)
        console.log(`是否奇数: ${aligned.physBodyWidth % 2 === 1}`)
        console.log(`是否完美对齐: ${aligned.isPerfectlyAligned}`)
        console.log(`\n物理坐标:`)
        console.log(`  实体左边界: ${aligned.physBodyLeft}px`)
        console.log(`  实体右边界: ${aligned.physBodyRight}px`)
        console.log(`  实体中心: ${aligned.physBodyCenter}px`)
        console.log(`  影线X: ${aligned.physWickX}px`)
        
        // 验证影线X = 实体中心
        expect(aligned.physWickX).toBe(aligned.physBodyCenter)
        
        // 验证物理宽度是奇数
        expect(aligned.physBodyWidth % 2).toBe(1)
        
        // 验证完美对齐
        expect(aligned.isPerfectlyAligned).toBe(true)
        
        console.log(`\n✓ 影线完美居中，实体宽度奇数可以完美等分`)
    })

    it('DPR=1.5: 测试缩放序列中的完美对齐', () => {
        const dpr = 1.5
        
        console.log(`\n=== DPR=${dpr}, 缩放序列中的完美对齐验证 ===\n`)
        
        // 模拟缩放序列（从kWidth=6开始）
        let kWidth = 6
        let perfectAlignedCount = 0
        const totalSteps = 10
        
        console.log('kWidth | 物理宽度 | 奇数 | 完美对齐')
        console.log('------|---------|------|----------')
        
        for (let i = 0; i < totalSteps; i++) {
            const aligned = createAlignedKLine(10, 100, kWidth, 50, dpr)
            const isOdd = aligned.physBodyWidth % 2 === 1
            const isPerfect = aligned.isPerfectlyAligned
            
            if (isPerfect) perfectAlignedCount++
            
            console.log(`${kWidth.toFixed(2).padStart(6)} | ${String(aligned.physBodyWidth).padEnd(8)} | ${isOdd ? '是  ' : '否  '} | ${isPerfect ? '是' : '否'}`)
            
            // 下一个kWidth（按物理像素+2）
            kWidth += 2 / dpr
        }
        
        console.log(`\n完美对齐: ${perfectAlignedCount}/${totalSteps}`)
        
        // 所有步骤都应该完美对齐（物理宽度都是奇数）
        expect(perfectAlignedCount).toBe(totalSteps)
    })

    it('DPR=2.0: 验证物理kWidth为奇数时的完美居中', () => {
        const dpr = 2.0
        
        console.log(`\n=== DPR=${dpr}, 物理kWidth为奇数时的影线居中 ===\n`)
        
        // 测试kWidth=6.5（物理宽度13px，奇数）
        const kWidth = 6.5
        const rectX = 10
        const rectY = 100
        const height = 50
        
        const aligned = createAlignedKLine(rectX, rectY, kWidth, height, dpr)
        
        console.log(`kWidth: ${kWidth}`)
        console.log(`物理宽度: ${aligned.physBodyWidth}px`)
        console.log(`是否奇数: ${aligned.physBodyWidth % 2 === 1}`)
        console.log(`是否完美对齐: ${aligned.isPerfectlyAligned}`)
        console.log(`\n物理坐标:`)
        console.log(`  实体左边界: ${aligned.physBodyLeft}px`)
        console.log(`  实体右边界: ${aligned.physBodyRight}px`)
        console.log(`  实体中心: ${aligned.physBodyCenter}px`)
        console.log(`  影线X: ${aligned.physWickX}px`)
        
        // 验证影线X = 实体中心
        expect(aligned.physWickX).toBe(aligned.physBodyCenter)
        
        // 验证物理宽度是奇数
        expect(aligned.physBodyWidth % 2).toBe(1)
        
        // 验证完美对齐
        expect(aligned.isPerfectlyAligned).toBe(true)
    })

    it('对比：奇数vs偶数物理宽度的影线位置', () => {
        const dpr = 1.5
        
        console.log(`\n=== DPR=${dpr}, 奇数vs偶数物理宽度对比 ===\n`)
        
        // 奇数物理宽度（kWidth=6，物理9px）
        const oddAligned = createAlignedKLine(10, 100, 6, 50, dpr)
        
        // 偶数物理宽度（kWidth=6.67，物理10px会被调整为11px奇数）
        const evenAligned = createAlignedKLine(10, 100, 6.67, 50, dpr)
        
        console.log('奇数物理宽度（9px）:')
        console.log(`  物理左边界: ${oddAligned.physBodyLeft}px`)
        console.log(`  物理右边界: ${oddAligned.physBodyRight}px`)
        console.log(`  影线X: ${oddAligned.physWickX}px`)
        console.log(`  左侧宽度: ${oddAligned.physWickX - oddAligned.physBodyLeft}px`)
        console.log(`  右侧宽度: ${oddAligned.physBodyRight - oddAligned.physWickX}px`)
        console.log(`  完美对齐: ${oddAligned.isPerfectlyAligned}`)
        
        console.log('\n偶数物理宽度输入（10px会被调整为11px）:')
        console.log(`  物理左边界: ${evenAligned.physBodyLeft}px`)
        console.log(`  物理右边界: ${evenAligned.physBodyRight}px`)
        console.log(`  影线X: ${evenAligned.physWickX}px`)
        console.log(`  左侧宽度: ${evenAligned.physWickX - evenAligned.physBodyLeft}px`)
        console.log(`  右侧宽度: ${evenAligned.physBodyRight - evenAligned.physWickX}px`)
        console.log(`  完美对齐: ${evenAligned.isPerfectlyAligned}`)
        
        // 奇数宽度应该完美对齐
        expect(oddAligned.isPerfectlyAligned).toBe(true)
        
        // 新实现会自动把偶数宽度调整为奇数，所以也完美对齐
        expect(evenAligned.isPerfectlyAligned).toBe(true)
        expect(evenAligned.physBodyWidth % 2).toBe(1)
    })

    it('验证物理像素控制方案保证奇数物理宽度', () => {
        const dpr = 1.5
        
        console.log(`\n=== DPR=${dpr}, 验证物理像素控制保证奇数宽度 ===\n`)
        
        // 模拟zoomAt的缩放逻辑
        const startKWidth = 6
        let physKWidth = Math.round(startKWidth * dpr)
        
        console.log('步骤 | kWidth | 物理宽度 | 奇数 | 完美对齐')
        console.log('------|--------|---------|------|----------')
        
        let perfectAlignedCount = 0
        for (let i = 0; i < 15; i++) {
            const kWidth = physKWidth / dpr
            const aligned = createAlignedKLine(10, 100, kWidth, 50, dpr)
            const isOdd = aligned.physBodyWidth % 2 === 1
            const isPerfect = aligned.isPerfectlyAligned
            
            if (isPerfect) perfectAlignedCount++
            
            console.log(`${String(i + 1).padStart(4)} | ${kWidth.toFixed(2).padStart(6)} | ${String(aligned.physBodyWidth).padEnd(8)} | ${isOdd ? '是  ' : '否  '} | ${isPerfect ? '是' : '否'}`)
            
            // 下一步：物理宽度+2，确保奇数
            physKWidth += 2
            if (physKWidth % 2 === 0) {
                physKWidth += 1
            }
        }
        
        console.log(`\n完美对齐: ${perfectAlignedCount}/15`)
        
        // 所有步骤都应该完美对齐
        expect(perfectAlignedCount).toBe(15)
        
        console.log(`\n✓ 物理像素控制方案（按2步进+确保奇数）保证所有缩放级别都完美对齐`)
    })
})