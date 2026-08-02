'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { protocolStatsQueryKey } from '@/lib/hooks/queries/useProtocolStats';
import { useWebSocketSubscription } from '@/lib/hooks/useWebSocketSubscription';
import type { WsMessage } from '@/lib/services/websocket';

export interface TvlUpdate {
  totalTvl: number;
  totalTvlChange24h: number;
  vaultCount: number;
  timestamp: number;
}

export function useRealtimeTVL(): { connected: boolean; lastUpdate: TvlUpdate | null } {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<TvlUpdate | null>(null);

  const onMessage = useCallback(
    (msg: WsMessage) => {
      if (msg.channel === 'tvl' && msg.data) {
        const update = msg.data as TvlUpdate;
        setLastUpdate(update);
        queryClient.setQueryData(protocolStatsQueryKey, (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          return {
            ...(old as Record<string, unknown>),
            totalTvl: update.totalTvl,
            totalTvlChange24h: update.totalTvlChange24h,
            vaultCount: update.vaultCount,
          };
        });
      }
    },
    [queryClient],
  );

  const { connected } = useWebSocketSubscription({
    channel: 'tvl',
    onMessage,
  });

  return { connected, lastUpdate };
}
