import { describe, it, expect } from 'vitest'

/**
 * 测试物理像素控制的缩放方案
 * 
 * 方案特点：
 * - 物理kWidth按2步进（保证奇数）
 * - 物理kGap固定为3px
 * - 缩放连续平滑，无跳跃
 */

describe('物理像素控制缩放', () => {
    it('DPR=1.5: 验证物理kWidth序列', () => {
        const dpr = 1.5
        const PHYS_K_GAP = 3
        
        console.log(`\n=== DPR=${dpr}, 物理kGap=${PHYS_K_GAP}px ===\n`)
        
        // 模拟从kWidth=6开始的缩放序列
        const startKWidth = 6
        const physStartWidth = Math.round(startKWidth * dpr)
        
        console.log(`初始: kWidth=${startKWidth}, 物理宽度=${physStartWidth}px (${physStartWidth % 2 === 1 ? '奇数' : '偶数'})`)
        
        const sequence: Array<{ kWidth: number, physWidth: number, isOdd: boolean }> = []
        let currentPhysWidth = physStartWidth
        
        // 模拟10次放大
        for (let i = 1; i <= 10; i++) {
            currentPhysWidth += 2
            
            // 确保奇数
            if (currentPhysWidth % 2 === 0) {
                currentPhysWidth += 1
            }
            
            const newKWidth = currentPhysWidth / dpr
            const isOdd = currentPhysWidth % 2 === 1
            
            sequence.push({
                kWidth: Number(newKWidth.toFixed(2)),
                physWidth: currentPhysWidth,
                isOdd
            })
            
            console.log(`步骤${i}: kWidth=${newKWidth.toFixed(2)}, 物理宽度=${currentPhysWidth}px (${isOdd ? '奇数✓' : '偶数✗'})`)
        }
        
        // 验证所有物理宽度都是奇数
        const allOdd = sequence.every(item => item.isOdd)
        expect(allOdd).toBe(true)
        
        // 计算逻辑像素间隔
        const gaps: number[] = []
        for (let i = 1; i < sequence.length; i++) {
            gaps.push(sequence[i].kWidth - sequence[i - 1].kWidth)
        }
        
        console.log(`\n逻辑像素间隔: ${gaps.map(g => g.toFixed(2)).join(', ')}`)
        console.log(`平均间隔: ${(gaps.reduce((a,b) => a+b, 0) / gaps.length).toFixed(2)}`)
        
        // 验证间隔相对均匀（DPR=1.5时理论间隔是1.33）
        const avgGap = gaps.reduce((a,b) => a+b, 0) / gaps.length
        expect(avgGap).toBeGreaterThan(1)
        expect(avgGap).toBeLessThan(2)
    })

    it('DPR=2.0: 验证物理kWidth序列', () => {
        const dpr = 2.0
        const PHYS_K_GAP = 3
        
        console.log(`\n=== DPR=${dpr}, 物理kGap=${PHYS_K_GAP}px ===\n`)
        
        // 模拟从kWidth=6.5开始的缩放序列
        const startKWidth = 6.5
        const physStartWidth = Math.round(startKWidth * dpr)
        
        console.log(`初始: kWidth=${startKWidth}, 物理宽度=${physStartWidth}px (${physStartWidth % 2 === 1 ? '奇数' : '偶数'})`)
        
        const sequence: Array<{ kWidth: number, physWidth: number, isOdd: boolean }> = []
        let currentPhysWidth = physStartWidth
        
        // 模拟10次放大
        for (let i = 1; i <= 10; i++) {
            currentPhysWidth += 2
            
            // 确保奇数
            if (currentPhysWidth % 2 === 0) {
                currentPhysWidth += 1
            }
            
            const newKWidth = currentPhysWidth / dpr
            const isOdd = currentPhysWidth % 2 === 1
            
            sequence.push({
                kWidth: Number(newKWidth.toFixed(2)),
                physWidth: currentPhysWidth,
                isOdd
            })
            
            console.log(`步骤${i}: kWidth=${newKWidth.toFixed(2)}, 物理宽度=${currentPhysWidth}px (${isOdd ? '奇数✓' : '偶数✗'})`)
        }
        
        // 验证所有物理宽度都是奇数
        const allOdd = sequence.every(item => item.isOdd)
        expect(allOdd).toBe(true)
        
        // 计算逻辑像素间隔
        const gaps: number[] = []
        for (let i = 1; i < sequence.length; i++) {
            gaps.push(sequence[i].kWidth - sequence[i - 1].kWidth)
        }
        
        console.log(`\n逻辑像素间隔: ${gaps.map(g => g.toFixed(2)).join(', ')}`)
        console.log(`平均间隔: ${(gaps.reduce((a,b) => a+b, 0) / gaps.length).toFixed(2)}`)
    })

    it('对比：物理像素控制 vs 逻辑像素搜索', () => {
        const dpr = 1.5
        
        console.log(`\n=== DPR=${dpr} 两种方案对比 ===\n`)
        
        // 方案A：物理像素控制（新方案）
        console.log('方案A：物理像素控制')
        const physSequence: number[] = []
        let physWidth = Math.round(6 * dpr)
        
        for (let i = 0; i < 20; i++) {
            physSequence.push(physWidth / dpr)
            physWidth += 2
            if (physWidth % 2 === 0) physWidth += 1
        }
        
        console.log(`  序列: ${physSequence.slice(0, 10).map(v => v.toFixed(2)).join(', ')}...`)
        console.log(`  数量: ${physSequence.length} 个`)
        
        // 方案B：逻辑像素搜索（旧方案，只要求步进整数）
        console.log('\n方案B：逻辑像素搜索（只要求步进整数）')
        const logicSequence: number[] = []
        for (let w = 2; w <= 50; w += 0.1) {
            const physUnit = Math.round((w + 2) * dpr)
            const stepIsInteger = Math.abs((w + 2) * dpr - physUnit) < 0.0001
            if (stepIsInteger) {
                logicSequence.push(w)
            }
        }
        
        console.log(`  序列: ${logicSequence.slice(0, 10).map(v => v.toFixed(2)).join(', ')}...`)
        console.log(`  数量: ${logicSequence.length} 个`)
        
        // 计算间隔对比
        const physGaps: number[] = []
        for (let i = 1; i < physSequence.length; i++) {
            physGaps.push(physSequence[i] - physSequence[i - 1])
        }
        
        const logicGaps: number[] = []
        for (let i = 1; i < logicSequence.length; i++) {
            logicGaps.push(logicSequence[i] - logicSequence[i - 1])
        }
        
        console.log(`\n间隔对比:`)
        console.log(`  方案A: 最小${Math.min(...physGaps).toFixed(2)}, 最大${Math.max(...physGaps).toFixed(2)}, 平均${(physGaps.reduce((a,b) => a+b, 0) / physGaps.length).toFixed(2)}`)
        console.log(`  方案B: 最小${Math.min(...logicGaps).toFixed(2)}, 最大${Math.max(...logicGaps).toFixed(2)}, 平均${(logicGaps.reduce((a,b) => a+b, 0) / logicGaps.length).toFixed(2)}`)
        
        // 验证物理像素控制的间隔更均匀
        const physMaxGap = Math.max(...physGaps)
        const logicMaxGap = Math.max(...logicGaps)
        expect(physMaxGap).toBeLessThan(logicMaxGap)
    })

    it('不同DPR下的物理kWidth序列', () => {
        const dprs = [1.0, 1.5, 2.0, 3.0]
        
        console.log(`\n=== 不同DPR下的物理kWidth序列（前10个） ===\n`)
        
        dprs.forEach(dpr => {
            const sequence: number[] = []
            let physWidth = Math.round(6 * dpr)
            
            for (let i = 0; i < 10; i++) {
                sequence.push(physWidth / dpr)
                physWidth += 2
                if (physWidth % 2 === 0) physWidth += 1
            }
            
            // 计算间隔
            const gaps: number[] = []
            for (let i = 1; i < sequence.length; i++) {
                gaps.push(sequence[i] - sequence[i - 1])
            }
            
            console.log(`DPR=${dpr}:`)
            console.log(`  序列: ${sequence.map(v => v.toFixed(2)).join(', ')}`)
            console.log(`  间隔: ${gaps.map(g => g.toFixed(2)).join(', ')}`)
            console.log(`  平均间隔: ${(gaps.reduce((a,b) => a+b, 0) / gaps.length).toFixed(2)}`)
            console.log()
            
            // 验证从第二次开始，所有物理宽度都是奇数
            // （初始值可能不是奇数，但调整后应该是）
            const allOddAfterFirst = sequence.slice(1).every(w => Math.round(w * dpr) % 2 === 1)
            expect(allOddAfterFirst).toBe(true)
        })
    })
})