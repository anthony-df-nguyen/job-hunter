"use client";

import { useEffect, useState } from "react";
import type { ColumnPinningState, ColumnSizingState, VisibilityState } from "@tanstack/react-table";
import { STORAGE_KEY } from "./constants";

interface PersistedLayout {
  columnVisibility: VisibilityState;
  columnOrder: string[];
  columnPinning: ColumnPinningState;
  columnSizing: ColumnSizingState;
}

function mergeColumnOrder(stored: string[], defaults: string[]) {
  const kept = stored.filter((id) => defaults.includes(id));
  const missing = defaults.filter((id) => !kept.includes(id));
  return [...kept, ...missing];
}

function sanitizePinning(stored: ColumnPinningState | undefined, defaults: string[]): ColumnPinningState {
  const left = (stored?.left ?? []).filter((id) => defaults.includes(id));
  const right = (stored?.right ?? []).filter((id) => defaults.includes(id) && !left.includes(id));
  return { left, right };
}

const DEFAULT_PINNING: ColumnPinningState = { left: [], right: [] };

export function usePersistedTableState(defaultColumnOrder: string[]) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnOrder);
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(DEFAULT_PINNING);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<PersistedLayout>;
        if (stored.columnVisibility) setColumnVisibility(stored.columnVisibility);
        if (stored.columnOrder) setColumnOrder(mergeColumnOrder(stored.columnOrder, defaultColumnOrder));
        if (stored.columnPinning) setColumnPinning(sanitizePinning(stored.columnPinning, defaultColumnOrder));
        if (stored.columnSizing) setColumnSizing(stored.columnSizing);
      }
    } catch {
      // ignore malformed/unavailable localStorage
    }
    setHydrated(true);
    // Only run once on mount; defaultColumnOrder is derived from static column defs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const layout: PersistedLayout = { columnVisibility, columnOrder, columnPinning, columnSizing };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }, [columnVisibility, columnOrder, columnPinning, columnSizing, hydrated]);

  function reset() {
    setColumnVisibility({});
    setColumnOrder(defaultColumnOrder);
    setColumnPinning(DEFAULT_PINNING);
    setColumnSizing({});
  }

  return {
    columnVisibility,
    setColumnVisibility,
    columnOrder,
    setColumnOrder,
    columnPinning,
    setColumnPinning,
    columnSizing,
    setColumnSizing,
    reset,
  };
}
