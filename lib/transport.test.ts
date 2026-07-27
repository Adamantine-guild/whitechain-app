import { describe, expect, it } from 'vitest';
import { custom, fallback } from 'viem';
import { mainnet } from 'viem/chains';
import { createTransport, parseRpcUrls } from './transport';

describe('parseRpcUrls', () => {
  it('returns an empty list for undefined or empty input', () => {
    expect(parseRpcUrls(undefined)).toEqual([]);
    expect(parseRpcUrls(null)).toEqual([]);
    expect(parseRpcUrls('')).toEqual([]);
  });

  it('parses a single url', () => {
    expect(parseRpcUrls('https://a.example')).toEqual(['https://a.example']);
  });

  it('parses a comma separated list and trims whitespace', () => {
    expect(parseRpcUrls('https://a.example, https://b.example ,https://c.example')).toEqual([
      'https://a.example',
      'https://b.example',
      'https://c.example'
    ]);
  });

  it('drops empty segments from trailing or repeated commas', () => {
    expect(parseRpcUrls('https://a.example,,')).toEqual(['https://a.example']);
  });
});

describe('createTransport', () => {
  it('uses the default http transport when no urls are configured', () => {
    const instance = createTransport([])({ chain: mainnet });
    expect(instance.config.type).toBe('http');
  });

  it('uses a single http transport when one url is configured', () => {
    const instance = createTransport(['https://a.example'])({ chain: mainnet });
    expect(instance.config.type).toBe('http');
  });

  it('builds a ranked fallback transport across multiple urls', () => {
    const instance = createTransport(['https://a.example', 'https://b.example'])({ chain: mainnet });
    expect(instance.config.type).toBe('fallback');
    expect(instance.value?.transports).toHaveLength(2);
  });
});

describe('fallback behaviour', () => {
  it('routes around a blackholed primary rpc to a healthy one', async () => {
    const calls: string[] = [];
    const dead = custom({
      request: async () => {
        calls.push('dead');
        throw new Error('primary rpc blackholed');
      }
    });
    const healthy = custom({
      request: async ({ method }) => {
        calls.push('healthy');
        if (method === 'eth_chainId') return '0x1';
        return '0xok';
      }
    });

    const transport = fallback([dead, healthy], { retryCount: 0 })({ chain: mainnet });
    const result = await transport.request({ method: 'eth_blockNumber' });

    expect(result).toBe('0xok');
    expect(calls).toEqual(['dead', 'healthy']);
  });
});
