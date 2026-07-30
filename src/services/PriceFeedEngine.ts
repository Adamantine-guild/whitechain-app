// Real-Time WebSockets Price Feed Engine
// Solves whitechain-app Issue #63 ($100 USDC Bounty)

export class PriceFeedEngine {
  private ws: WebSocket | null = null;
  private subscribers: Array<(price: number) => void> = [];

  constructor(private url: string = 'wss://ws.pyth.network') {}

  public connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.price) {
          this.subscribers.forEach((cb) => cb(data.price));
        }
      } catch (err) {
        console.error('Error parsing price feed:', err);
      }
    };
  }

  public subscribe(callback: (price: number) => void) {
    this.subscribers.push(callback);
  }

  public disconnect() {
    this.ws?.close();
  }
}
