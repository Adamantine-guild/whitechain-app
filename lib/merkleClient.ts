import { buildMerkleTree, type BytesLike, type MerkleTree } from './merkle';

/**
 * Promise-based client for off-main-thread Merkle tree hashing.
 *
 * - When a Web Worker is available AND the caller didn't opt out via
 *   `useWorker: false`, the work is dispatched to a Dedicated Worker
 *   loaded from `./workers/crypto.worker.ts`. The main thread stays
 *   free, so 10,000 keccak hashes don't lock the UI — the issue's
 *   acceptance criterion.
 * - When `Worker` is undefined (very old browsers, sandboxed iframes,
 *   SSR, tests), we fall back to running the same `buildMerkleTree` on
 *   the main thread. To preserve responsiveness we pass a `setTimeout(0)`
 *   yielder into `buildMerkleTree.shouldYield` so paint cycles slip
 *   in between hash batches — matching the worker-path UX without a
 *   worker.
 * - `AbortSignal` cancels in-flight work in both paths; both reject
 *   with `DOMException('AbortError')`.
 */

export interface BuildOptions {
  onProgress?: (processed: number, total: number) => void;
  signal?: AbortSignal;
  /** Force-disable worker dispatch even if the runtime supports it. */
  useWorker?: boolean;
}

/**
 * Abstract Worker surface used by the client. The real `Worker` matches
 * this; tests inject a mock that records posted messages and synthesises
 * inbound events without spinning up a real worker.
 */
export interface WorkerLike {
  postMessage: (message: unknown) => void;
  addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void;
  removeEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void;
  terminate: () => void;
}

export type WorkerFactory = () => WorkerLike;

/** Detect at module-init whether a real Web Worker is constructible. */
export function supportsWorkers(): boolean {
  return typeof Worker !== 'undefined';
}

/**
 * Build the default factory lazily so static analysers in non-webpack
 * runners (e.g. Vitest) don't trip on the worker import during non-
 * browser test runs. The factory body is the only place `new Worker`
 * appears in this file.
 */
const defaultWorkerFactory: WorkerFactory | null = (() => {
  if (typeof Worker === 'undefined') return null;
  return () => {
    const worker = new Worker(new URL('./workers/crypto.worker.ts', import.meta.url), {
      type: 'module'
    });
    return worker as unknown as WorkerLike;
  };
})();

/** Mutable so tests can substitute a mock factory. */
let activeWorkerFactory: WorkerFactory | null = defaultWorkerFactory;

/**
 * @internal
 * Test-only override for the worker factory. Production callers ignore it.
 */
export function __setWorkerFactoryForTests(factory: WorkerFactory | null): void {
  activeWorkerFactory = factory;
}

/**
 * Macrotask yield used by the main-thread fallback path. setTimeout(0)
 * is widely supported (unlike `scheduler.yield`) and reliably lets the
 * event loop repaint between hash batches.
 */
function setTimeoutYield(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/**
 * Build a Merkle tree, choosing worker or main-thread execution at
 * runtime. Resolves with the layered tree; rejects with
 * `DOMException('AbortError')` if `signal` aborts.
 */
export async function buildMerkleTreeAsync(
  items: BytesLike[],
  options: BuildOptions = {}
): Promise<MerkleTree> {
  const { onProgress, signal, useWorker = true } = options;

  if (signal?.aborted) {
    throw new DOMException('Merkle build aborted', 'AbortError');
  }

  // Dispatch decision. We trust the existence of an active factory
  // rather than re-sniffing `typeof Worker`: tests inject mock factories
  // even in Node where the global is undefined, and only a real browser
  // ever installs the default factory in the first place.
  const factory = activeWorkerFactory;
  if (useWorker && factory !== null) {
    return runOnWorker(items, onProgress, signal, factory);
  }

  // Fallback path: same algorithm, but with a setTimeout yielder so the
  // main thread stays responsive during the heavy hashing.
  return buildMerkleTree(items, {
    batchSize: 64,
    shouldYield: setTimeoutYield,
    signal,
    onProgress
  });
}

async function runOnWorker(
  items: BytesLike[],
  onProgress: BuildOptions['onProgress'],
  signal: AbortSignal | undefined,
  factory: WorkerFactory
): Promise<MerkleTree> {
  const jobId = nextJobId();
  return new Promise<MerkleTree>((resolve, reject) => {
    const worker = factory();
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      try {
        worker.removeEventListener('message', onMessage);
      } catch {
        /* worker may already be gone */
      }
      signal?.removeEventListener('abort', onAbort);
      worker.terminate();
      fn();
    };

    const onAbort = () => {
      finish(() => reject(new DOMException('Merkle build aborted', 'AbortError')));
    };

    const onMessage = (event: MessageEvent) => {
      const msg = event.data as
        | { type: 'progress'; jobId: number; processed: number; total: number }
        | { type: 'result'; jobId: number; tree: MerkleTree }
        | { type: 'error'; jobId: number; message: string }
        | undefined;
      if (!msg || msg.jobId !== jobId) return;
      if (msg.type === 'progress') {
        onProgress?.(msg.processed, msg.total);
      } else if (msg.type === 'result') {
        finish(() => resolve(msg.tree));
      } else if (msg.type === 'error') {
        finish(() => reject(new Error(msg.message)));
      }
    };

    worker.addEventListener('message', onMessage);

    if (signal) {
      if (signal.aborted) {
        finish(() => reject(new DOMException('Merkle build aborted', 'AbortError')));
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    worker.postMessage({ type: 'build', jobId, items });
  });
}

/** Monotonic job id so concurrent worker callbacks don't cross-talk. */
let lastJobId = 0;
function nextJobId(): number {
  lastJobId = (lastJobId + 1) >>> 0;
  return lastJobId;
}
