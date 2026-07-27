export function MetaMaskIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path fill="#E17726" d="M27.7 3.6 17.9 10.9l1.8-4.3 8-3z" />
      <path fill="#E27625" d="m4.3 3.6 9.7 7.4-1.7-4.4-8-3zM23.9 21.9l-2.6 4 5.6 1.5 1.6-5.4-4.6-.1zM3.5 21.9l1.6 5.4 5.6-1.5-2.6-4-4.6.1z" />
      <path fill="#E27625" d="m10.4 14.1-1.5 2.3 5.6.2-.2-6-3.9 3.5zM21.6 14.1l-4-3.6-.1 6.1 5.6-.2-1.5-2.3zM10.7 25.9l3.4-1.6-2.9-2.3-.5 3.9zM17.9 24.3l3.4 1.6-.5-3.9-2.9 2.3z" />
    </svg>
  );
}

export function CoinbaseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#0052FF" />
      <path
        fill="#fff"
        d="M16 8a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-2.6 6.1c0-.4.3-.7.7-.7h3.8c.4 0 .7.3.7.7v3.8c0 .4-.3.7-.7.7h-3.8c-.4 0-.7-.3-.7-.7v-3.8Z"
      />
    </svg>
  );
}

export function WalletConnectIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#3B99FC" />
      <path
        fill="#fff"
        d="M10.3 12.5c3.1-3 8.2-3 11.3 0l.4.4a.4.4 0 0 1 0 .5l-1.3 1.3a.2.2 0 0 1-.3 0l-.5-.5c-2.2-2.1-5.7-2.1-7.8 0l-.6.6a.2.2 0 0 1-.3 0l-1.3-1.3a.4.4 0 0 1 0-.5l.4-.5Zm14 2.6 1.2 1.2a.4.4 0 0 1 0 .5l-5.3 5.2a.4.4 0 0 1-.6 0l-3.8-3.7a.1.1 0 0 0-.2 0l-3.8 3.7a.4.4 0 0 1-.6 0l-5.3-5.2a.4.4 0 0 1 0-.5l1.2-1.2a.4.4 0 0 1 .6 0l3.8 3.7a.1.1 0 0 0 .2 0l3.8-3.7a.4.4 0 0 1 .6 0l3.8 3.7a.1.1 0 0 0 .2 0l3.8-3.7a.4.4 0 0 1 .4-.1Z"
      />
    </svg>
  );
}

export function GenericWalletIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="14" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
