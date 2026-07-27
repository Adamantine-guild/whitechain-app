/**
 * SendModal.test.tsx
 *
 * Tests for components/SendModal.tsx. Verifies issue #12 acceptance criteria:
 *  - the Send button is disabled until the form is valid
 *  - inline red errors explain invalid address / amount / gas
 *
 * `wagmi` is mocked (fixed balance). The wallet provider is stubbed per test.
 *
 * Run: `npm run test`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { SendModal } from './SendModal';

const ACCOUNT = '0x1111111111111111111111111111111111111111' as `0x${string}`;

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: ACCOUNT, isConnected: true }),
  useBalance: () => ({
    data: { value: 1000n, formatted: '0.000000000000001', symbol: 'ETH' },
    isLoading: false
  })
}));

describe('SendModal', () => {
  beforeEach(() => {
    // jsdom has no injected wallet by default; ensure ethereum is undefined.
    if ((globalThis as { window?: { ethereum?: unknown } }).window) {
      (globalThis as { window: { ethereum?: unknown } }).window.ethereum = undefined;
    }
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('disables Send until the form is valid', () => {
    render(<SendModal isOpen onClose={() => {}} />);
    const send = screen.getByText('Send') as HTMLButtonElement;
    expect(send.disabled).toBe(true);
  });

  it('shows an inline error for a malformed address', async () => {
    render(<SendModal isOpen onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Recipient address'), { target: { value: 'bad' } });
    fireEvent.change(screen.getByLabelText('Amount in wei'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Gas limit'), { target: { value: '21000' } });
    await waitFor(() => {
      expect(screen.getByText(/valid 0x address/i)).toBeTruthy();
    });
  });

  it('shows an inline error when amount exceeds balance', async () => {
    render(<SendModal isOpen onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Recipient address'), {
      target: { value: '0x' + 'a'.repeat(40) }
    });
    fireEvent.change(screen.getByLabelText('Amount in wei'), { target: { value: '1001' } });
    fireEvent.change(screen.getByLabelText('Gas limit'), { target: { value: '21000' } });
    await waitFor(() => {
      expect(screen.getByText(/exceeds your balance/i)).toBeTruthy();
    });
  });

  it('enables Send for a valid payload', async () => {
    render(<SendModal isOpen onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Recipient address'), {
      target: { value: '0x' + 'a'.repeat(40) }
    });
    fireEvent.change(screen.getByLabelText('Amount in wei'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Gas limit'), { target: { value: '21000' } });
    await waitFor(() => {
      expect((screen.getByText('Send') as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
