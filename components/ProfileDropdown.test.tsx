/**
 * ProfileDropdown.test.tsx
 *
 * Tests for components/ProfileDropdown.tsx. Verifies issue #9 acceptance:
 *  - a Disconnect action is available in the profile dropdown
 *  - clicking Disconnect triggers the dApp-level disconnect (useDisconnect)
 *
 * `wagmi` is mocked via a hoisted mutable so connection state can vary per test.
 *
 * Run: `npm run test`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ProfileDropdown } from './ProfileDropdown';

const ACCOUNT = '0x1111111111111111111111111111111111111111' as `0x${string}`;
const disconnectMock = vi.fn();

const hoisted = vi.hoisted(() => ({ connected: true, address: '0x1111111111111111111111111111111111111111' }));
vi.mock('wagmi', () => ({
  useAccount: () => ({ address: hoisted.address as `0x${string}`, isConnected: hoisted.connected }),
  useDisconnect: () => ({ disconnect: () => disconnectMock() }),
  useEnsName: () => ({ data: undefined }),
  useEnsAvatar: () => ({ data: undefined })
}));

describe('ProfileDropdown', () => {
  beforeEach(() => {
    hoisted.connected = true;
    hoisted.address = ACCOUNT as string;
    disconnectMock.mockClear();
  });
  afterEach(() => cleanup());

  it('shows the address and a Disconnect menu item', () => {
    render(<ProfileDropdown />);
    fireEvent.click(screen.getByRole('button', { name: /0x1111\.\.\.1111/i }));
    expect(screen.getByRole('menuitem', { name: /Disconnect/i })).toBeTruthy();
  });

  it('calls disconnect when Disconnect is clicked', () => {
    render(<ProfileDropdown />);
    fireEvent.click(screen.getByRole('button', { name: /0x1111\.\.\.1111/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Disconnect/i }));
    expect(disconnectMock).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when no account is connected', () => {
    hoisted.connected = false;
    hoisted.address = '';
    const { container } = render(<ProfileDropdown />);
    expect(container.firstChild).toBeNull();
  });
});
