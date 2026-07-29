import { createConnector } from 'wagmi';
import { type CreateConnectorFn } from 'wagmi';
import Eth from '@ledgerhq/hw-app-eth';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import type { Address, TransactionSerializable } from 'viem';
import { serializeTransaction } from 'viem';

/** Default derivation path for the first Ethereum account on Ledger. */
export const LEDGER_DEFAULT_PATH = "m/44'/60'/0'/0/0" as const;

/** Typed errors so the UI can show specific, actionable messages. */
export type LedgerErrorKind =
  | 'TRANSPORT_UNAVAILABLE'
  | 'DEVICE_NOT_FOUND'
  | 'USER_CANCELLED'
  | 'APP_NOT_OPEN'
  | 'USB_UNPLUGGED'
  | 'UNKNOWN';

export class LedgerConnectionError extends Error {
  readonly kind: LedgerErrorKind;
  constructor(kind: LedgerErrorKind, message: string) {
    super(message);
    this.name = 'LedgerConnectionError';
    this.kind = kind;
  }
}

/** Map a raw Ledger/Transport error to a typed, user-safe error. */
export function toLedgerError(err: unknown): LedgerConnectionError {
  const e = err as { name?: string; message?: string; statusCode?: number };
  const name = e?.name ?? '';
  const msg = e?.message ?? '';

  if (name === 'TransportOpenUserCancelled' || msg.includes('denied') || msg.includes('cancelled')) {
    return new LedgerConnectionError('USER_CANCELLED', 'Connection was cancelled. Please approve the USB prompt on your device.');
  }
  if (name === 'TransportError') {
    if (msg.includes('unplugged') || msg.includes('disconnected')) {
      return new LedgerConnectionError('USB_UNPLUGGED', 'Your Ledger was unplugged. Reconnect it over USB and try again.');
    }
    if (msg.includes('No device') || msg.includes('not found')) {
      return new LedgerConnectionError('DEVICE_NOT_FOUND', 'No Ledger device found. Connect it via USB and unlock it.');
    }
    if (msg.includes('Locked')) {
      return new LedgerConnectionError('DEVICE_NOT_FOUND', 'Your Ledger is locked. Unlock it and open the Ethereum app.');
    }
  }
  if (name === 'EthAppNotOpened' || name === 'EthAppPleaseEnableContractData' || msg.includes('activate the Ethereum')) {
    return new LedgerConnectionError('APP_NOT_OPEN', 'Please open the Ethereum app on your Ledger.');
  }
  if (msg.includes('0x6700') || msg.includes('INS_NOT_SUPPORTED')) {
    return new LedgerConnectionError('APP_NOT_OPEN', 'Please open the Ethereum app on your Ledger.');
  }
  if (msg.includes('WebUSB') || msg.toLowerCase().includes('transport')) {
    return new LedgerConnectionError('TRANSPORT_UNAVAILABLE', 'WebUSB is not available in this browser. Use a Chromium-based browser over HTTPS or localhost.');
  }
  return new LedgerConnectionError('UNKNOWN', msg || 'Failed to connect to Ledger.');
}

/** Minimal transport type — avoids pulling in @ledgerhq/hw-transport just for types. */
interface TransportLike {
  close(): Promise<void>;
}

interface LedgerProvider {
  transport: TransportLike;
  eth: Eth;
  path: string;
}

/** True when the browser supports WebUSB (secure context required). */
export function isWebUSBSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

export interface LedgerConnectorOptions {
  /** Derivation path for the account. Defaults to the first ETH account. */
  path?: string;
  /** Chain id to report to wagmi. */
  chainId?: number;
}

/**
 * Custom wagmi connector that connects to a Ledger device over WebUSB and
 * signs via the physical device buttons. Transactions/messages are approved
 * on the device itself — private keys never leave the hardware.
 */
export function ledgerConnector(options: LedgerConnectorOptions = {}): CreateConnectorFn {
  const path = options.path ?? LEDGER_DEFAULT_PATH;

  return createConnector((config: any) => {
    let provider: LedgerProvider | undefined;

    return {
      id: 'ledgerWebUsb',
      name: 'Ledger (USB)',
      type: 'ledgerWebUsb' as const,

      async setup() {},
      async teardown() {
        try {
          await provider?.transport.close();
        } catch {
          /* ignore close errors */
        }
        provider = undefined;
      },

      async getProvider() {
        if (!isWebUSBSupported()) {
          throw new LedgerConnectionError(
            'TRANSPORT_UNAVAILABLE',
            'WebUSB is not available in this browser. Use a Chromium-based browser over HTTPS or localhost.'
          );
        }
        return (provider as LedgerProvider | undefined) ?? undefined;
      },

      async connect() {
        try {
          const transport = await TransportWebUSB.create();
          const eth = new Eth(transport);
          provider = { transport, eth, path };
          const { address } = await eth.getAddress(path, false, false);
          const accounts = [address as Address];
          const chainId = options.chainId ?? config.chains[0]?.id ?? 1;
          return { accounts, chainId };
        } catch (err) {
          provider = undefined;
          throw toLedgerError(err);
        }
      },

      async getAccounts() {
        if (!provider) {
          const res = await this.connect();
          return res.accounts;
        }
        const { address } = await provider.eth.getAddress(path, false, false);
        return [address as Address];
      },

      async getChainId() {
        return options.chainId ?? config.chains[0]?.id ?? 1;
      },

      async signMessage({ message }: { message: string }) {
        if (!provider) await this.connect();
        const { eth } = provider!;
        const result = await eth.signPersonalMessage(path, Buffer.from(message).toString('hex'));
        const sig = `0x${result.r}${result.s}${result.v.toString(16).padStart(2, '0')}`;
        return sig as `0x${string}`;
      },

      async signTransaction(transaction: Record<string, unknown>) {
        if (!provider) await this.connect();
        const { eth } = provider!;
        const serialized = serializeTransaction(transaction as any);
        const result = await eth.signTransaction(path, serialized, null);
        const sig = `0x${result.r}${result.s}${result.v.padStart(2, '0')}`;
        return serializeTransaction(transaction as any, {
          r: `0x${result.r}`,
          s: `0x${result.s}`,
          v: BigInt(`0x${result.v}`),
        }) as `0x${string}`;
      },

      async switchChain({ chainId }: { chainId: number }) {
        return chainId;
      },
    } as any;
  });
}

