import { fallback, http, type Transport } from 'viem';

export const DEFAULT_RETRY_COUNT = 3;

export function parseRpcUrls(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}

export function createTransport(urls: string[], retryCount: number = DEFAULT_RETRY_COUNT): Transport {
  if (urls.length === 0) return http();
  if (urls.length === 1) return http(urls[0]);
  return fallback(
    urls.map((url) => http(url)),
    { rank: true, retryCount }
  );
}
