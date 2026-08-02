# Issue #113: Server State Caching with @tanstack/react-query

## Overview

Refactored global protocol statistics data fetching to use `@tanstack/react-query` for centralized server state management. This eliminates redundant network requests across page navigations and eliminates UI flickering.

## Changes Made

### New Files

- **`lib/hooks/queries/useProtocolStats.ts`** — Shared React Query hook that fetches protocol stats (TVL, APY, active users, vault count) via `useQuery`. Configured with:
  - `staleTime: 60_000` (60s) — data stays fresh for 60 seconds before background refetch
  - `gcTime: 300_000` (5min) — cached data persists in memory for 5 minutes
  - `retry: 2` — retries failed queries twice before surfacing error
  - `refetchOnWindowFocus: false` — avoids unnecessary refetches on tab switch
  - Shared query key `['protocolStats']` consumed by all components

- **`components/dashboard/ProtocolStatsBar.tsx`** — New UI component displaying aggregate protocol statistics (TVL, avg APY, active users, vault count) with loading skeleton states.

### Modified Files

- **`components/vaults/VaultTable.tsx`**
  - Replaced hardcoded vault data (TVL, APY) with data from `useProtocolStats` hook
  - Vault metadata (name, asset, APY, TVL) now served via the shared cached query
  - User stake state remains local (per-user data persisted in localStorage)
  - Graceful fallback to hardcoded defaults when API is unavailable

- **`app/dashboard/page.tsx`**
  - Added `<ProtocolStatsBar />` section that consumes the same `['protocolStats']` query key as `VaultTable`

## How It Works

Both `ProtocolStatsBar` and `VaultTable` call `useProtocolStats()` with the same `['protocolStats']` query key. React Query deduplicates the fetch: when both components render on the same page, only one network request fires. When navigating between pages, the cached data serves instantly (staleTime = 60s), preventing refetches.

## Error Handling

- Failed queries retry twice (`retry: 2`) before surfacing an error
- `ProtocolStatsBar` gracefully displays "—" placeholders on error
- `VaultTable` falls back to hardcoded mock vault data when protocol stats fail
- Both components are wrapped in `<ErrorBoundary>` for runtime safety

## Acceptance Criteria

- [x] Navigating between Dashboard and Vault sections does not trigger duplicate network requests for global stats
- [x] UI flickering on route changes is eliminated (instant cache reads)
- [x] Background refetching updates the UI smoothly without unmounting components
- [x] Robust error handling for failed queries

closes #113
