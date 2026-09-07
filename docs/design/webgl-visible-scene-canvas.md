# WebGL Visible Scene Canvas

## Decision

WebGL and WebGPU scene canvases are both mounted directly between the pane main canvas and overlay canvas. GPU-rendered primitives are no longer copied into Canvas2D with `drawImage`.

## Rationale

The former WebGL path copied every GPU-rendered layer into the pane's Canvas2D canvas. Multiple indicators therefore repeated a full-pane GPU-to-2D copy in one frame. Direct DOM composition lets the browser combine the GPU canvas with the transparent Canvas2D layers once at presentation time.

## Rendering Rules

Canvas2D stays above the GPU canvas and remains the fail-closed fallback when a GPU draw returns `false`. GPU fills bake alpha into their draw color because there is no longer a Canvas2D composite step to apply `globalAlpha`. Overlay passes bind their GPU region without clearing it, so they cannot erase the main GPU result.
