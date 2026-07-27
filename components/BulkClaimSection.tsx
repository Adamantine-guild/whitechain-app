'use client';

import { useEffect, useRef, useState } from 'react';
import { buildMerkleTreeAsync, supportsWorkers } from '@/lib/merkleClient';
import type { BytesLike, Hex } from '@/lib/merkle';

const LEAF_COUNT = 10_000;

interface Result {
  root: Hex;
  ms: number;
}

/**
 * Build a deterministic 8-byte Uint8Array per leaf so the demo is
 * reproducible across renders and across component mounts. Two 32-bit
 * words: the leaf index plus a splitmix-style salt seeded from it.
 * Hoisted to module scope so HMR + route remounts don't re-allocate
 * 10,000 buffers each visit.
 */
const CLAIM_LEAVES: BytesLike[] = (() => {
  const out: BytesLike[] = new Array(LEAF_COUNT);
  for (let i = 0; i < LEAF_COUNT; i++) {
    const buf = new Uint8Array(8);
    const view = new DataView(buf.buffer);
    let x = (i + 1) >>> 0;
    x = (x ^ (x >>> 16)) * 0x85ebca6b >>> 0;
    x = (x ^ (x >>> 13)) * 0xc2b2ae35 >>> 0;
    view.setUint32(0, i);
    view.setUint32(4, x >>> 0);
    out[i] = buf;
  }
  return out;
})();

export function BulkClaimSection() {
  const leaves = CLAIM_LEAVES;
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workerAvailable, setWorkerAvailable] = useState<boolean | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // supportsWorkers() depends on globals that only exist in the browser;
  // defer detection until mount to avoid SSR-mismatch hydration warnings.
  useEffect(() => {
    setWorkerAvailable(supportsWorkers());
  }, []);

  async function handleGenerate() {
    setRunning(true);
    setProgress(0);
    setError(null);
    setResult(null);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const tree = await buildMerkleTreeAsync(leaves, {
        onProgress: (p, t) =>
          setProgress(t === 0 ? 0 : Math.min(100, Math.round((p / t) * 100))),
        signal: ctrl.signal
      });
      const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
      setResult({ root: tree.root, ms: t1 - t0 });
      setProgress(100);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Cancelled');
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
      setProgress(0);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  return (
    <section id="bulk-claim" className="card lg:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Bulk claim preview</h2>
          <p className="mt-1 text-xs text-gray-500">
            Generate a Merkle root for {LEAF_COUNT.toLocaleString()} claim leaves.
            {workerAvailable === null
              ? ''
              : workerAvailable
                ? ' Hashing runs in a Web Worker; this UI stays responsive.'
                : ' Workers unsupported — hashing falls back to the main thread and yields between batches.'}
          </p>
        </div>
        <span
          className={
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ' +
            (workerAvailable
              ? 'bg-blue-100 text-blue-700'
              : workerAvailable === false
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-500')
          }
        >
          {workerAvailable === null ? 'Detecting…' : workerAvailable ? 'Worker' : 'Main thread'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={running}
          className="btn"
          aria-busy={running}
        >
          {running
            ? 'Generating…'
            : `Generate Merkle root (${LEAF_COUNT.toLocaleString()} leaves)`}
        </button>
        {running && (
          <button type="button" onClick={handleCancel} className="btn-outline">
            Cancel
          </button>
        )}
      </div>

      {/* Progress (visual only — the bar has its own role="progressbar"
          so SRs get accessibility from that, without aria-live noise). */}
      {(running || progress > 0) && (
        <div className="mt-4">
          <div
            className="h-2 w-full overflow-hidden rounded bg-gray-200"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label="Merkle build progress"
          >
            <div
              className="h-full bg-blue-600 transition-all duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p aria-hidden="true" className="mt-1 text-xs text-gray-500">{progress}%</p>
        </div>
      )}

      {/* Outcome region: a short sr-only summary is announced when the
          build finishes; the 64-char hex root is shown but labelled
          aria-hidden so screen readers don't read the whole thing. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {result && `Merkle root computed in ${result.ms.toFixed(0)} milliseconds for ${leaves.length.toLocaleString()} leaves`}
      </div>

      {result && (
        <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-3 text-sm" aria-hidden="true">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-700">Merkle root</span>
            <span className="text-xs text-gray-500">
              {result.ms.toFixed(0)} ms · {leaves.length.toLocaleString()} leaves
            </span>
          </div>
          <div
            className="mt-1 break-all font-mono text-xs text-gray-900"
            title={result.root}
          >
            {result.root}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>
      )}
    </section>
  );
}
