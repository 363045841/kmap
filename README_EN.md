# kmap - Financial Charting Library

[English](README_EN.md) | 简体中文

A financial charting library based on Vue 3 and Canvas, focusing on high-performance K-line (candlestick) chart rendering. The library supports horizontal scrolling, moving average (MA) display, and financial data retrieval from multiple sources including **BaoStock** and AKTools.

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
- [BaoStock](http://baostock.com/) - Open-source financial data API (Recommended)
- [AKTools](https://github.com/akfamily/aktools) - Open-source financial data API library (Anti-scraping limitations)
- [Vitest](https://vitest.dev/) - Unit testing framework

## Project Structure

```
src/
├── api/                 # API interface definitions
│   └── data/
│       ├── kLine.ts     # DongCai/AKTools K-line data interface
│       ├── baostock.ts  # BaoStock K-line data interface (Recommended)
│       ├── types.ts     # Unified data source types
│       └── unified.ts   # Unified data source entry
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

## Data Sources

This project supports multiple data sources with seamless switching through a unified interface.

| Data Source | Stability | Anti-scraping | Recommended Use |
|-------------|-----------|---------------|-----------------|
| [BaoStock](http://baostock.com/) | ⭐⭐⭐ High | None | Production (Recommended) |
| [AKShare](https://github.com/akfamily/akshare) | ⭐⭐ Medium | Yes | Development/Testing |

### BaoStock (Recommended)

BaoStock is a free and open-source Python securities data interface providing stable and reliable financial data services.

- Documentation: [http://www.baostock.com/mainContent?file=stockKData.md](http://www.baostock.com/mainContent?file=stockKData.md)

#### Quick Start

```bash
# Install
uv pip install baostock

# Start service (implement your own server layer or refer to BaoStock docs)
python your_baostock_server.py
```

### AKShare

AKShare is a Python-based open-source financial data interface library with data sourced from public channels like East Money.

- GitHub: [https://github.com/akfamily/akshare](https://github.com/akfamily/akshare)

> **⚠️ Note:** Anti-scraping mechanisms exist. Frequent requests may result in IP bans.

#### Quick Start

```bash
# Install
uv pip install aktools

# Start service
uv run python -m aktools

# Or use project script
pnpm aktools
```

### Data Integration Configuration

#### Vite Proxy Configuration

Dual data source proxy is pre-configured:

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

const config: KLineDataSourceConfig = {
  symbol: '601360',        // Unified format: pure code
  startDate: '2024-01-01', // Unified format: YYYY-MM-DD
  endDate: '2024-12-31',
  period: 'daily',
  adjust: 'qfq',
}

const data = await fetchKLineData(DATA_SOURCE, config)
</script>
```

#### Stock Code Format

| Market | Format | Example |
|--------|--------|---------|
| Shanghai A-Shares | `sh.` | `sh.600000` |
| Shenzhen A-Shares | `sz.` | `sz.000001` |

#### Mobile Development

For mobile browser access to local dev server:

1. Start data service (BaoStock on 8000 or AKTools on 8080)
2. Start frontend with LAN access: `pnpm dev:lan`
3. Access via mobile: `http://<your-ip>:5173`

> Frontend requests go through Vite proxy to avoid CORS issues.

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
import { fetchKLineData, type KLineDataSourceConfig } from '@/api/data'
import type { KLineData } from '@/types/price'
import { cache } from '@/utils/cache'

const klineData = ref<KLineData[]>([])
const DATA_SOURCE: 'baostock' | 'dongcai' = 'baostock'

onMounted(async () => {
  const config: KLineDataSourceConfig = {
    symbol: '601360',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    period: 'daily',
    adjust: 'qfq',
  }

  const cacheKey = `kline:${DATA_SOURCE}:${config.symbol}:${config.startDate}:${config.endDate}`

  const cached = cache.get<KLineData[]>(cacheKey)
  if (cached) {
    klineData.value = cached
    return
  }

  const data = await fetchKLineData(DATA_SOURCE, config)
  klineData.value = data
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

### fetchKLineData

Unified async function to get K-line data from multiple sources.

**Parameters:**

```ts
// Data source type
 type: 'baostock' | 'dongcai'

// Unified configuration
interface KLineDataSourceConfig {
  symbol: string              // Stock code (pure code without prefix)
  startDate: string           // Start date, format: YYYY-MM-DD
  endDate: string             // End date, format: YYYY-MM-DD
  period: 'daily' | 'weekly' | 'monthly' | '5min' | '15min' | '30min' | '60min'
  adjust: 'qfq' | 'hfq' | 'none'
  timeout?: number            // Timeout (seconds)
}
```

**Return Value:**
`Promise<KLineData[]>` - Standardized K-line data array

**Features:**
- ✅ Supports 1-hour local caching
- ✅ Unified interface for multiple data sources
- ✅ Automatic data format conversion
- ✅ Automatic time sorting

### getKlineDataBaoStock

Direct access to BaoStock API (internal use).

**Parameters:**

```ts
interface BaoStockKLineRequest {
  symbol: string              // Stock code with prefix: sh.600000 or sz.000001
  start_date: string          // Start date, format: YYYY-MM-DD
  end_date: string            // End date, format: YYYY-MM-DD
  period?: 'daily' | 'weekly' | 'monthly' | '5' | '15' | '30' | '60'
  adjust?: 'qfq' | 'hfq' | 'none'
  timeout?: number
}
```

### getKlineDataDongCai

Direct access to AKTools/East Money API (internal use).

> **⚠️ Note:** This interface depends on AKShare with anti-scraping mechanisms. Frequent requests may result in IP bans.

**Parameters:**

```ts
interface KLineDailyDongCaiRequest {
  symbol: string
  period: 'daily' | 'weekly' | 'monthly'
  start_date: string          // Format: YYYYMMDD
  end_date: string            // Format: YYYYMMDD
  adjust?: 'qfq' | 'hfq'
  timeout?: number
}
```

**Return Value:**
`Promise<KLineDailyDongCaiResponse[]>` - Raw data array (requires `toKLineData()` conversion)

## Contributing

Issues and Pull Requests are welcome to improve this project.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) file for details.

## Related Links

- [Vue.js Official Documentation](https://vuejs.org/guide/introduction.html)
- [Vite Official Documentation](https://vite.dev/guide/)
- [BaoStock Documentation](http://www.baostock.com/mainContent?file=stockKData.md)
- [AKShare GitHub](https://github.com/akfamily/akshare)
- [AKTools Official Documentation](https://github.com/akfamily/aktools)
- [Canvas API MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Vitest Official Documentation](https://vitest.dev/)