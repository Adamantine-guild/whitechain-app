/**
 * TransactionSimulator.test.tsx
 *
 * Tests for components/TransactionSimulator.tsx. Verifies the acceptance
 * criterion from issue #21: when a simulation reverts, the UI displays
 * "This transaction will fail".
 *
 * The viem `createPublicClient` is mocked so `simulateTransaction` never makes
 * a real network call — the client's `request` is a controllable stub.
 *
 * Run: `npm run test`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { TransactionSimulator } from './TransactionSimulator';

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn()
}));

vi.mock('viem', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({ request: requestMock }))
  };
});

const VALID_ADDRESS = '0x0000000000000000000000000000000000000002';

describe('TransactionSimulator', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows "This transaction will fail" when the simulation reverts', async () => {
    requestMock.mockRejectedValue(new Error('execution reverted'));

    render(React.createElement(TransactionSimulator));
    const input = screen.getByLabelText('Destination address') as HTMLInputElement;
    fireEvent.change(input, { target: { value: VALID_ADDRESS } });
    fireEvent.click(screen.getByText('Simulate transaction'));

    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status.textContent).toContain('This transaction will fail.');
    });
  });

  it('shows a success message when the simulation succeeds', async () => {
    requestMock.mockResolvedValue('0x');

    render(React.createElement(TransactionSimulator));
    const input = screen.getByLabelText('Destination address') as HTMLInputElement;
    fireEvent.change(input, { target: { value: VALID_ADDRESS } });
    fireEvent.click(screen.getByText('Simulate transaction'));

    await waitFor(() => {
      expect(screen.getByText('Transaction looks safe.')).toBeTruthy();
    });
  });

  it('disables the simulate button until a valid address is entered', () => {
    render(React.createElement(TransactionSimulator));
    const button = screen.getByText('Simulate transaction') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
