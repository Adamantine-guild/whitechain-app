'use client';

export interface WsMessage {
  type: 'update' | 'subscribed' | 'unsubscribed' | 'error';
  channel: string;
  data?: unknown;
}

type MessageHandler = (msg: WsMessage) => void;

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string | null = null;
  private handlerMap = new Map<string, Set<MessageHandler>>();
  private backoff = INITIAL_BACKOFF_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private subscribedChannels = new Set<string>();
  private _connected = false;
  private statusListeners = new Set<(connected: boolean) => void>();

  get connected(): boolean {
    return this._connected;
  }

  get subscriptionCount(): number {
    return this.handlerMap.size;
  }

  connect(url: string): void {
    this.url = url;
    this.destroyed = false;
    this.createConnection();
  }

  private createConnection(): void {
    if (!this.url || this.destroyed) return;
    if (this.ws) this.cleanup();

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this._connected = true;
      this.backoff = INITIAL_BACKOFF_MS;
      this.resubscribeAll();
      this.notifyStatus();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg: WsMessage = JSON.parse(event.data as string);
        this.dispatch(msg);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this._connected = false;
      this.notifyStatus();
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private resubscribeAll(): void {
    for (const channel of this.subscribedChannels) {
      this.send({ type: 'subscribe', channel });
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
      this.createConnection();
    }, this.backoff);
  }

  private send(msg: { type: string; channel: string }): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  subscribe(
    channel: string,
    onMessage: MessageHandler,
  ): () => void {
    if (!this.handlerMap.has(channel)) {
      this.handlerMap.set(channel, new Set());
    }
    this.handlerMap.get(channel)!.add(onMessage);

    if (!this.subscribedChannels.has(channel)) {
      this.subscribedChannels.add(channel);
      this.send({ type: 'subscribe', channel });
    }

    if (this.subscriptionCount === 1 && !this._connected && this.url) {
      this.destroyed = false;
      this.createConnection();
    }

    return () => {
      const set = this.handlerMap.get(channel);
      if (!set) return;
      set.delete(onMessage);
      if (set.size === 0) {
        this.handlerMap.delete(channel);
        this.subscribedChannels.delete(channel);
        this.send({ type: 'unsubscribe', channel });
      }
      if (this.subscriptionCount === 0) {
        this.disconnect();
      }
    };
  }

  onStatusChange(listener: (connected: boolean) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private dispatch(msg: WsMessage): void {
    const handlers = this.handlerMap.get(msg.channel);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(msg);
    }
  }

  private notifyStatus(): void {
    for (const listener of this.statusListeners) {
      listener(this._connected);
    }
  }

  private cleanup(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
  }

  disconnect(): void {
    this.destroyed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanup();
    this._connected = false;
    this.notifyStatus();
  }
}

const globalWsService = new WebSocketService();

export function getWebSocketService(): WebSocketService {
  return globalWsService;
}
