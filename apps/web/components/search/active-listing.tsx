'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface ActiveListing {
  activeId: string | null;
  setActive: (id: string | null) => void;
}

const ActiveListingContext = createContext<ActiveListing>({ activeId: null, setActive: () => undefined });

export function ActiveListingProvider({ children }: { children: ReactNode }) {
  const [activeId, setActive] = useState<string | null>(null);
  const value = useMemo(() => ({ activeId, setActive }), [activeId]);
  return <ActiveListingContext.Provider value={value}>{children}</ActiveListingContext.Provider>;
}

export const useActiveListing = (): ActiveListing => useContext(ActiveListingContext);
