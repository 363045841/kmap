# WebGL Visible Scene Canvas

## Decision

WebGL and WebGPU scene canvases are both mounted directly between the pane main canvas and overlay canvas. GPU-rendered primitives are no longer copied into Canvas2D with `drawImage`.

## Rationale

The former WebGL path copied every GPU-rendered layer into the pane's Canvas2D canvas. Multiple indicators therefore repeated a full-pane GPU-to-2D copy in one frame. Direct DOM composition lets the browser combine the GPU canvas with the transparent Canvas2D layers once at presentation time.

## Rendering Rules

Canvas2D stays above the GPU canvas and remains the fail-closed fallback when a GPU draw returns `false`. GPU fills bake alpha into their draw color because there is no longer a Canvas2D composite step to apply `globalAlpha`. Overlay passes bind their GPU region without clearing it, so they cannot erase the main GPU result.

## WebGL Antialiasing

WebGL owns one full-plot MSAA color buffer shared by every pane and GPU primitive. All drawing writes to that buffer through the existing region viewport and scissor; `Renderer.endFrame()` resolves it to the visible canvas once. This gives candles, lines, and fills the same 4x-MSAA target model as WebGPU and prevents a line renderer from replacing already-rendered candle pixels during its own resolve.

WebGL shaders project against each region's physical buffer dimensions. Candle edges are rounded to physical pixels before projection, matching WebGPU, so MSAA keeps diagonal geometry smooth without softening axis-aligned candle bodies or wicks.

## Frame Boundary

`SharedWebGLSurface` owns GPU state at two explicit levels. `beginFrame()` binds and optionally clears the complete MSAA target. `bindRegion()` is pane-scoped and only sets viewport and scissor while that frame is active. `endFrame()` disables pane scissor, resolves the whole target once, and restores neutral framebuffer state. Pane renderers cannot clear or resolve the shared target themselves.
