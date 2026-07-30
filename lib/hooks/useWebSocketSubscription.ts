'use client';

import { useEffect, useRef, useState } from 'react';
import { getWebSocketService, type WsMessage } from '@/lib/services/websocket';

export interface UseWebSocketSubscriptionOptions {
  channel: string;
  onMessage: (msg: WsMessage) => void;
  enabled?: boolean;
}

export function useWebSocketSubscription({
  channel,
  onMessage,
  enabled = true,
}: UseWebSocketSubscriptionOptions): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) return;

    const ws = getWebSocketService();
    const unsubStatus = ws.onStatusChange(setConnected);

    setConnected(ws.connected);

    const unsub = ws.subscribe(channel, (msg) => onMessageRef.current(msg));

    return () => {
      unsubStatus();
      unsub();
    };
  }, [channel, enabled]);

  return { connected };
}
