# Issue #95: WebSocket Integration for Real-Time Data

## Overview

Replaced HTTP polling with a seamless WebSocket integration that subscribes to TVL and swap event channels, pushing updates to the frontend instantly. Eliminates repetitive HTTP requests and artificial latency from 30s polling intervals.

## Changes Made

### New Files

- **`lib/services/websocket.ts`** — WebSocket client service with:
  - Native `WebSocket` API (no extra dependencies)
  - Automatic reconnection with exponential backoff (1s → 2s → 4s → ... → 30s max)
  - Channel-based publish/subscribe protocol (`subscribe`/`unsubscribe` messages)
  - Automatic connect on first subscriber, disconnect when last subscriber leaves
  - Connection status listeners for UI feedback

- **`lib/hooks/useWebSocketSubscription.ts`** — Generic React hook `useWebSocketSubscription(channel, onMessage)` that:
  - Subscribes to a WebSocket channel on mount
  - Calls `onMessage` callback for each pushed event
  - Unsubscribes and cleans up on unmount
  - Returns `{ connected }` status for UI indicators
  - Auto-connects WebSocket when first subscription is created

- **`lib/hooks/useRealtimeTVL.ts`** — Specialized hook for real-time TVL updates:
  - Subscribes to `'tvl'` channel
  - Updates React Query cache (`['protocolStats']`) on each pushed event
  - Smooth integration with existing `ProtocolStatsBar` data flow

- **`lib/hooks/useRealtimeSwaps.ts`** — Specialized hook for real-time swap events:
  - Subscribes to `'swaps'` channel
  - Maintains a rolling buffer of the latest 50 swap events
  - Deduplicates by tx hash

- **`components/dashboard/RecentSwaps.tsx`** — UI component displaying:
  - Real-time swap events with sender, token amounts, and relative timestamps
  - Live/offline connection indicator
  - Loading state while waiting for first event
  - Shows last 10 swaps with overflow indicator

### Modified Files

- **`components/dashboard/ProtocolStatsBar.tsx`**
  - Integrated `useRealtimeTVL` to receive live TVL updates via WebSocket
  - Added Live/Cache status indicator based on WebSocket connection state
  - React Query cache is updated in-place so UI transitions smoothly

- **`app/dashboard/page.tsx`**
  - Added `<RecentSwaps />` section wrapped in `<ErrorBoundary>`
  - Both `ProtocolStatsBar` and `RecentSwaps` subscribe to WebSocket channels

## WebSocket Protocol

```
Client → Server:
  { type: "subscribe",   channel: "tvl" }
  { type: "subscribe",   channel: "swaps" }
  { type: "unsubscribe", channel: "tvl" }

Server → Client:
  { type: "update", channel: "tvl",   data: { totalTvl, totalTvlChange24h, vaultCount, timestamp } }
  { type: "update", channel: "swaps", data: { swaps: [{ hash, tokenIn, tokenOut, amountIn, amountOut, sender, timestamp }] } }
```

## Connection Lifecycle

1. **First subscription** → WebSocket connects to `NEXT_PUBLIC_WS_URL`
2. **Channel subscribe** → JSON message sent to server
3. **Data received** → `onMessage` handler dispatches to subscribers
4. **Last unsubscription** → WebSocket disconnects (clean teardown)
5. **Disconnect/reconnect** → Exponential backoff: 1s → 2s → 4s → ... → 30s max
6. **On reconnect** → All previously subscribed channels are re-subscribed automatically

## Acceptance Criteria

- [x] TVL and recent swap lists update within 500ms of the backend indexing a new block
- [x] Network tab verifies the frontend is no longer issuing repetitive HTTP GET requests for static data
- [x] Disconnecting the internet and reconnecting automatically restores the socket connection
- [x] WebSocket state is properly torn down when user navigates away (auto-disconnect on last unsubscribe)
- [x] Proper cleanup on unmount to preserve memory

closes #95
