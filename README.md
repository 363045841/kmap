# kmap - 金融图表绘制库

[English](README_EN.md) | 简体中文

这是一个基于 Vue 3 和 Canvas 的金融图表绘制库，专注于提供高性能的 K 线图展示功能。该库支持横向滚动、移动平均线（MA）显示以及从多种数据源（包括 **BaoStock**、AKTools）获取金融数据。

![](https://s2.loli.net/2026/01/25/LObQPXmoN4ZdFey.png)

## 功能特性

- 📊 **K 线图绘制**：使用 Canvas 实现高性能的 K 线图绘制
- 🎯 **TradingView 级别稳定**：物理像素控制缩放，影线完美居中，无累积偏移
- 📈 **移动平均线**：支持 MA5、MA10、MA20 等多种移动平均线显示
- ↔️ **横向滚动**：支持大量历史数据的横向滚动浏览
- 🎨 **深色模式**：自动适配系统深色模式
- 📱 **响应式设计**：适配不同屏幕尺寸，支持所有设备像素比（DPR）
- ⚡ **高性能**：使用 requestAnimationFrame 优化渲染性能

## 技术栈

- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vite.dev/) - 下一代前端构建工具
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 类型检查
- [Canvas API](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API) - 图形绘制
- [BaoStock](http://baostock.com/) - 开源金融数据接口（推荐）
- [AKTools](https://github.com/akfamily/aktools) - 开源金融数据接口库（存在反爬限制）
- [Vitest](https://vitest.dev/) - 单元测试框架

## 项目结构

```
src/
├── api/                 # API 接口定义
│   └── data/
│       ├── kLine.ts     # 东财/AKTools K 线数据接口
│       └── baostock.ts  # BaoStock K 线数据接口（推荐）
├── components/          # 组件
│   └── KLineChart.vue   # K 线图主组件
├── core/               # 核心渲染引擎
│   ├── chart.ts         # 图表控制器
│   ├── draw/           # 像素对齐工具
│   │   └── pixelAlign.ts
│   ├── renderers/      # 渲染器
│   │   ├── candle.ts   # K 线渲染器
│   │   └── ...
│   ├── scale/          # 缩放控制
│   └── viewport/       # 视口管理
├── types/               # 类型定义
│   ├── kLine.ts         # K 线类型定义
│   └── price.ts         # 价格类型定义
├── utils/               # 工具函数
│   ├── kLineDraw/       # K 线绘制工具
│   ├── kline/           # K 线数据处理
│   └── mock/            # 模拟数据生成
├── stores/              # 状态管理 (Pinia)
└── assets/              # 静态资源
```

## 数据源

本项目支持多种数据源，通过统一接口实现无缝切换。

| 数据源 | 稳定性 | 反爬限制 | 推荐场景 |
|--------|--------|----------|----------|
| [BaoStock](http://baostock.com/) | ⭐⭐⭐ 高 | 无 | 生产环境（推荐） |
| [AKShare](https://github.com/akfamily/akshare) | ⭐⭐ 中 | 有 | 开发测试 |

### BaoStock（推荐）

BaoStock 是免费开源的 Python 证券数据接口，提供稳定可靠的金融数据服务。

- 官方文档：[http://www.baostock.com/mainContent?file=stockKData.md](http://www.baostock.com/mainContent?file=stockKData.md)

#### 快速开始

```bash
# 安装
uv pip install baostock

# 启动服务（需自行实现服务层或参考 BaoStock 文档）
python your_baostock_server.py
```

### AKShare

AKShare 基于 Python 的开源财经数据接口库，数据来源于东方财富等公开渠道。

- GitHub：[https://github.com/akfamily/akshare](https://github.com/akfamily/akshare)

> **⚠️ 注意：** 存在反爬机制，频繁请求可能导致 IP 被封禁

#### 快速开始

```bash
# 安装
uv pip install aktools

# 启动服务
uv run python -m aktools

# 或通过本项目脚本启动
pnpm aktools
```

### 数据接入配置

#### Vite 代理配置

本项目已配置双数据源代理：

```ts
// vite.config.ts
proxy: {
  '/api/stock': {          // BaoStock (端口 8000)
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
  '/api/public': {         // AKTools (端口 8080)
    target: 'http://127.0.0.1:8080',
    changeOrigin: true,
  },
}
```

#### 统一接口使用

```vue
<script setup lang="ts">
import { fetchKLineData, type KLineDataSourceConfig } from '@/api/data'

const DATA_SOURCE: 'baostock' | 'dongcai' = 'baostock'

const config: KLineDataSourceConfig = {
  symbol: '601360',        // 统一格式：纯代码
  startDate: '2024-01-01', // 统一格式：YYYY-MM-DD
  endDate: '2024-12-31',
  period: 'daily',
  adjust: 'qfq',
}

const data = await fetchKLineData(DATA_SOURCE, config)
</script>
```

#### 股票代码格式

| 市场 | 格式 | 示例 |
|------|------|------|
| 沪市A股 | `sh.` | `sh.600000` |
| 深市A股 | `sz.` | `sz.000001` |

## 使用方法

### 1. 安装依赖

```sh
pnpm install
```

### 2. 启动开发服务器

```sh
pnpm dev
```

### 3. 在组件中使用 K 线图

#### 方式一：使用 BaoStock 数据源（推荐）

```vue
<template>
  <KLineChart
    :data="klineData"
    :kWidth="10"
    :kGap="2"
    :yPaddingPx="60"
    :showMA="{ ma5: true, ma10: true, ma20: true }"
    :autoScrollToRight="true"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import KLineChart from '@/components/KLineChart.vue'
import { getKlineDataBaoStock } from '@/api/data/baostock'
import type { KLineData } from '@/types/price'
import { cache } from '@/utils/cache'

const klineData = ref<KLineData[]>([])

onMounted(async () => {
  const params = {
    symbol: 'sh.601360',      // 三六零股票代码（带市场前缀）
    start_date: '2024-01-01', // YYYY-MM-DD 格式
    end_date: '2024-12-31',
    period: 'daily' as const,
    adjust: 'qfq' as const,   // 前复权
  }

  // 缓存键
  const cacheKey = `kline:${params.symbol}:${params.start_date}:${params.end_date}`

  // 先尝试从缓存获取（1小时有效期）
  const cached = cache.get<KLineData[]>(cacheKey)
  if (cached) {
    klineData.value = cached
    return
  }

  // 从 API 获取
  const data = await getKlineDataBaoStock(params)
  klineData.value = data

  // 存入缓存
  cache.set(cacheKey, data)
})
</script>
```

#### 方式二：使用 AKTools 数据源

```vue
<script setup lang="ts">
import { getKlineDataDongCai } from '@/api/data/kLine'
import { toKLineData } from '@/types/price'

onMounted(async () => {
  const raw = await getKlineDataDongCai({
    symbol: '601360',
    period: 'daily',
    start_date: '20250501',   // YYYYMMDD 格式
    end_date: '20251230',
    adjust: 'qfq',
  })
  klineData.value = toKLineData(raw)
})
</script>
```

### 组件属性

| 属性              | 类型        | 默认值                                | 说明                           |
| ----------------- | ----------- | ------------------------------------- | ------------------------------ |
| data              | KLineData[] | []                                    | K 线数据数组                   |
| kWidth            | number      | 10                                    | K 线实体宽度                   |
| kGap              | number      | 2                                     | K 线间距                       |
| yPaddingPx        | number      | 60                                    | Y 轴上下留白像素               |
| showMA            | MAFlags     | { ma5: true, ma10: true, ma20: true } | 是否显示移动平均线             |
| autoScrollToRight | boolean     | true                                  | 数据更新后是否自动滚动到最右侧 |

## 环境要求

- Node.js: ^20.19.0 || >=22.12.0
- pnpm: 包管理器
- Python: 用于运行 AKTools 服务（可选）
- uv: Python 包与运行器（用于 `pnpm aktools`，可选但推荐）

## 构建与部署

### 生产环境构建

```sh
pnpm build
```

### 预览生产包

```sh
pnpm preview
```

## API 接口说明

### getKlineDataBaoStock

从 BaoStock 获取 K 线数据（推荐）。

**参数:**

```ts
interface BaoStockKLineRequest {
  symbol: string              // 股票代码，格式：sh.600000 或 sz.000001
  start_date: string          // 开始日期，格式：YYYY-MM-DD
  end_date: string            // 结束日期，格式：YYYY-MM-DD
  period?: 'daily' | 'weekly' | 'monthly' | '5' | '15' | '30' | '60'
  adjust?: 'qfq' | 'hfq' | 'none'  // qfq: 前复权, hfq: 后复权, none: 不复权
  timeout?: number            // 超时时间（秒）
}
```

**返回值:**
`Promise<KLineData[]>` - 已转换为标准格式的 K 线数据数组

**特性:**
- ✅ 支持 1 小时本地缓存
- ✅ 无反爬限制
- ✅ 数据自动按时间排序

### getKlineDataDongCai

从 AKTools/东方财富获取 K 线数据。

> **⚠️ 注意：** 此接口依赖 AKShare，存在反爬机制，频繁请求可能导致 IP 被封禁。

**参数:**

```ts
interface KLineDailyDongCaiRequest {
  symbol: string              // 股票代码
  period: 'daily' | 'weekly' | 'monthly' // 周期
  start_date: string          // 开始日期，格式：YYYYMMDD
  end_date: string            // 结束日期，格式：YYYYMMDD
  adjust?: 'qfq' | 'hfq'      // 复权方式，qfq: 前复权, hfq: 后复权
  timeout?: number            // 超时时间（秒）
}
```

**返回值:**
`Promise<KLineDailyDongCaiResponse[]>` - K 线数据数组（需调用 `toKLineData()` 转换）

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 许可证

本项目采用 MIT 许可证，详情请见 [LICENSE](./LICENSE) 文件。

## 相关链接

- [Vue.js 官方文档](https://vuejs.org/guide/introduction.html)
- [Vite 官方文档](https://vite.dev/guide/)
- [BaoStock 官方文档](http://baostock.com/)
- [AKTools 官方文档](https://github.com/akfamily/aktools)
- [AKShare 官方文档](https://akshare.akfamily.xyz/)
- [Canvas API MDN 文档](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API)
- [Vitest 官方文档](https://vitest.dev/)