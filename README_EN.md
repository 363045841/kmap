# kmap - Financial Charting Library

English | [简体中文](README.md)

A financial charting library based on Vue 3 and Canvas, focusing on high-performance K-line (candlestick) chart rendering. The library supports horizontal scrolling, moving average (MA) display, and financial data retrieval from multiple sources including **BaoStock** and AKTools.

<img src="https://s2.loli.net/2026/02/01/7j9uHWIvrAGxFBC.png" alt="Example" style="border-radius: 8px;">

## Features

- **Canvas-based**: High-performance K-line chart rendering using Canvas
- **Responsive Design**: Adapts to different screen sizes, supports all device pixel ratios (DPR) for crisp rendering on any display
- **Framework-agnostic**: Core logic is completely independent, not tied to any specific framework

## Tech Stack

- [Vue 3](https://vuejs.org/) - Progressive JavaScript Framework
- [Rolldown Vite](https://vite.dev/guide/rolldown) - Next-generation frontend build tool with ultra-fast builds
- [TypeScript](https://www.typescriptlang.org/)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Vitest](https://vitest.dev/) - Unit testing framework

## Data Sources

- [BaoStock](http://baostock.com/) - Open-source financial data API, supports 100,000 API calls per day
- [AKTools](https://github.com/akfamily/aktools) - Open-source financial data API library (may have anti-scraping limitations)

## Install via NPM

```bash
npm i @363045841yyt/klinechart
```

## Project Structure

```
src/
├── api/                 # API interface definitions
│   └── data/
│       ├── kLine.ts     # DongCai/AKTools K-line data interface
│       └── baostock.ts  # BaoStock K-line data interface (Recommended)
├── components/          # Components
│   └── KLineChart.vue   # K-line chart main component
├── core/                # Core rendering engine
│   ├── chart.ts         # Chart controller
│   ├── draw/            # Pixel alignment tools
│   │   └── pixelAlign.ts
│   ├── renderers/       # Renderers
│   │   ├── candle.ts    # K-line renderer
│   │   └── ...
│   ├── scale/           # Scaling control
│   └── viewport/        # Viewport management
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

### BaoStock (Recommended)

BaoStock is a free and open-source Python securities data interface providing stable and reliable financial data services.

- Official Documentation: [http://www.baostock.com/mainContent?file=stockKData.md](http://www.baostock.com/mainContent?file=stockKData.md)

#### Quick Start

```bash
# Install
uv pip install baostock
```

Since BaoStock does not provide AkTools backend interface, you need to set up your own FastAPI service:
```bash
git clone https://github.com/363045841/stockbao.git

# Start service
python server.py
```

### AKShare

AKShare is a Python-based open-source financial data interface library with data sourced from public channels like East Money.

- GitHub: [https://github.com/akfamily/akshare](https://github.com/akfamily/akshare)

> **⚠️ Note:** This library connects directly to API, which may trigger anti-scraping mechanisms. Frequent requests may result in IP bans.

#### Quick Start

```bash
# Install
uv pip install aktools

# Start service
uv run python -m aktools

# Or start via project script
pnpm aktools
```

### Backend Data Source Configuration

#### Vite Proxy Configuration

This project has configured dual data source proxy:

```ts
// vite.config.ts
proxy: {
  '/api/stock': {          // BaoStock (port 8000)
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
  '/api/public': {         // AKTools (port 8080)
    target: 'http://127.0.0.1:8080',
    changeOrigin: true,
  },
}
```

#### Unified Interface Usage

```vue
<script setup lang="ts">
import { fetchKLineData, type KLineDataSourceConfig } from '@/api/data'

const DATA_SOURCE: 'baostock' | 'dongcai' = 'baostock'

// AKshare requires date in YYYYMMDD format, BaoStock requires date in YYYY-MM-DD format
const config: KLineDataSourceConfig = {
  symbol: '601360',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  period: 'daily',
  adjust: 'qfq',
}

const data = await fetchKLineData(DATA_SOURCE, config)
</script>
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

#### Option 1: Using BaoStock Data Source (Recommended)

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
    symbol: 'sh.601360',      // 360 Stock Code (with market prefix)
    start_date: '2024-01-01', // YYYY-MM-DD format
    end_date: '2024-12-31',
    period: 'daily' as const,
    adjust: 'qfq' as const,   // Forward adjusted
  }

  // Cache key
  const cacheKey = `kline:${params.symbol}:${params.start_date}:${params.end_date}`

  // Try to get from cache first (1 hour validity)
  const cached = cache.get<KLineData[]>(cacheKey)
  if (cached) {
    klineData.value = cached
    return
  }

  // Fetch from API
  const data = await getKlineDataBaoStock(params)
  klineData.value = data

  // Store in cache
  cache.set(cacheKey, data)
})
</script>
```

#### Option 2: Using AKTools Data Source

```vue
<script setup lang="ts">
import { getKlineDataDongCai } from '@/api/data/kLine'
import { toKLineData } from '@/types/price'

onMounted(async () => {
  const raw = await getKlineDataDongCai({
    symbol: '601360',
    period: 'daily',
    start_date: '20250501',   // YYYYMMDD format
    end_date: '20251230',
    adjust: 'qfq',
  })
  klineData.value = toKLineData(raw)
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

## Environment Requirements

- Node.js: ^20.19.0 || >=22.12.0
- pnpm: Package manager
- Python: For running AKTools service (optional)
- uv: Python package manager

## Build & Deployment

### Production Build

```sh
pnpm build
```

### Preview Production Build

```sh
pnpm preview
```

## Contributing

Issues and Pull Requests are welcome to improve this project.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) file for details.

## Related Links

- [Vue.js Official Documentation](https://vuejs.org/guide/introduction.html)
- [Vite Official Documentation](https://vite.dev/guide/)
- [BaoStock Documentation](http://baostock.com/)
- [AKTools Documentation](https://github.com/akfamily/aktools)
- [AKShare Documentation](https://akshare.akfamily.xyz/)
- [Canvas API MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Vitest Documentation](https://vitest.dev/)