/// <reference lib="webworker" />

/**
 * crypto.worker — Dedicated Web Worker for Merkle-tree hashing.
 *
 * Spun up by `lib/merkleClient.ts` via the standard
 *   new Worker(new URL('./workers/crypto.worker.ts', import.meta.url))
 * pattern, which Next.js 14's webpack 5 splits into its own chunk that
 * is only fetched when the worker is actually instantiated.
 *
 * Lives outside the main thread so 10,000 keccak hashes don't lock the
 * UI. Communicates with the main thread over a typed message protocol:
 *
 *   main → worker : { type: 'build', jobId, items, batchSize? }
 *   worker → main : { type: 'progress', jobId, processed, total }
 *                 | { type: 'result',   jobId, tree }
 *                 | { type: 'error',    jobId, message }
 *
 * Note: `items` here are un-hashed `BytesLike` payloads; the worker
 * hashes them itself so the hashing cost is off-thread. Pre-hashing in
 * the main thread would be wasted work.
 */

import { buildMerkleTree, type BytesLike, type MerkleTree } from '../merkle';

declare const self: DedicatedWorkerGlobalScope;

export interface WorkerBuildRequest {
  type: 'build';
  jobId: number;
  items: BytesLike[];
  batchSize?: number;
}

export type WorkerOutMessage =
  | { type: 'progress'; jobId: number; processed: number; total: number }
  | { type: 'result'; jobId: number; tree: MerkleTree }
  | { type: 'error'; jobId: number; message: string };

self.addEventListener('message', async (event: MessageEvent<WorkerBuildRequest>) => {
  const msg = event.data;
  if (!msg || msg.type !== 'build') return;

  try {
    // No shouldYield here — we're already off the main thread, so the
    // microtask yield inside buildMerkleTree is essentially free, and
    // skipping it keeps the worker optimal. Progress still streams.
    const tree = await buildMerkleTree(msg.items, {
      batchSize: msg.batchSize ?? 64,
      onProgress: (processed, total) => {
        const out: WorkerOutMessage = {
          type: 'progress',
          jobId: msg.jobId,
          processed,
          total
        };
        self.postMessage(out);
      }
    });

    const result: WorkerOutMessage = { type: 'result', jobId: msg.jobId, tree };
    self.postMessage(result);
  } catch (err) {
    const out: WorkerOutMessage = {
      type: 'error',
      jobId: msg.jobId,
      message: err instanceof Error ? err.message : String(err)
    };
    self.postMessage(out);
  }
});

export {}; // ensure module scope
