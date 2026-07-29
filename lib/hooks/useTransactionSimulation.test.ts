/**
 * useTransactionSimulation.test.ts
 *
 * Unit tests for lib/hooks/useTransactionSimulation.ts. Covers:
 *  - success path: eth_call succeeds → status 'success'
 *  - revert path: eth_call throws → status 'reverts' + "This transaction will fail"
 *  - error path: missing `to` → status 'error'
 *  - revert reason decoding
 *
 * The viem client is replaced with a stub so no network calls are made and the
 * 1.5s UX budget is irrelevant in tests.
 *
 * Run: `npm run test`
 */

import { describe, it, expect, vi } from 'vitest';
import type { PublicClient } from 'viem';
import {
  simulateTransaction,
  type SimulationRequest
} from './useTransactionSimulation';

function makeClient(impl: () => Promise<unknown>): PublicClient {
  return {
    request: vi.fn(impl)
  } as unknown as PublicClient;
}

const baseRequest: SimulationRequest = {
  chainId: 1,
  from: '0x0000000000000000000000000000000000000001' as `0x${string}`,
  to: '0x0000000000000000000000000000000000000002' as `0x${string}`,
  value: 1000n
};

describe('simulateTransaction', () => {
  it('returns success when eth_call does not revert', async () => {
    const client = makeClient(async () => '0x');
    const res = await simulateTransaction(baseRequest, client);
    expect(res.status).toBe('success');
    expect(res.message).toMatch(/should not revert/i);
  });

  it('returns reverts with "This transaction will fail" when eth_call throws', async () => {
    const client = makeClient(async () => {
      throw new Error('execution reverted');
    });
    const res = await simulateTransaction(baseRequest, client);
    expect(res.status).toBe('reverts');
    expect(res.message).toBe('This transaction will fail.');
  });

  it('captures a decoded revert reason when available', async () => {
    const client = makeClient(async () => {
      const err = Object.assign(new Error('reverted'), {
        shortMessage: 'ERC20: transfer amount exceeds balance'
      });
      throw err;
    });
    const res = await simulateTransaction(baseRequest, client);
    expect(res.status).toBe('reverts');
    expect(res.revertReason).toBe('ERC20: transfer amount exceeds balance');
  });

  it('returns error when no destination address is provided', async () => {
    const client = makeClient(async () => '0x');
    const res = await simulateTransaction(
      { to: '' as `0x${string}` },
      client
    );
    expect(res.status).toBe('error');
  });

  it('passes the correct eth_call params (to, value as hex, latest block)', async () => {
    const requestFn = vi.fn(async () => '0x');
    const client = makeClient(requestFn);
    await simulateTransaction(baseRequest, client);
    expect(requestFn).toHaveBeenCalledTimes(1);
    const callArg = (requestFn.mock.calls[0] as unknown as [{ method: string; params: unknown[] }])[0];
    expect(callArg.method).toBe('eth_call');
    const params = callArg.params as [{ to: string; value?: string }, string];
    expect(params[0].to).toBe(baseRequest.to);
    expect(params[0].value).toBe('0x3e8'); // 1000n in hex
    expect(params[1]).toBe('latest');
  });
});
