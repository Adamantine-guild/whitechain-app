'use client';

import Image, { type ImageProps } from 'next/image';
import React, { type ReactNode, useState } from 'react';

/**
 * A small neutral preview used while remote images are being fetched. Keeping
 * it inline avoids adding another request before the real image can load.
 */
const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=';

const OPTIMIZED_REMOTE_HOSTS = new Set([
  'assets.coingecko.com',
  'coin-images.coingecko.com',
  'images.coingecko.com',
  'metadata.ens.domains',
  'euc.li',
  'avatars.githubusercontent.com',
  'raw.githubusercontent.com',
  'cdn.jsdelivr.net'
]);

function shouldBypassOptimizer(src: string): boolean {
  try {
    const url = new URL(src);
    return url.protocol !== 'https:' || !OPTIMIZED_REMOTE_HOSTS.has(url.hostname);
  } catch {
    // Relative application assets are safe for Next's optimizer.
    return false;
  }
}

export interface ImageWithFallbackProps
  extends Omit<
    ImageProps,
    | 'blurDataURL'
    | 'fill'
    | 'height'
    | 'onError'
    | 'placeholder'
    | 'src'
    | 'unoptimized'
    | 'width'
  > {
  src: string;
  alt: string;
  width: number;
  height: number;
  fallback: ReactNode;
}

/**
 * Optimized, lazy-loaded image with stable dimensions and an in-place fallback.
 *
 * Tracking the failed URL (instead of a boolean) means a newly supplied URL is
 * attempted automatically without an effect or an intermediate fallback frame.
 */
export function ImageWithFallback({
  src,
  alt,
  width,
  height,
  fallback,
  ...imageProps
}: ImageWithFallbackProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) {
    return <>{fallback}</>;
  }

  return (
    <Image
      {...imageProps}
      src={src}
      alt={alt}
      width={width}
      height={height}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      unoptimized={shouldBypassOptimizer(src)}
      onError={() => setFailedSrc(src)}
    />
  );
}

export default ImageWithFallback;
