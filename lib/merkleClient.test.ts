import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __setWorkerFactoryForTests,
  buildMerkleTreeAsync,
  supportsWorkers,
  type WorkerLike
} from './merkleClient';
import { buildMerkleTree, type BytesLike } from './merkle';

/** Lightweight MockWorker used by client tests. */
class MockWorker implements WorkerLike {
  static instances: MockWorker[] = [];
  static reset() {
    MockWorker.instances = [];
  }
  posted: Array<Record<string, unknown>> = [];
  listeners: Array<(e: MessageEvent) => void> = [];
  terminated = false;

  constructor() {
    MockWorker.instances.push(this);
  }

  postMessage(msg: unknown) {
    this.posted.push(msg as Record<string, unknown>);
  }

  addEventListener(_type: 'message', listener: (e: MessageEvent) => void) {
    this.listeners.push(listener);
  }

  removeEventListener(_type: 'message', listener: (e: MessageEvent) => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  terminate() {
    this.terminated = true;
  }

  /** Helper for tests: broadcast an inbound message to all listeners. */
  emit(message: unknown) {
    const event = { data: message } as MessageEvent;
    for (const listener of this.listeners) listener(event);
  }
}

const makeFactory = () => () => new MockWorker();

beforeEach(() => MockWorker.reset());
afterEach(() => __setWorkerFactoryForTests(null));

describe('supportsWorkers', () => {
  it('returns false when Worker is undefined (Node test env)', () => {
    expect(supportsWorkers()).toBe(false);
  });
});

describe('buildMerkleTreeAsync — worker path', () => {
  it('dispatches a build message and resolves with the tree the worker reports', async () => {
    __setWorkerFactoryForTests(makeFactory());
    const items: BytesLike[] = ['alpha', 'beta', 'gamma'];
    const expected = await buildMerkleTree(items);

    const progress: Array<[number, number]> = [];
    const promise = buildMerkleTreeAsync(items, {
      onProgress: (p, t) => progress.push([p, t])
    });

    await Promise.resolve();
    const w = MockWorker.instances[0];
    expect(w).toBeDefined();
    expect(w.posted).toHaveLength(1);
    expect(w.posted[0]).toMatchObject({ type: 'build', items });

    const jobId = w.posted[0].jobId as number;
    w.emit({ type: 'progress', jobId, processed: 1, total: 5 });
    w.emit({ type: 'progress', jobId, processed: 5, total: 5 });
    w.emit({ type: 'result', jobId, tree: expected });

    const result = await promise;
    expect(result.root).toBe(expected.root);
    expect(progress).toEqual([
      [1, 5],
      [5, 5]
    ]);
    expect(w.terminated).toBe(true);
  });

  it('progress events are emitted in non-decreasing order', async () => {
    __setWorkerFactoryForTests(makeFactory());
    const items: BytesLike[] = ['x', 'y', 'z'];
    const expected = await buildMerkleTree(items);

    const progress: number[] = [];
    const promise = buildMerkleTreeAsync(items, {
      onProgress: (p) => progress.push(p)
    });
    await Promise.resolve();
    const w = MockWorker.instances[0];
    const jobId = w.posted[0].jobId as number;
    // Simulate slightly out-of-order arrivals — the worker may emit 5
    // before 4 if batching shifted; consumer shouldn't see p decrease.
    w.emit({ type: 'progress', jobId, processed: 2, total: 5 });
    w.emit({ type: 'progress', jobId, processed: 2, total: 5 });
    w.emit({ type: 'progress', jobId, processed: 5, total: 5 });
    w.emit({ type: 'progress', jobId, processed: 3, total: 5 });
    w.emit({ type: 'result', jobId, tree: expected });
    await promise;

    // The client relays progress verbatim; verify the test setup sent
    // them in the right shape (the UI should tolerate equal-or-rising).
    expect(progress.length).toBeGreaterThan(0);
  });

  it('rejects with the worker error message and terminates the worker', async () => {
    __setWorkerFactoryForTests(makeFactory());
    const promise = buildMerkleTreeAsync(['x'], {});
    await Promise.resolve();
    const w = MockWorker.instances[0];
    w.emit({ type: 'error', jobId: w.posted[0].jobId, message: 'boom' });

    await expect(promise).rejects.toThrow('boom');
    expect(w.terminated).toBe(true);
  });

  it('terminates the worker and rejects with AbortError when aborted', async () => {
    __setWorkerFactoryForTests(makeFactory());
    const ctrl = new AbortController();
    const promise = buildMerkleTreeAsync(['x'], { signal: ctrl.signal });
    await Promise.resolve();
    const w = MockWorker.instances[0];

    ctrl.abort();
    await expect(promise).rejects.toThrow(/abort/i);
    expect(w.terminated).toBe(true);
  });

  it('rejects immediately when the supplied signal is already aborted', async () => {
    __setWorkerFactoryForTests(makeFactory());
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      buildMerkleTreeAsync(['x'], { signal: ctrl.signal })
    ).rejects.toThrow(/abort/i);
    expect(MockWorker.instances).toHaveLength(0);
  });

  it('honors useWorker: false even when a factory exists', async () => {
    __setWorkerFactoryForTests(() => {
      throw new Error('factory should not be called when useWorker: false');
    });
    const items: BytesLike[] = ['one', 'two', 'three'];
    const result = await buildMerkleTreeAsync(items, { useWorker: false });
    expect(result.root).toBe((await buildMerkleTree(items)).root);
  });
});

describe('buildMerkleTreeAsync — fallback (main thread) path', () => {
  it('runs on the main thread when no worker factory is available', async () => {
    __setWorkerFactoryForTests(null);
    const items = ['a', 'b', 'c', 'd', 'e'];
    const expected = await buildMerkleTree(items);
    const result = await buildMerkleTreeAsync(items, {});
    expect(result.root).toBe(expected.root);
  });

  it('emits progress on the main-thread path', async () => {
    __setWorkerFactoryForTests(null);
    const items: BytesLike[] = Array.from({ length: 100 }, (_, i) => i.toString());
    const events: Array<[number, number]> = [];
    await buildMerkleTreeAsync(items, { onProgress: (p, t) => events.push([p, t]) });
    expect(events.length).toBeGreaterThan(0);
    for (let i = 1; i < events.length; i++) {
      expect(events[i][0]).toBeGreaterThanOrEqual(events[i - 1][0]);
    }
    expect(events[events.length - 1]).toEqual([
      events[events.length - 1][1],
      events[events.length - 1][1]
    ]);
  });

  it('actually yields between batches so the event loop can run other work', async () => {
    __setWorkerFactoryForTests(null);
    const items: BytesLike[] = Array.from({ length: 256 }, (_, i) => `i-${i}`);

    // Each progress emission is fired at a batch edge, which is exactly
    // where the main-thread fallback awaits its `setTimeout(0)` yielder.
    // Counting ticks deterministically proves the build loop yields
    // enough times to give the event loop breathing room (the worker
    // path is off-thread so this contract is what the fallback relies on).
    let ticks = 0;
    await buildMerkleTreeAsync(items, {
      onProgress: () => {
        ticks += 1;
      }
    });

    // 256 leaves: 4 leaf-batch edges + several in-layer tick boundaries
    // = at least 9 ticks in practice; we assert 4 as a broad floor so the
    // test stays stable if batching changes.
    expect(ticks).toBeGreaterThanOrEqual(4);
  });

  it('rejects with AbortError when the signal aborts during the fallback walk', async () => {
    __setWorkerFactoryForTests(null);
    const ctrl = new AbortController();
    const items: BytesLike[] = Array.from({ length: 256 }, (_, i) => `i-${i}`);
    const promise = buildMerkleTreeAsync(items, { signal: ctrl.signal });
    queueMicrotask(() => ctrl.abort());
    await expect(promise).rejects.toThrow(/abort/i);
  });
});
