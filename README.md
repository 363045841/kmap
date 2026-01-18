# kmap - 金融图表绘制库

这是一个基于 Vue 3 和 Canvas 的金融图表绘制库，专注于提供高性能的 K 线图展示功能。该库支持横向滚动、移动平均线（MA）显示以及从多种数据源（包括 AKTools）获取金融数据。

![](https://s2.loli.net/2026/01/19/cP7pe9hyIV2gqBt.png)

## 功能特性

- 📊 **K 线图绘制**：使用 Canvas 实现高性能的 K 线图绘制
- 📈 **移动平均线**：支持 MA5、MA10、MA20 等多种移动平均线显示
- ↔️ **横向滚动**：支持大量历史数据的横向滚动浏览
- 🎨 **深色模式**：自动适配系统深色模式
- 📱 **响应式设计**：适配不同屏幕尺寸
- ⚡ **高性能**：使用 requestAnimationFrame 优化渲染性能

## 技术栈

- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vite.dev/) - 下一代前端构建工具
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 类型检查
- [Canvas API](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API) - 图形绘制
- [AKTools](https://github.com/akfamily/aktools) - 开源金融数据接口库

## 项目结构

```
src/
├── api/                 # API 接口定义
│   └── data/
│       └── kLine.ts     # K 线数据接口
├── components/          # 组件
│   └── KLineChart.vue   # K 线图主组件
├── types/               # 类型定义
│   ├── kLine.ts         # K 线类型定义
│   └── price.ts         # 价格类型定义
├── utils/               # 工具函数
│   ├── draw/            # 绘制工具
│   │   ├── kLine.ts     # K 线绘制
│   │   └── MA.ts        # 移动平均线绘制
│   ├── mock/            # 模拟数据生成
│   ├── logger.ts        # 日志工具
│   └── priceToY.ts      # 价格转 Y 坐标
├── stores/              # 状态管理 (Pinia)
└── assets/              # 静态资源
```

## 数据接入

### AKTools 数据接入

AKTools 是一个开源的金融数据接口库，可以免费获取股票、期货、期权等金融产品的历史数据。

#### 安装 AKTools

使用 uv pip 安装:

```bash
# 安装 uv（如果尚未安装）
pip install uv

# 使用 uv 安装 AKTools
uv pip install aktools
```

或者直接使用 pip 安装:

```bash
pip install aktools
```

#### 启动 AKTools 数据服务

方法一：使用 uv 直接运行 AKTools

```bash
uv run python -m aktools
```

方法一（推荐）：通过本项目脚本启动（会自动切换到上级目录的 `aktoolshttp/`）

```bash
pnpm aktools
```

#### 手机访问本机（开发模式）并调用 AKTools API（推荐）

如果你希望用手机浏览器访问本机正在运行的 `pnpm dev` 页面，同时前端还能调用本机的 AKTools API，推荐使用 **Vite 代理**（避免 CORS，且手机不需要直连 8080）。

本项目已在 `vite.config.ts` 配置：

- dev server 监听 `0.0.0.0`
- 代理转发：`/api` -> `http://127.0.0.1:8080`

启动步骤：

1. 启动 AKTools（本机 8080）：

   ```bash
   pnpm aktools
   ```

2. 启动前端 dev server（允许局域网访问）：

   ```bash
   pnpm dev:lan
   ```

3. 查找本机局域网 IP（例如 `192.168.1.23`），手机浏览器访问：

   ```
   http://192.168.1.23:5173
   ```

> 说明：前端请求路径保持 `VITE_API_PATH=/api/public/stock_zh_a_hist`，浏览器请求会先到 5173，再由 Vite 代理到本机 8080，因此通常不会遇到跨域问题。

如果你之前在 `.env` 写死了 `VITE_API_BASE_URL=http://127.0.0.1:8080`，手机端会把 `127.0.0.1` 解析成“手机自己”，从而导致 API 连接失败。此时请把 `VITE_API_BASE_URL` 留空（或删除该行），让前端走相对路径并交给 Vite 代理。

方法二：创建自定义后端服务
除了使用 AKTools 自带的服务外，你也可以根据需要创建自定义的后端服务来处理数据。

#### 配置前端环境变量

在项目根目录创建 `.env` 文件：

```
VITE_API_BASE_URL=http://127.0.0.1:8080
VITE_API_PATH=/api/public/stock_zh_a_hist
```

然后在 [vite.config.ts](file:///d:/Code/kmap/kmap/vite.config.ts) 中确保环境变量被正确加载：

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  define: {
    'process.env': process.env,
  },
})
```

### 数据格式

K 线数据需要包含以下字段：

```ts
interface KLineDailyDongCaiResponse {
  日期: string // 日期
  股票代码: string // 股票代码
  开盘: number // 开盘价
  收盘: number // 收盘价
  最高: number // 最高价
  最低: number // 最低价
  成交量: number // 成交量
  成交额: number // 成交额
  振幅: number // 振幅
  涨跌幅: number // 涨跌幅
  涨跌额: number // 涨跌额
  换手率: number // 换手率
}
```

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
import { getKlineDataDongCai } from '@/api/data/kLine'
import { toKLineData, type KLineData } from '@/types/price'

const klineData = ref<KLineData[]>([])

onMounted(async () => {
  const raw = await getKlineDataDongCai({
    symbol: '601360', // 三六零股票代码
    period: 'daily',
    start_date: '20250501',
    end_date: '20251230',
    adjust: 'qfq', // 前复权
  })
  klineData.value = toKLineData(raw) // 转换并排序数据
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

## 性能优化

- 使用 `requestAnimationFrame` 优化渲染性能
- 对于滚动等高频事件，使用 passive 模式提升响应性能
- Canvas 绘制时使用设备像素比（devicePixelRatio）确保在高分屏上清晰显示
- 通过路径重置（beginPath）避免路径污染

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

### getKlineDataDongCai

获取 K 线数据的异步函数。

**参数:**

```ts
interface KLineDailyDongCaiRequest {
  symbol: string // 股票代码
  period: 'daily' | 'weekly' | 'monthly' // 周期
  start_date: string // 开始日期，格式：YYYYMMDD
  end_date: string // 结束日期，格式：YYYYMMDD
  adjust?: 'qfq' | 'hfq' // 复权方式，qfq: 前复权, hfq: 后复权
  timeout?: number // 超时时间（秒）
}
```

**返回值:**
`Promise<KLineDailyDongCaiResponse[]>` - K 线数据数组

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。

## 许可证

本项目采用 MIT 许可证，详情请见 [LICENSE](./LICENSE) 文件。

## 相关链接

- [Vue.js 官方文档](https://vuejs.org/guide/introduction.html)
- [Vite 官方文档](https://vite.dev/guide/)
- [AKTools 官方文档](https://github.com/akfamily/aktools)
- [Canvas API MDN 文档](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API)
