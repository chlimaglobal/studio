
'use client';

// Re-export all hooks and providers from the single source of truth.
// This ensures that any component importing from this file
// receives the same context instance provided by AppProviders in the root layout.
export * from '@/components/providers/app-providers';
