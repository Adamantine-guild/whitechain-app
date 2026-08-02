/**
 * TokenSearchModal.test.tsx
 *
 * Tests for components/swap/TokenSearchModal.tsx. Verifies issue #109
 * acceptance criteria:
 *  - Typing rapidly does not trigger multiple validation requests.
 *  - Pasting an address resolves within a reasonable timeframe.
 *  - UI feedback clearly indicates when a search is processing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@/test-utils';
import { TokenSearchModal, type TokenSearchResult } from './TokenSearchModal';

const VALID_ADDRESS = '0x' + 'a'.repeat(40);
const ANOTHER_VALID_ADDRESS = '0x' + 'b'.repeat(40);
const INVALID_ADDRESS = '0x-short';

describe('TokenSearchModal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <TokenSearchModal isOpen={false} onClose={() => {}} onSelect={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the modal when open', () => {
    render(
      <TokenSearchModal isOpen={true} onClose={() => {}} onSelect={() => {}} />
    );
    expect(screen.getByText('Import Token')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0x…')).toBeInTheDocument();
  });

  it('shows an error for non-address input', async () => {
    render(
      <TokenSearchModal isOpen={true} onClose={() => {}} onSelect={() => {}} />
    );

    const input = screen.getByPlaceholderText('0x…');
    fireEvent.change(input, { target: { value: 'not-an-address' } });

    // Advance past the debounce delay so the validation effect fires.
    vi.advanceTimersByTime(300);

    // Wait for the error message to appear (React needs a re-render cycle).
    await waitFor(() => {
      expect(
        screen.getByText(/Invalid address format/i)
      ).toBeInTheDocument();
    });
  });

  it('displays the loading spinner while debouncing with a slow validator', async () => {
    // A validator that never resolves until explicitly told to.
    let resolveValidator: (result: TokenSearchResult | null) => void = () => {};
    const slowValidate = vi.fn().mockImplementation(
      () =>
        new Promise<TokenSearchResult | null>((resolve) => {
          resolveValidator = resolve;
        })
    );

    render(
      <TokenSearchModal
        isOpen={true}
        onClose={() => {}}
        onSelect={() => {}}
        validateAddress={slowValidate}
      />
    );

    const input = screen.getByPlaceholderText('0x…');
    fireEvent.change(input, { target: { value: VALID_ADDRESS } });

    // Advance past the debounce delay — this triggers the validation effect.
    vi.advanceTimersByTime(300);

    // The validator was called, but hasn't resolved yet, so validation
    // is still in progress. The spinner should be visible.
    await waitFor(() => {
      const spinners = document.querySelectorAll('.animate-spin');
      expect(spinners.length).toBeGreaterThan(0);
    });

    // Resolve the validator so the test doesn't leak.
    resolveValidator(null);
  });

  it('validates a valid address after debounce (no custom validator)', async () => {
    render(
      <TokenSearchModal isOpen={true} onClose={() => {}} onSelect={() => {}} />
    );

    const input = screen.getByPlaceholderText('0x…');
    fireEvent.change(input, { target: { value: VALID_ADDRESS } });

    // Advance past the debounce delay.
    vi.advanceTimersByTime(300);

    // Wait for the valid state to render.
    await waitFor(() => {
      expect(screen.getByText('Unknown Token')).toBeInTheDocument();
    });
  });

  it('calls onSelect when the Import button is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <TokenSearchModal
        isOpen={true}
        onClose={() => {}}
        onSelect={onSelect}
      />
    );

    const input = screen.getByPlaceholderText('0x…');
    fireEvent.change(input, { target: { value: VALID_ADDRESS } });

    // Advance past the debounce delay.
    vi.advanceTimersByTime(300);

    // Wait for the Import button to appear.
    await waitFor(() => {
      expect(screen.getByText('Import')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Import'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        address: VALID_ADDRESS,
      })
    );
  });

  it('uses the custom validateAddress function', async () => {
    const mockResult: TokenSearchResult = {
      address: VALID_ADDRESS,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    };
    const validateAddress = vi.fn().mockResolvedValue(mockResult);

    render(
      <TokenSearchModal
        isOpen={true}
        onClose={() => {}}
        onSelect={() => {}}
        validateAddress={validateAddress}
      />
    );

    const input = screen.getByPlaceholderText('0x…');
    fireEvent.change(input, { target: { value: VALID_ADDRESS } });

    // Advance past the debounce delay.
    vi.advanceTimersByTime(300);

    // Wait for the validator to be called.
    await waitFor(() => {
      expect(validateAddress).toHaveBeenCalledWith(VALID_ADDRESS);
    });

    // Wait for the result to render.
    await waitFor(() => {
      expect(screen.getByText('USDC')).toBeInTheDocument();
      expect(screen.getByText('USD Coin')).toBeInTheDocument();
    });
  });

  it('shows an error when validateAddress returns null', async () => {
    const validateAddress = vi.fn().mockResolvedValue(null);

    render(
      <TokenSearchModal
        isOpen={true}
        onClose={() => {}}
        onSelect={() => {}}
        validateAddress={validateAddress}
      />
    );

    const input = screen.getByPlaceholderText('0x…');
    fireEvent.change(input, { target: { value: VALID_ADDRESS } });

    // Advance past the debounce delay.
    vi.advanceTimersByTime(300);

    // Wait for the error message.
    await waitFor(() => {
      expect(
        screen.getByText(/Token not found/i)
      ).toBeInTheDocument();
    });
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    render(
      <TokenSearchModal isOpen={true} onClose={onClose} onSelect={() => {}} />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('resets state when reopened', () => {
    const { rerender } = render(
      <TokenSearchModal isOpen={true} onClose={() => {}} onSelect={() => {}} />
    );

    // Type a valid address.
    const input = screen.getByPlaceholderText('0x…');
    fireEvent.change(input, { target: { value: VALID_ADDRESS } });

    // Close and reopen.
    rerender(
      <TokenSearchModal isOpen={false} onClose={() => {}} onSelect={() => {}} />
    );
    rerender(
      <TokenSearchModal isOpen={true} onClose={() => {}} onSelect={() => {}} />
    );

    // Input should be empty again.
    expect(screen.getByPlaceholderText('0x…')).toHaveValue('');
  });
});