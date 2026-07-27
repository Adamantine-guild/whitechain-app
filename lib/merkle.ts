import { type Hex, keccak256, concat } from 'viem';

export type { Hex };

/** UTF-8 string, raw bytes, or a 0x-prefixed hex string — anything we can
 *  turn into a 32-byte leaf hash. */
export type BytesLike = string | Uint8Array;

const EMPTY_ROOT: Hex = `0x${'00'.repeat(32)}`;

export interface MerkleTree {
  /** 32-byte hex root. For empty inputs this is the 32-zero-byte string. */
  root: Hex;
  /** Layered nodes; layers[0] = leaves, layers[last] = [root]. */
  layers: Hex[][];
}

export interface MerkleProof {
  leaf: Hex;
  siblings: Hex[];
  index: number;
  root: Hex;
}

export interface BuildOptions {
  /** Called repeatedly as the tree is built. `processed` is monotonic. */
  onProgress?: (processed: number, total: number) => void;
  /** Operations per progress emission + yield (when `shouldYield` is set). */
  batchSize?: number;
  /**
   * If provided, the build will `await` the result between batches so
   * the event loop can interleave paint with computation. The worker
   * path leaves it undefined so the hashing burns through without
   * bound; the main-thread fallback passes a `setTimeout(0)` yielder.
   *
   * Returning a primitive (`undefined`) does NOT yield to the macrotask
   * queue — the function continues synchronously. Returning a Promise
   * gives the event loop a chance to repaint before resuming.
   *
   * Defaults to `() => Promise.resolve()`: cheap microtask yield that
   * still funnels messages back through the postMessage bridge in
   * workers without locking up the main thread.
   */
  shouldYield?: () => void | Promise<void>;
  /** Aborts the build with `DOMException('AbortError')` between batches. */
  signal?: AbortSignal;
}

/**
 * Hash an arbitrary payload (UTF-8 string, hex string, or byte array) to a
 * 32-byte leaf hash using keccak256. Explicit `to: 'hex'` keeps the return
 * type pinned to `Hex` across viem's input/shape overloads — without it,
 * viem mirrors the input type and would return `ByteArray` for byte input.
 */
export function hashData(data: BytesLike): Hex {
  if (typeof data === 'string') {
    if (data.startsWith('0x')) {
      return keccak256(data as Hex, 'hex');
    }
    return keccak256(new TextEncoder().encode(data), 'hex');
  }
  return keccak256(data, 'hex');
}

const noopYield: () => Promise<void> = () => Promise.resolve();

/**
 * Build a Merkle tree from arbitrary leaf data. Hashes each input to a
 * 32-byte leaf and then layers pairs up to a single root using the
 * canonical duplicate-last-odd convention (the same primitive Bitcoin and
 * the OpenZeppelin MerkleTree use).
 *
 * Returns a `Promise` so the main thread can yield between batches and
 * keep the UI responsive; the Web Worker simply `await`s the same
 * promise off-thread.
 *
 * Empty input yields the all-zero 32-byte root; a single leaf yields
 * itself as the root.
 */
export async function buildMerkleTree(
  items: BytesLike[],
  options: BuildOptions = {}
): Promise<MerkleTree> {
  const total = items.length;
  const batchSize = Math.max(1, options.batchSize ?? 64);
  const yieldFn: () => void | Promise<void> = options.shouldYield ?? noopYield;

  if (total === 0) {
    options.onProgress?.(0, 0);
    return { root: EMPTY_ROOT, layers: [[]] };
  }

  // Total work units = leaves hashed + pair hashes per layer. Naïve
  // `2n-1` is only correct for power-of-two leaf counts; for arbitrary
  // n each layer produces ceil(L/2) pairs. Walk the layer sizes down,
  // shifting `size` to `ceil(size/2)` BEFORE the add so the summed
  // value is the pair count for the current layer.
  let totalOps = total; // leaf hashes
  let size = total;
  while (size > 1) {
    size = Math.ceil(size / 2);
    totalOps += size;
  }
  let processed = 0;
  const tick = () => options.onProgress?.(processed, totalOps);

  // 1) Hash leaves, in batches.
  const leaves: Hex[] = new Array(total);
  for (let start = 0; start < total; start += batchSize) {
    if (options.signal?.aborted) {
      throw new DOMException('Merkle build aborted', 'AbortError');
    }
    const end = Math.min(start + batchSize, total);
    for (let i = start; i < end; i++) {
      leaves[i] = hashData(items[i]);
      processed += 1;
    }
    tick();
    await yieldFn();
  }

  if (total === 1) {
    // Single leaf — already at processed=1/1.
    if (processed !== totalOps) tick();
    return { root: leaves[0], layers: [leaves.slice()] };
  }

  // 2) Layer up, in batches. Duplicate-last-odd convention.
  const layers: Hex[][] = [leaves];
  let current = leaves;
  while (current.length > 1) {
    if (options.signal?.aborted) {
      throw new DOMException('Merkle build aborted', 'AbortError');
    }
    const nextSize = Math.ceil(current.length / 2);
    const next: Hex[] = new Array(nextSize);
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = i + 1 < current.length ? current[i + 1] : left;
      next[i >> 1] = keccak256(concat([left, right]), 'hex');
      processed += 1;
      if (processed % batchSize === 0 || processed === totalOps) {
        tick();
        await yieldFn();
      }
    }
    layers.push(next);
    current = next;
  }

  // Final progress event in case the last batch didn't align.
  if (processed !== totalOps) tick();

  return { root: current[0], layers };
}

/**
 * Walk the layers to collect the sibling path from a leaf up to the root.
 * Throws if the index is out of range. For odd-count layers the rightmost
 * leaf pairs with itself (duplicate-last convention), so its sibling
 * collapses to its own hash.
 */
export function getProof(tree: MerkleTree, index: number): MerkleProof {
  const leaves = tree.layers[0];
  if (index < 0 || index >= leaves.length) {
    throw new Error(`merkle: index ${index} out of range (${leaves.length})`);
  }
  const siblings: Hex[] = [];
  let idx = index;
  for (let layerIdx = 0; layerIdx < tree.layers.length - 1; layerIdx++) {
    const layer = tree.layers[layerIdx];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    // Odd-count layer: the rightmost pair collapsed using the duplicate-
    // last convention, so the rightmost leaf's sibling is itself.
    siblings.push(layer[siblingIdx] ?? layer[idx]);
    idx = Math.floor(idx / 2);
  }
  return { leaf: leaves[index], siblings, index, root: tree.root };
}

/**
 * Re-derive the root from a (leaf, siblings, index) proof. Returns true
 * iff the recomputed root matches `expectedRoot`. Lower-case compared so
 * mixed-case hex from different callers doesn't break the check.
 */
export function verifyProof(
  proof: { leaf: Hex; siblings: Hex[]; index: number },
  expectedRoot: Hex
): boolean {
  let current = proof.leaf;
  let idx = proof.index;
  for (const sibling of proof.siblings) {
    const ordered =
      idx % 2 === 1 ? concat([sibling, current]) : concat([current, sibling]);
    current = keccak256(ordered, 'hex');
    idx = Math.floor(idx / 2);
  }
  return current.toLowerCase() === expectedRoot.toLowerCase();
}
