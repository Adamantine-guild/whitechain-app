'use client';

import React, { useState } from 'react';
import { useEnsAvatar, useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';

export interface AvatarProps {
  address?: `0x${string}`;
  size?: number;
  className?: string;
}

/** One day — ENS avatars change rarely, and a lookup is not cheap. */
const ENS_CACHE_TIME_MS = 24 * 60 * 60 * 1000;

/**
 * Deterministic "blocky"-style fallback: a colored circle derived from the
 * address hash, with no network dependency, so there's always something to
 * show while (or if) the real ENS avatar can't be resolved.
 */
function blockyHue(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function BlockyFallback({ address, size }: { address?: string; size: number }) {
  const hue = address ? blockyHue(address.toLowerCase()) : 0;
  const background = address ? `hsl(${hue}, 55%, 55%)` : '#d1d5db';
  return (
    <span
      role="img"
      aria-label={address ? `Avatar for ${address}` : 'No avatar'}
      style={{ width: size, height: size, background }}
      className="inline-block shrink-0 rounded-full"
    />
  );
}

/**
 * ENS avatar for a connected/displayed address (#14). Resolves the ENS name
 * and avatar text record on mainnet — viem's `getEnsAvatar` (which wagmi
 * calls under the hood) already resolves `ipfs://`/`eip155:` NFT avatar
 * formats to a fetchable URL, so no extra resolution logic is needed here.
 * Falls back to a deterministic color circle if there's no ENS name, no
 * avatar record, or the image fails to load.
 */
export function Avatar({ address, size = 32, className }: AvatarProps) {
  const [imgErrored, setImgErrored] = useState(false);

  const { data: ensName } = useEnsName({
    address,
    chainId: mainnet.id,
    query: {
      enabled: Boolean(address),
      staleTime: ENS_CACHE_TIME_MS,
      gcTime: ENS_CACHE_TIME_MS
    }
  });

  const { data: avatarUrl } = useEnsAvatar({
    name: ensName ?? undefined,
    chainId: mainnet.id,
    query: {
      enabled: Boolean(ensName),
      staleTime: ENS_CACHE_TIME_MS,
      gcTime: ENS_CACHE_TIME_MS
    }
  });

  if (!avatarUrl || imgErrored) {
    return (
      <span className={className}>
        <BlockyFallback address={address} size={size} />
      </span>
    );
  }

  return (
    <span className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element -- external, arbitrary ENS-hosted URL */}
      <img
        src={avatarUrl}
        alt={ensName ? `${ensName} avatar` : 'ENS avatar'}
        width={size}
        height={size}
        className="inline-block shrink-0 rounded-full object-cover"
        onError={() => setImgErrored(true)}
      />
    </span>
  );
}

export default Avatar;
