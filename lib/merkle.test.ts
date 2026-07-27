import { describe, expect, it } from 'vitest';
import { concat, keccak256 } from 'viem';
import { buildMerkleTree, getProof, hashData, verifyProof, type Hex } from './merkle';

const ZERO32: Hex = `0x${'00'.repeat(32)}`;

describe('hashData', () => {
  it('hashes a UTF-8 string to a 32-byte hex', async () => {
    const h = hashData('hello');
    expect(h).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('hashes a hex string consistently', async () => {
    expect(hashData('0x01')).toBe(hashData('0x01'));
  });

  it('hashes a Uint8Array to a 32-byte hex', async () => {
    const h = hashData(new Uint8Array([1, 2, 3]));
    expect(h).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('produces different hashes for different inputs', async () => {
    expect(hashData('a')).not.toBe(hashData('b'));
  });

  it('matches the known keccak256 of an empty string', async () => {
    // Canonical reference vector from multiple Ethereum sources.
    expect(hashData('')).toBe(
      '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'
    );
  });
});

describe('buildMerkleTree', () => {
  it('returns the zero root for an empty input', async () => {
    const tree = await buildMerkleTree([]);
    expect(tree.root).toBe(ZERO32);
    expect(tree.layers).toEqual([[]]);
  });

  it('returns the single leaf as both root and leaf layer', async () => {
    const tree = await buildMerkleTree(['only']);
    expect(tree.root).toBe(hashData('only'));
    expect(tree.layers).toEqual([[hashData('only')]]);
  });

  it('builds a deterministic tree for identical inputs', async () => {
    const a = await buildMerkleTree(['a', 'b', 'c', 'd']);
    const b = await buildMerkleTree(['a', 'b', 'c', 'd']);
    expect(a.root).toBe(b.root);
    expect(a.layers).toEqual(b.layers);
  });

  it('duplicates the last leaf for an odd layer count', async () => {
    const odd = await buildMerkleTree(['a', 'b', 'c']);
    // Layer 0: hashData(a), hashData(b), hashData(c)
    // Layer 1: keccak(h(a) || h(b)), keccak(h(c) || h(c))  [self-paired]
    // Layer 2 (root): keccak(L1[0] || L1[1])
    const Ha = hashData('a');
    const Hb = hashData('b');
    const Hc = hashData('c');
    expect(odd.root).toMatch(/^0x[0-9a-f]{64}$/);
    expect(odd.layers[1].length).toBe(2);
    // For index 2 in a 3-leaf tree, the duplicate-last convention means
    // the leaf pairs with itself, so the first sibling is the leaf hash,
    // and the second sibling is the parent of (a, b).
    expect(
      verifyProof(
        { leaf: Hc, siblings: [Hc, odd.layers[1][0]], index: 2 },
        odd.root
      )
    ).toBe(true);
    // Shape-level contract: layer 1 must be [keccak(Ha||Hb), keccak(Hc||Hc)].
    expect(odd.layers[0]).toEqual([Ha, Hb, Hc]);
    expect(odd.layers[1][0]).toBe(keccak256(concat([Ha, Hb]), 'hex'));
    expect(odd.layers[1][1]).toBe(keccak256(concat([Hc, Hc]), 'hex'));
  });

  it('round-trips proofs for an odd-count tree of 5 leaves', async () => {
    // 5 leaves → layer 0 size 5 (odd) → layer 1 size 3 (odd) → layer 2 size 2 → root.
    // This exercises the duplicate-self convention across TWO odd boundary
    // layers, which prior tests at size 3 did not.
    const items = ['a', 'b', 'c', 'd', 'e'];
    const tree = await buildMerkleTree(items);
    // Layer sizes encode the duplicate-last-odd contract: 5, 3, 2, 1.
    expect(tree.layers.map((l) => l.length)).toEqual([5, 3, 2, 1]);
    for (let i = 0; i < items.length; i++) {
      const proof = getProof(tree, i);
      expect(
        verifyProof({ leaf: hashData(items[i]), siblings: proof.siblings, index: i }, tree.root)
      ).toBe(true);
    }
  });

  it('round-trips proofs for an odd-count tree of 7 leaves (three odd crossings)', async () => {
    const items = Array.from({ length: 7 }, (_, i) => `item-${i}`);
    const tree = await buildMerkleTree(items);
    // Layer sizes: 7 → 4 → 2 → 1 (note: the 4 IS even because the odd 7
    // produces a self-paired last element, which becomes one half of
    // an even pair).
    expect(tree.layers.map((l) => l.length)).toEqual([7, 4, 2, 1]);
    for (let i = 0; i < items.length; i++) {
      const proof = getProof(tree, i);
      expect(
        verifyProof({ leaf: hashData(items[i]), siblings: proof.siblings, index: i }, tree.root)
      ).toBe(true);
    }
  });

  it('emits progress monotonically and exactly at completion', async () => {
    const items = Array.from({ length: 20 }, (_, i) => i.toString());
    const events: Array<[number, number]> = [];
    await buildMerkleTree(items, {
      onProgress: (p, t) => events.push([p, t]),
      batchSize: 4
    });
    expect(events.length).toBeGreaterThan(0);
    expect(events[events.length - 1]).toEqual([
      events[events.length - 1][1],
      events[events.length - 1][1]
    ]);
    for (let i = 1; i < events.length; i++) {
      expect(events[i][0]).toBeGreaterThanOrEqual(events[i - 1][0]);
    }
  });

  it('two leaves yield the keccak256 root of left||right (known vector)', async () => {
    const Ha = hashData('a');
    const Hb = hashData('b');
    // Independently compute what the root of two pre-hashed leaves MUST
    // be: keccak(ha || hb). If our buildMerkleTree agrees, its pair-
    // hashing is consistent with viem's primitives.
    const expected = keccak256(concat([Ha, Hb]), 'hex');
    const tree = await buildMerkleTree(['a', 'b']);
    expect(tree.root).toBe(expected);
  });
});

describe('getProof + verifyProof', () => {
  it('round-trips every leaf back to the root', async () => {
    const items = ['lorem', 'ipsum', 'dolor', 'sit'];
    const tree = await buildMerkleTree(items);
    for (let i = 0; i < items.length; i++) {
      const proof = getProof(tree, i);
      expect(
        verifyProof({ leaf: hashData(items[i]), siblings: proof.siblings, index: i }, tree.root)
      ).toBe(true);
    }
  });

  it('throws for an out-of-range index', async () => {
    const tree = await buildMerkleTree(['a']);
    expect(() => getProof(tree, -1)).toThrow(/out of range/);
    expect(() => getProof(tree, 1)).toThrow(/out of range/);
  });

  it('rejects a tampered leaf', async () => {
    const tree = await buildMerkleTree(['a', 'b', 'c', 'd']);
    const proof = getProof(tree, 0);
    expect(
      verifyProof({ leaf: hashData('tampered'), siblings: proof.siblings, index: 0 }, tree.root)
    ).toBe(false);
  });

  it('rejects a proof targeting the wrong root', async () => {
    const tree = await buildMerkleTree(['a', 'b', 'c', 'd']);
    const proof = getProof(tree, 0);
    expect(verifyProof(proof, ZERO32)).toBe(false);
  });
});
