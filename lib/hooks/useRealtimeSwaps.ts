'use client';

import { useCallback, useRef, useState } from 'react';
import { useWebSocketSubscription } from '@/lib/hooks/useWebSocketSubscription';
import type { WsMessage } from '@/lib/services/websocket';

export interface SwapEvent {
  hash: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  sender: string;
  timestamp: number;
}

export function useRealtimeSwaps(): { swaps: SwapEvent[]; connected: boolean } {
  const [swaps, setSwaps] = useState<SwapEvent[]>([]);
  const swapsRef = useRef<SwapEvent[]>([]);

  const onMessage = useCallback((msg: WsMessage) => {
    if (msg.channel === 'swaps' && msg.data) {
      const data = msg.data as { swaps?: SwapEvent[] };
      if (data.swaps) {
        swapsRef.current = [...data.swaps, ...swapsRef.current].slice(0, 50);
        setSwaps(swapsRef.current);
      }
    }
  }, []);

  const { connected } = useWebSocketSubscription({
    channel: 'swaps',
    onMessage,
  });

  return { swaps, connected };
}
