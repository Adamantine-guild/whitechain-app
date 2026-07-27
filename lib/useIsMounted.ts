import { useEffect, useState } from 'react';

// Returns false during SSR and on the client's very first render, then
// flips to true once React has hydrated. Gate any wallet/browser-only
// UI behind this so the first client paint always matches the server.
export function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}