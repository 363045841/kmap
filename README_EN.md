# kmap - Financial Charting Library

[English](README_EN.md) | 简体中文

A financial charting library based on Vue 3 and Canvas, focusing on high-performance K-line (candlestick) chart rendering. The library supports horizontal scrolling, moving average (MA) display, and financial data retrieval from multiple sources including AKTools.

![](https://s2.loli.net/2026/01/25/LObQPXmoN4ZdFey.png)

## Features

- 📊 **K-line Chart**: High-performance K-line chart rendering using Canvas
- 🎯 **TradingView-level Stability**: Physical pixel control scaling, perfect wick centering, no cumulative offset
- 📈 **Moving Average**: Support for MA5, MA10, MA20 and other moving average lines
- ↔️ **Horizontal Scrolling**: Browse large amounts of historical data with horizontal scrolling
- 🎨 **Dark Mode**: Automatically adapts to system dark mode
- 📱 **Responsive Design**: Adapts to different screen sizes, supports all device pixel ratios (DPR)
- ⚡ **High Performance**: Optimized rendering with requestAnimationFrame

## Tech Stack

- [Vue 3](https://vuejs.org/) - Progressive JavaScript Framework
- [Vite](https://vite.dev/) - Next-generation frontend build tool
- [TypeScript](https://www.typescriptlang.org/) - JavaScript type checking
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) - Graphics rendering
- [AKTools](https://github.com/akfamily/aktools) - Open-source financial data API library
- [Vitest](https://vitest.dev/) - Unit testing framework

## Project Structure

```
src/
├── api/                 # API interface definitions
│   └── data/
│       └── kLine.ts     # K-line data interface
├── components/          # Components
│   └── KLineChart.vue   # K-line chart main component
├── core/               # Core rendering engine
│   ├── chart.ts         # Chart controller
│   ├── draw/           # Pixel alignment tools
│   │   └── pixelAlign.ts
│   ├── renderers/      # Renderers
│   │   ├── candle.ts   # K-line renderer
│   │   └── ...
│   ├── scale/          # Scaling control
│   └── viewport/       # Viewport management
├── types/               # Type definitions
│   ├── kLine.ts         # K-line type definitions
│   └── price.ts         # Price type definitions
├── utils/               # Utility functions
│   ├── kLineDraw/       # K-line drawing tools
│   ├── kline/           # K-line data processing
│   └── mock/            # Mock data generation
├── stores/              # State management (Pinia)
└── assets/              # Static resources
```

## Data Integration

### AKTools Data Integration

AKTools is an open-source financial data API library that can freely retrieve historical data for stocks, futures, options, and other financial products.

#### Install AKTools

Install using uv pip:

```bash
# Install uv (if not already installed)
pip install uv

# Install AKTools using uv
uv pip install aktools
```

Or install directly using pip:

```bash
pip install aktools
```

#### Start AKTools Data Service

Method 1: Run AKTools directly using uv

```bash
uv run python -m aktools
```

Method 2 (Recommended): Start through project script (automatically switches to `aktoolshttp/` in parent directory)

```bash
pnpm aktools
```

#### Mobile Access to Localhost (Development Mode) with AKTools API (Recommended)

If you want to use your mobile browser to access the `pnpm dev` page running on your local machine, while the frontend can also call the local AKTools API, it's recommended to use **Vite Proxy** (avoids CORS, and mobile doesn't need to connect directly to port 8080).

This project has been configured in `vite.config.ts`:

- dev server listens on `0.0.0.0`
- proxy forwarding: `/api` -> `http://127.0.0.1:8080`

Startup steps:

1. Start AKTools (local port 8080):

   ```bash
   pnpm aktools
   ```

2. Start frontend dev server (allow LAN access):

   ```bash
   pnpm dev:lan
   ```

3. Find your local LAN IP (e.g., `192.168.1.23`), access via mobile browser:

   ```
   http://192.168.1.23:5173
   ```

> Note: Keep the frontend request path as `VITE_API_PATH=/api/public/stock_zh_a_hist`. The browser request will first go to port 5173, then be forwarded by Vite proxy to local port 8080, so you typically won't encounter CORS issues.

If you previously hardcoded `VITE_API_BASE_URL=http://127.0.0.1:8080` in `.env`, the mobile device will resolve `127.0.0.1` to "itself", causing API connection failure. In this case, please leave `VITE_API_BASE_URL` empty (or delete that line) and let the frontend use relative paths and hand them to Vite proxy.

#### Configure Frontend Environment Variables

Create a `.env` file in the project root:

```
VITE_API_BASE_URL=http://127.0.0.1:8080
VITE_API_PATH=/api/public/stock_zh_a_hist
```

Then ensure environment variables are correctly loaded in [vite.config.ts](./vite.config.ts):

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

### Data Format

K-line data needs to include the following fields:

```ts
interface KLineDailyDongCaiResponse {
  日期: string // Date
  股票代码: string // Stock code
  开盘: number // Open price
  收盘: number // Close price
  最高: number // High price
  最低: number // Low price
  成交量: number // Volume
  成交额: number // Amount
  振幅: number // Amplitude
  涨跌幅: number // Percentage change
  涨跌额: number // Price change amount
  换手率: number // Turnover rate
}
```

## Usage

### 1. Install Dependencies

```sh
pnpm install
```

### 2. Start Development Server

```sh
pnpm dev
```

### 3. Use K-line Chart in Components

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
    symbol: '601360', // Stock code for Sanliu Liu
    period: 'daily',
    start_date: '20250501',
    end_date: '20251230',
    adjust: 'qfq', // Forward adjustment
  })
  klineData.value = toKLineData(raw) // Convert and sort data
})
</script>
```

### Component Props

| Prop              | Type        | Default                                | Description                           |
| ----------------- | ----------- | ------------------------------------- | ------------------------------ |
| data              | KLineData[] | []                                    | K-line data array                   |
| kWidth            | number      | 10                                    | K-line body width                   |
| kGap              | number      | 2                                     | K-line gap                       |
| yPaddingPx        | number      | 60                                    | Y-axis padding pixels               |
| showMA            | MAFlags     | { ma5: true, ma10: true, ma20: true } | Show moving average lines             |
| autoScrollToRight | boolean     | true                                  | Auto-scroll to right after data update |

## Rendering Engine Features

### TradingView-level Pixel Alignment

This project implements TradingView-level pixel alignment stability, ensuring perfect rendering across different device pixel ratios (DPR):

#### Core Technology

1. **Physical Pixel Control Scaling**
   - Scaling calculations in physical pixel space
   - Physical pixel steps by 2, ensuring odd width
   - Adapts to all devices: Normal (DPR=1), Retina (DPR=2), High-DPI (DPR=3)

2. **Integer Step, Avoid Cumulative Offset**
   - Direct physical pixel accumulation: `leftPx = startXPx + i * unitPx`
   - All-integer calculation, no floating-point errors
   - All K-line positions strictly aligned, no jitter

3. **Global Unified Odd-numbering**
   - Step and rendering use the same `kWidthPx`
   - Ensures physical width is odd
   - Wick perfectly divides body

4. **Wick Perfect Centering**
   - Wick position: `leftPx + (widthPx - 1) / 2`
   - Always at the true physical center of the body
   - Clear semantics, no dependency on `Math.floor`

#### Technical Details

- **Avoid Double Rounding**: Unified calculation in physical pixel space
- **Width Control**: Determine width first, then right boundary, avoiding rounding differences
- **fillRect Rendering**: 1 physical pixel wide wick, most stable
- **Integer Step**: All K-line physical positions are integers

### Test Coverage

✅ All 35 tests passing

- Physical pixel control scaling tests (4)
- Wick perfect centering tests (5)
- K-line body and wick alignment tests (26)
- Step integer validation

## Performance Optimization

- Use `requestAnimationFrame` to optimize rendering performance
- Use passive mode for high-frequency events like scrolling to improve responsiveness
- Use device pixel ratio (devicePixelRatio) when drawing on Canvas to ensure clear display on high-DPI screens
- Avoid path pollution by resetting paths (beginPath)
- Physical pixel integer calculation, avoid floating-point cumulative errors

## Environment Requirements

- Node.js: ^20.19.0 || >=22.12.0
- pnpm: Package manager
- Python: For running AKTools service (optional)
- uv: Python package and runner (for `pnpm aktools`, optional but recommended)

## Build & Deployment

### Production Build

```sh
pnpm build
```

### Preview Production Build

```sh
pnpm preview
```

## API Documentation

### getKlineDataDongCai

Async function to get K-line data.

**Parameters:**

```ts
interface KLineDailyDongCaiRequest {
  symbol: string // Stock code
  period: 'daily' | 'weekly' | 'monthly' // Period
  start_date: string // Start date, format: YYYYMMDD
  end_date: string // End date, format: YYYYMMDD
  adjust?: 'qfq' | 'hfq' // Adjustment method, qfq: forward, hfq: backward
  timeout?: number // Timeout (seconds)}
```

**Return Value:**
`Promise<KLineDailyDongCaiResponse[]>` - K-line data array

## Contributing

Issues and Pull Requests are welcome to improve this project.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) file for details.

## Related Links

- [Vue.js Official Documentation](https://vuejs.org/guide/introduction.html)
- [Vite Official Documentation](https://vite.dev/guide/)
- [AKTools Official Documentation](https://github.com/akfamily/aktools)
- [Canvas API MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Vitest Official Documentation](https://vitest.dev/)