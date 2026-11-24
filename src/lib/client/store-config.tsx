'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { StoreConfig } from './types';

const Ctx = createContext<StoreConfig | null>(null);

export function StoreConfigProvider({ config, children }: { config: StoreConfig; children: ReactNode }) {
  return <Ctx.Provider value={config}>{children}</Ctx.Provider>;
}
export function useStoreConfig(): StoreConfig {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStoreConfig must be used inside <StoreConfigProvider>');
  return c;
}
