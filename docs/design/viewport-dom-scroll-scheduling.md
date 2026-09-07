# Viewport DOM Scroll Scheduling

## Decision

`viewportState` keeps `requestedScrollLeft` and all derived viewport state synchronous. `ChartRenderer` commits `container.scrollLeft` as the first side effect in its existing frame transaction, then draws from that same viewport state.

## Rationale

Pointer pan events can arrive more frequently than display refresh. Writing `scrollLeft` for every state update repeatedly asks the browser to process a native scroll position that will be overwritten before the next frame. A separate DOM rAF is also incorrect: it can commit before or after the canvas rAF, producing one-frame visual mismatch. Deferring business state instead would make interaction calculations observe stale positions.

## Boundaries

- State actions update the requested scroll position immediately and remain the source of truth.
- The content-width effect owns only `scrollContent.style.width`.
- `InteractionController` requests the existing render frame after programmatic pan; repeated pointer events are coalesced by `ChartRenderer`.
- `ChartRenderer` writes the latest scroll position only when it differs from the native value, then paints canvas in that same frame transaction.
- `viewportState` has no independent scroll scheduler, so it cannot mutate the DOM after renderer disposal or race canvas painting.
