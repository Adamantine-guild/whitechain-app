/**
 * Avatar.test.tsx
 *
 * Tests for components/Avatar.tsx. Verifies issue #14 acceptance criteria:
 *  - a resolved ENS avatar renders as an <img>
 *  - a missing/null avatar (or ENS name) falls back to the blocky circle
 *  - an image load error also falls back to the blocky circle
 *
 * Run: `npm run test`
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Avatar } from './Avatar';

const ADDRESS = '0x1111111111111111111111111111111111111111' as `0x${string}`;

const hoisted = vi.hoisted(() => ({
  ensName: undefined as string | undefined,
  avatarUrl: undefined as string | undefined
}));

vi.mock('wagmi', () => ({
  useEnsName: () => ({ data: hoisted.ensName }),
  useEnsAvatar: () => ({ data: hoisted.avatarUrl })
}));

vi.mock('wagmi/chains', () => ({ mainnet: { id: 1 } }));

describe('Avatar', () => {
  afterEach(() => {
    cleanup();
    hoisted.ensName = undefined;
    hoisted.avatarUrl = undefined;
  });

  it('falls back to a blocky circle when there is no ENS avatar', () => {
    render(<Avatar address={ADDRESS} />);
    const fallback = screen.getByRole('img', { name: `Avatar for ${ADDRESS}` });
    expect(fallback.tagName).toBe('SPAN');
  });

  it('renders the resolved ENS avatar as an image', () => {
    hoisted.ensName = 'vitalik.eth';
    hoisted.avatarUrl = 'https://example.com/avatar.png';
    render(<Avatar address={ADDRESS} />);
    const img = screen.getByRole('img', { name: 'vitalik.eth avatar' }) as HTMLImageElement;
    expect(img.tagName).toBe('IMG');
    expect(img.src).toBe('https://example.com/avatar.png');
  });

  it('falls back to the blocky circle if the image fails to load', () => {
    hoisted.ensName = 'vitalik.eth';
    hoisted.avatarUrl = 'https://example.com/broken.png';
    render(<Avatar address={ADDRESS} />);
    const img = screen.getByRole('img', { name: 'vitalik.eth avatar' });
    fireEvent.error(img);
    expect(screen.getByRole('img', { name: `Avatar for ${ADDRESS}` })).toBeTruthy();
  });

  it('renders a neutral fallback when there is no address at all', () => {
    render(<Avatar />);
    expect(screen.getByRole('img', { name: 'No avatar' })).toBeTruthy();
  });
});
